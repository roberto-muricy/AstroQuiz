#!/usr/bin/env node

/**
 * Simple locale fix based on actual question content
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

class SimpleLocaleFixer {
  constructor() {
    this.stats = {
      total: 0,
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
   * Detect language from question content with better patterns
   */
  detectLanguage(questionData) {
    const content = (questionData.question || '').toLowerCase();
    
    // Portuguese patterns - more specific
    if (content.includes('aproximadamente') || 
        content.includes('quantas estrelas') ||
        content.includes('de acordo com') ||
        content.includes('o que poderia') ||
        content.includes('como se formam') ||
        content.includes('quanto tempo') ||
        content.includes('qual é a') ||
        content.includes('há quanto tempo') ||
        content.includes('quantos átomos') ||
        content.includes('quantas terras') ||
        content.includes('quantos galáxias') ||
        content.includes('quantas luas') ||
        content.includes('quantas constelações') ||
        content.includes('em qual cratera') ||
        content.includes('o que são') ||
        content.includes('de que são feitos') ||
        content.includes('universo observável') ||
        content.includes('via láctea') ||
        content.includes('sistema solar') ||
        content.includes('buracos negros')) {
      return 'pt';
    }
    
    // Spanish patterns - more specific
    if (content.includes('aproximadamente') ||
        content.includes('cuántas estrellas') ||
        content.includes('de acuerdo con') ||
        content.includes('qué podría') ||
        content.includes('cómo se forman') ||
        content.includes('cuánto tiempo') ||
        content.includes('cuál es la') ||
        content.includes('hace cuánto tiempo') ||
        content.includes('cuántos átomos') ||
        content.includes('cuántas tierras') ||
        content.includes('cuántas galaxias') ||
        content.includes('cuántas lunas') ||
        content.includes('cuántas constelaciones') ||
        content.includes('en qué cráter') ||
        content.includes('qué son') ||
        content.includes('de qué están hechos') ||
        content.includes('universo observable') ||
        content.includes('vía láctea') ||
        content.includes('sistema solar') ||
        content.includes('agujeros negros')) {
      return 'es';
    }
    
    // French patterns - more specific
    if (content.includes('approximativement') ||
        content.includes('combien d\'étoiles') ||
        content.includes('selon') ||
        content.includes('qu\'est-ce qui pourrait') ||
        content.includes('comment se forment') ||
        content.includes('combien de temps') ||
        content.includes('quelle est la') ||
        content.includes('depuis combien de temps') ||
        content.includes('combien d\'atomes') ||
        content.includes('combien de terres') ||
        content.includes('combien de galaxies') ||
        content.includes('combien de lunes') ||
        content.includes('combien de constellations') ||
        content.includes('dans quel cratère') ||
        content.includes('qu\'est-ce que') ||
        content.includes('de quoi sont faits') ||
        content.includes('univers observable') ||
        content.includes('voie lactée') ||
        content.includes('système solaire') ||
        content.includes('trous noirs')) {
      return 'fr';
    }
    
    // English patterns - more specific
    if (content.includes('approximately') ||
        content.includes('how many stars') ||
        content.includes('according to') ||
        content.includes('what could') ||
        content.includes('how are') ||
        content.includes('how long') ||
        content.includes('what is the') ||
        content.includes('how long has') ||
        content.includes('how many atoms') ||
        content.includes('how many earths') ||
        content.includes('how many galaxies') ||
        content.includes('how many moons') ||
        content.includes('how many constellations') ||
        content.includes('which crater') ||
        content.includes('what are') ||
        content.includes('what are made') ||
        content.includes('observable universe') ||
        content.includes('milky way') ||
        content.includes('solar system') ||
        content.includes('black holes')) {
      return 'en';
    }
    
    // Default to English if no pattern matches
    return 'en';
  }

  /**
   * Fix a single question's locale
   */
  async fixQuestionLocale(question) {
    try {
      const detectedLocale = this.detectLanguage(question);
      
      // If locale is already correct, skip
      if (question.locale === detectedLocale) {
        this.stats.byLocale[detectedLocale]++;
        return { success: true, skipped: true, locale: detectedLocale };
      }
      
      // Update the question with correct locale
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
        id: question.id,
        question: question.question ? question.question.substring(0, 50) + '...' : 'N/A'
      };
      
    } catch (error) {
      this.stats.errors++;
      return { success: false, error: error.message, id: question.id };
    }
  }

  /**
   * Fix all questions with simple locale detection
   */
  async fixAllLocales() {
    try {
      this.log('🔧 Starting simple locale fix based on content...');
      
      // Get all questions in batches
      let page = 1;
      let hasMore = true;
      let allQuestions = [];
      
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

      this.log('\\n🔄 Starting locale fixes...');

      // Process questions in smaller batches
      const batchSize = 10;
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
            this.log(`   ✅ ID ${fix.id}: ${fix.oldLocale}→${fix.newLocale} "${fix.question}"`);
          });
        }
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 500 === 0 || processed === allQuestions.length) {
          this.log(`🔄 Processed ${processed}/${this.stats.total} questions (Fixed: ${this.stats.fixed})`);
        }
      }

      // Show results
      this.log('\\n✅ Simple locale fix completed!');
      this.log('\\n============================================================');
      this.log('📊 SIMPLE LOCALE FIX SUMMARY');
      this.log('============================================================');
      this.log(`📊 Total questions: ${this.stats.total}`);
      this.log(`🔧 Locales fixed: ${this.stats.fixed}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      this.log('\\n📈 Final distribution by language:');
      Object.entries(this.stats.byLocale).forEach(([locale, count]) => {
        this.log(`   ${locale.toUpperCase()}: ${count} questions`);
      });
      
      const totalByLocale = Object.values(this.stats.byLocale).reduce((sum, count) => sum + count, 0);
      this.log(`\\n📊 Total by locale: ${totalByLocale}`);
      
      // Check if distribution is reasonable
      if (Math.abs(this.stats.byLocale.en - 900) <= 100 && 
          Math.abs(this.stats.byLocale.pt - 900) <= 100 &&
          Math.abs(this.stats.byLocale.es - 900) <= 100 && 
          Math.abs(this.stats.byLocale.fr - 900) <= 100) {
        this.log('\\n🎉 GREAT! Distribution looks reasonable (~900 per language)');
      } else {
        this.log('\\n⚠️ Distribution may need fine-tuning');
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 Simple locale fix failed: ${error.message}`);
      throw error;
    }
  }
}

// Run simple locale fix
async function main() {
  const fixer = new SimpleLocaleFixer();
  await fixer.fixAllLocales();
}

main().catch(console.error);
