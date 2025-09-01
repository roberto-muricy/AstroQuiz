#!/usr/bin/env node

/**
 * Fix locale assignments based on question content
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

class LocaleFixer {
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
   * Detect language from question content
   */
  detectLanguage(questionData) {
    const content = (questionData.question + ' ' + (questionData.optionA || '') + ' ' + (questionData.optionB || '')).toLowerCase();
    
    // Portuguese patterns
    if (/\\b(qual|como|onde|quando|por que|quantos?|o que|de acordo com)\\b/i.test(content) ||
        /\\b(universo|galáxia|estrela|planeta|sistema solar)\\b/i.test(content) ||
        /\\b(aproximadamente|bilhões|milhões)\\b/i.test(content)) {
      return 'pt';
    }
    
    // Spanish patterns  
    if (/\\b(cuál|cómo|dónde|cuándo|por qué|cuántos?|qué|de acuerdo con)\\b/i.test(content) ||
        /\\b(universo|galaxia|estrella|planeta|sistema solar)\\b/i.test(content) ||
        /\\b(aproximadamente|billones|millones)\\b/i.test(content)) {
      return 'es';
    }
    
    // French patterns
    if (/\\b(quel|quelle|comment|où|quand|pourquoi|combien|qu'est-ce que|selon)\\b/i.test(content) ||
        /\\b(univers|galaxie|étoile|planète|système solaire)\\b/i.test(content) ||
        /\\b(approximativement|milliards|millions)\\b/i.test(content)) {
      return 'fr';
    }
    
    // Default to English
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
        return { success: true, skipped: true, locale: detectedLocale };
      }
      
      // Update the question with correct locale
      await axios.put(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.id}`, {
        data: {
          locale: detectedLocale
        }
      });
      
      return { success: true, skipped: false, oldLocale: question.locale, newLocale: detectedLocale };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix all questions with wrong locales
   */
  async fixAllLocales() {
    try {
      this.log('🔧 Starting locale fix based on content...');
      
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

      // Process questions in batches
      const batchSize = 50;
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        
        const promises = batch.map(async (question) => {
          const result = await this.fixQuestionLocale(question);
          
          if (result.success && !result.skipped) {
            this.stats.fixed++;
            this.stats.byLocale[result.newLocale]++;
          } else if (result.success && result.skipped) {
            this.stats.byLocale[result.locale]++;
          } else {
            this.stats.errors++;
          }
          
          return result;
        });
        
        await Promise.all(promises);
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 200 === 0 || processed === allQuestions.length) {
          this.log(`🔄 Processed ${processed}/${this.stats.total} questions`);
        }
      }

      // Show results
      this.log('\\n✅ Locale fix completed!');
      this.log('\\n============================================================');
      this.log('📊 LOCALE FIX SUMMARY');
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
      
      // Check if distribution is correct
      if (this.stats.byLocale.en === 362 && this.stats.byLocale.pt === 362 && 
          this.stats.byLocale.es === 362 && this.stats.byLocale.fr === 362) {
        this.log('\\n🎉 PERFECT! All locales have exactly 362 questions each!');
      } else {
        this.log('\\n⚠️ Distribution is not perfect (expected 362 per language)');
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 Locale fix failed: ${error.message}`);
      throw error;
    }
  }
}

// Run locale fix
async function main() {
  const fixer = new LocaleFixer();
  await fixer.fixAllLocales();
}

main().catch(console.error);
