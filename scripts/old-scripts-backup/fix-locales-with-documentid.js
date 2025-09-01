#!/usr/bin/env node

/**
 * Fix locales using documentId (Strapi v5 approach)
 */

const axios = require('axios');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

class DocumentIdLocaleFixer {
  constructor() {
    this.stats = {
      total: 0,
      processed: 0,
      fixed: 0,
      errors: 0,
      skipped: 0,
      byLocale: { en: 0, pt: 0, es: 0, fr: 0 }
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Detect language from question content
   */
  detectLanguage(questionData) {
    const content = (questionData.question || '').toLowerCase();
    
    // Portuguese patterns
    if (content.includes('de acordo com') ||
        content.includes('aproximadamente') ||
        content.includes('quantas estrelas') ||
        content.includes('como se formam') ||
        content.includes('quanto tempo') ||
        content.includes('há quanto tempo') ||
        content.includes('quantos átomos') ||
        content.includes('quantas terras') ||
        content.includes('quantas luas') ||
        content.includes('qual é a idade') ||
        content.includes('em qual cratera') ||
        content.includes('o que são') ||
        content.includes('de que são feitos') ||
        content.includes('buracos negros') ||
        content.includes('via láctea') ||
        content.includes('universo observável')) {
      return 'pt';
    }
    
    // Spanish patterns
    if (content.includes('de acuerdo con') ||
        content.includes('cuántas estrellas') ||
        content.includes('cómo se forman') ||
        content.includes('cuánto tiempo') ||
        content.includes('hace cuánto tiempo') ||
        content.includes('cuántos átomos') ||
        content.includes('cuántas tierras') ||
        content.includes('cuántas lunas') ||
        content.includes('cuál es la edad') ||
        content.includes('en qué cráter') ||
        content.includes('qué son') ||
        content.includes('de qué están hechos') ||
        content.includes('agujeros negros') ||
        content.includes('vía láctea') ||
        content.includes('universo observable')) {
      return 'es';
    }
    
    // French patterns
    if (content.includes('selon') ||
        content.includes('combien d\'étoiles') ||
        content.includes('comment se forment') ||
        content.includes('combien de temps') ||
        content.includes('depuis combien de temps') ||
        content.includes('combien d\'atomes') ||
        content.includes('combien de terres') ||
        content.includes('combien de lunes') ||
        content.includes('quel est l\'âge') ||
        content.includes('dans quel cratère') ||
        content.includes('qu\'est-ce que') ||
        content.includes('de quoi sont faits') ||
        content.includes('trous noirs') ||
        content.includes('voie lactée') ||
        content.includes('univers observable')) {
      return 'fr';
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Fix locale for a single question using documentId
   */
  async fixQuestionLocale(question) {
    try {
      const detectedLocale = this.detectLanguage(question);
      this.stats.processed++;
      
      // If locale is already correct, skip
      if (question.locale === detectedLocale) {
        this.stats.skipped++;
        this.stats.byLocale[detectedLocale]++;
        return { success: true, skipped: true, locale: detectedLocale };
      }
      
      // Update using documentId (Strapi v5)
      await axios.put(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.documentId}`, {
        data: {
          locale: detectedLocale
        }
      });
      
      this.stats.fixed++;
      this.stats.byLocale[detectedLocale]++;
      
      return { 
        success: true, 
        skipped: false, 
        oldLocale: question.locale, 
        newLocale: detectedLocale,
        id: question.id,
        documentId: question.documentId
      };
      
    } catch (error) {
      this.stats.errors++;
      this.stats.byLocale[question.locale]++;
      return { success: false, error: error.message, id: question.id, documentId: question.documentId };
    }
  }

  /**
   * Get all questions and fix their locales
   */
  async fixAllQuestions() {
    try {
      this.log('🔧 Starting locale fix with documentId approach...');
      
      // Get all questions
      let allQuestions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
          params: {
            'pagination[page]': page,
            'pagination[pageSize]': 100
          }
        });
        
        const questions = response.data.data;
        allQuestions.push(...questions);
        
        hasMore = questions.length === 100;
        page++;
        
        if (page % 10 === 0) {
          this.log(`📥 Fetched ${allQuestions.length} questions...`);
        }
      }

      this.stats.total = allQuestions.length;
      this.log(`📊 Total questions to process: ${this.stats.total}`);

      // Show sample detection
      this.log('\\n🔍 Sample language detection:');
      allQuestions.slice(0, 10).forEach((q, i) => {
        const detected = this.detectLanguage(q);
        const current = q.locale;
        const match = detected === current ? '✅' : '❌';
        const questionText = q.question ? q.question.substring(0, 40) + '...' : 'N/A';
        this.log(`   ${i+1}. ID ${q.id}: "${questionText}" | ${current}→${detected} ${match}`);
      });

      this.log('\\n🔄 Starting locale fixes with documentId...');

      // Process in small batches
      const batchSize = 5;
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        
        const promises = batch.map(async (question) => {
          return await this.fixQuestionLocale(question);
        });
        
        const results = await Promise.all(promises);
        
        // Log some successful fixes
        const fixes = results.filter(r => r.success && !r.skipped);
        if (fixes.length > 0 && i % 100 === 0) {
          fixes.slice(0, 2).forEach(fix => {
            this.log(`   ✅ ID ${fix.id}: ${fix.oldLocale}→${fix.newLocale}`);
          });
        }
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 500 === 0 || processed === allQuestions.length) {
          this.log(`🔄 Processed ${this.stats.processed}/${this.stats.total} | Fixed: ${this.stats.fixed} | Skipped: ${this.stats.skipped} | Errors: ${this.stats.errors}`);
        }
      }

      // Show final results
      this.log('\\n✅ DocumentId locale fix completed!');
      this.log('\\n============================================================');
      this.log('📊 DOCUMENTID LOCALE FIX SUMMARY');
      this.log('============================================================');
      this.log(`📊 Total questions: ${this.stats.total}`);
      this.log(`🔄 Processed: ${this.stats.processed}`);
      this.log(`🔧 Locales fixed: ${this.stats.fixed}`);
      this.log(`⏭️ Already correct (skipped): ${this.stats.skipped}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      this.log('\\n📈 Final distribution by language:');
      Object.entries(this.stats.byLocale).forEach(([locale, count]) => {
        this.log(`   ${locale.toUpperCase()}: ${count} questions`);
      });
      
      const totalByLocale = Object.values(this.stats.byLocale).reduce((sum, count) => sum + count, 0);
      this.log(`\\n📊 Total by locale: ${totalByLocale}`);
      
      // Success assessment
      if (this.stats.fixed > 0) {
        this.log('\\n🎉 SUCCESS! Locales were fixed successfully!');
        this.log('\\n💡 Next step: Check the Strapi admin panel - questions should now appear in correct language tabs!');
        
        const expectedPerLang = Math.floor(this.stats.total / 4);
        if (Math.abs(this.stats.byLocale.en - expectedPerLang) <= 50 && 
            Math.abs(this.stats.byLocale.pt - expectedPerLang) <= 50 &&
            Math.abs(this.stats.byLocale.es - expectedPerLang) <= 50 && 
            Math.abs(this.stats.byLocale.fr - expectedPerLang) <= 50) {
          this.log(`\\n🎯 PERFECT! Distribution is very close to expected (~${expectedPerLang} per language)!`);
        }
      } else if (this.stats.errors === 0 && this.stats.skipped > 0) {
        this.log('\\n✅ All questions already had correct locales!');
      } else {
        this.log(`\\n⚠️ ${this.stats.errors} errors occurred during the process.`);
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 DocumentId locale fix failed: ${error.message}`);
      throw error;
    }
  }
}

// Run the fix
async function main() {
  const fixer = new DocumentIdLocaleFixer();
  await fixer.fixAllQuestions();
}

main().catch(console.error);
