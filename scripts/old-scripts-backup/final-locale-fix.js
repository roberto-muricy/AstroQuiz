#!/usr/bin/env node

/**
 * Final locale fix - only works with questions that actually exist
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

class FinalLocaleFixer {
  constructor() {
    this.stats = {
      total: 0,
      processed: 0,
      fixed: 0,
      errors: 0,
      byLocale: { en: 0, pt: 0, es: 0, fr: 0 }
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Detect language from question content with very specific patterns
   */
  detectLanguage(questionData) {
    const content = (questionData.question || '').toLowerCase();
    
    // Very specific Portuguese patterns
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
    
    // Very specific Spanish patterns
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
    
    // Very specific French patterns
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
   * Get all existing questions (no 404s)
   */
  async getAllExistingQuestions() {
    try {
      this.log('📥 Fetching all existing questions...');
      
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
      this.log(`📊 Total existing questions: ${this.stats.total}`);
      
      return allQuestions;
      
    } catch (error) {
      this.log(`❌ Failed to fetch questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fix locale for a single question (with error handling)
   */
  async fixQuestionLocale(question) {
    try {
      const detectedLocale = this.detectLanguage(question);
      this.stats.processed++;
      
      // If locale is already correct, just count it
      if (question.locale === detectedLocale) {
        this.stats.byLocale[detectedLocale]++;
        return { success: true, skipped: true, locale: detectedLocale };
      }
      
      // Try to update the question
      await axios.put(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.id}`, {
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
        id: question.id
      };
      
    } catch (error) {
      this.stats.errors++;
      this.stats.byLocale[question.locale]++; // Count as original locale
      return { success: false, error: error.message, id: question.id };
    }
  }

  /**
   * Fix all existing questions
   */
  async fixAllExistingQuestions() {
    try {
      this.log('🔧 Starting final locale fix...');
      
      // Get only existing questions
      const allQuestions = await this.getAllExistingQuestions();
      
      if (allQuestions.length === 0) {
        this.log('❌ No questions found!');
        return;
      }

      // Show sample detection
      this.log('\\n🔍 Sample language detection (first 5):');
      allQuestions.slice(0, 5).forEach((q, i) => {
        const detected = this.detectLanguage(q);
        const current = q.locale;
        const match = detected === current ? '✅' : '❌';
        const questionText = q.question ? q.question.substring(0, 40) + '...' : 'N/A';
        this.log(`   ${i+1}. ID ${q.id}: "${questionText}" | ${current}→${detected} ${match}`);
      });

      this.log('\\n🔄 Starting locale fixes...');

      // Process in small batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        
        const promises = batch.map(async (question) => {
          return await this.fixQuestionLocale(question);
        });
        
        const results = await Promise.all(promises);
        
        // Log some successful fixes
        const fixes = results.filter(r => r.success && !r.skipped);
        if (fixes.length > 0 && i % 50 === 0) {
          fixes.slice(0, 1).forEach(fix => {
            this.log(`   ✅ ID ${fix.id}: ${fix.oldLocale}→${fix.newLocale}`);
          });
        }
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 200 === 0 || processed === allQuestions.length) {
          this.log(`🔄 Processed ${this.stats.processed}/${this.stats.total} | Fixed: ${this.stats.fixed} | Errors: ${this.stats.errors}`);
        }
      }

      // Show final results
      this.log('\\n✅ Final locale fix completed!');
      this.log('\\n============================================================');
      this.log('📊 FINAL LOCALE FIX SUMMARY');
      this.log('============================================================');
      this.log(`📊 Total questions: ${this.stats.total}`);
      this.log(`🔄 Processed: ${this.stats.processed}`);
      this.log(`🔧 Locales fixed: ${this.stats.fixed}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      this.log('\\n📈 Final distribution by language:');
      Object.entries(this.stats.byLocale).forEach(([locale, count]) => {
        this.log(`   ${locale.toUpperCase()}: ${count} questions`);
      });
      
      const totalByLocale = Object.values(this.stats.byLocale).reduce((sum, count) => sum + count, 0);
      this.log(`\\n📊 Total by locale: ${totalByLocale}`);
      
      // Success assessment
      if (this.stats.fixed > 0) {
        this.log('\\n🎉 SUCCESS! Some locales were fixed successfully!');
        this.log('\\n💡 Next step: Check the Strapi admin panel to see if questions now appear in correct language tabs');
      } else if (this.stats.errors === 0) {
        this.log('\\n✅ All questions already had correct locales!');
      } else {
        this.log('\\n⚠️ No fixes applied due to errors. Check the API connectivity.');
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 Final locale fix failed: ${error.message}`);
      throw error;
    }
  }
}

// Run final locale fix
async function main() {
  const fixer = new FinalLocaleFixer();
  await fixer.fixAllExistingQuestions();
}

main().catch(console.error);
