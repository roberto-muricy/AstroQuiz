#!/usr/bin/env node

/**
 * Fix locale assignments for migrated questions
 * This script corrects the locale field based on the actual language of the question content
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

// Language detection patterns
const LANGUAGE_PATTERNS = {
  pt: [
    /\bde acordo com\b/i,
    /\bquantos?\b/i,
    /\bqual\b/i,
    /\bcomo\b/i,
    /\bonde\b/i,
    /\bquem\b/i,
    /\bo que\b/i,
    /\bpor que\b/i,
    /\bplaneta\b/i,
    /\bestrela[s]?\b/i,
    /\buniverso\b/i,
    /\bgaláxia[s]?\b/i
  ],
  es: [
    /\bde acuerdo con\b/i,
    /\bcuántos?\b/i,
    /\bcuál\b/i,
    /\bcómo\b/i,
    /\bdónde\b/i,
    /\bquién\b/i,
    /\bqué\b/i,
    /\bpor qué\b/i,
    /\bplaneta\b/i,
    /\bestrella[s]?\b/i,
    /\buniverso\b/i,
    /\bgalaxia[s]?\b/i,
    /¿.*\?/
  ],
  fr: [
    /\bselon\b/i,
    /\bcombien\b/i,
    /\bquel[s]?\b/i,
    /\bquelle[s]?\b/i,
    /\bcomment\b/i,
    /\boù\b/i,
    /\bqui\b/i,
    /\bqu'est-ce que\b/i,
    /\bpourquoi\b/i,
    /\bplanète\b/i,
    /\bétoile[s]?\b/i,
    /\bunivers\b/i,
    /\bgalaxie[s]?\b/i
  ],
  en: [
    /\baccording to\b/i,
    /\bhow many\b/i,
    /\bwhat\b/i,
    /\bwhich\b/i,
    /\bhow\b/i,
    /\bwhere\b/i,
    /\bwho\b/i,
    /\bwhy\b/i,
    /\bplanet\b/i,
    /\bstar[s]?\b/i,
    /\buniverse\b/i,
    /\bgalax[y|ies]\b/i
  ]
};

class LocaleFixer {
  constructor() {
    this.stats = {
      total: 0,
      fixed: 0,
      errors: 0,
      byLanguage: { en: 0, pt: 0, es: 0, fr: 0, unknown: 0 }
    };
  }

  /**
   * Detect language of a question based on content
   */
  detectLanguage(question) {
    const content = (question.question + ' ' + question.optionA + ' ' + question.optionB).toLowerCase();
    
    // Check each language pattern
    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          matches++;
        }
      }
      // If we find 2+ pattern matches, it's likely this language
      if (matches >= 2) {
        return lang;
      }
    }
    
    // Fallback: check for specific character patterns
    if (/[àáâãäçéêëíîïóôõöúûü]/i.test(content)) {
      if (/ção\b|ões\b|que\b|com\b/i.test(content)) return 'pt';
      if (/ción\b|qué\b|cómo\b|dónde\b/i.test(content)) return 'es';
      if (/tion\b|où\b|être\b|avec\b/i.test(content)) return 'fr';
    }
    
    return 'unknown';
  }

  /**
   * Get all questions from Strapi
   */
  async getAllQuestions() {
    try {
      console.log('📥 Fetching all questions from Strapi...');
      
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
        allQuestions = allQuestions.concat(questions);
        
        hasMore = questions.length === 100;
        page++;
        
        console.log(`📄 Fetched page ${page - 1}, total questions: ${allQuestions.length}`);
      }
      
      console.log(`✅ Total questions fetched: ${allQuestions.length}`);
      return allQuestions;
      
    } catch (error) {
      console.error('❌ Failed to fetch questions:', error.message);
      throw error;
    }
  }

  /**
   * Update question locale
   */
  async updateQuestionLocale(questionId, newLocale) {
    try {
      const response = await axios.put(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${questionId}`,
        {
          data: { locale: newLocale }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to update question ${questionId}:`, error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Process and fix all questions
   */
  async fixAllLocales() {
    try {
      console.log('🔧 Starting locale fixing process...\n');
      
      // Get all questions
      const questions = await this.getAllQuestions();
      this.stats.total = questions.length;
      
      console.log('🔍 Analyzing and fixing locales...\n');
      
      // Process each question
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const progress = Math.round(((i + 1) / questions.length) * 100);
        
        try {
          // Detect correct language
          const detectedLang = this.detectLanguage(question);
          const currentLocale = question.locale;
          
          this.stats.byLanguage[detectedLang] = (this.stats.byLanguage[detectedLang] || 0) + 1;
          
          // Only update if different from current locale
          if (detectedLang !== 'unknown' && detectedLang !== currentLocale) {
            await this.updateQuestionLocale(question.id, detectedLang);
            this.stats.fixed++;
            
            console.log(`✅ Fixed Q${question.id}: ${currentLocale} → ${detectedLang} | "${question.question.substring(0, 50)}..."`);
          } else if (detectedLang === currentLocale) {
            console.log(`✓ Q${question.id}: Already correct (${currentLocale}) | "${question.question.substring(0, 50)}..."`);
          } else {
            console.log(`⚠️ Q${question.id}: Unknown language | "${question.question.substring(0, 50)}..."`);
          }
          
          // Progress update every 50 questions
          if ((i + 1) % 50 === 0) {
            console.log(`\n📊 Progress: ${i + 1}/${questions.length} (${progress}%)\n`);
          }
          
        } catch (error) {
          this.stats.errors++;
          console.error(`❌ Error processing question ${question.id}: ${error.message}`);
        }
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Locale fixing failed:', error.message);
      throw error;
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOCALE FIXING SUMMARY');
    console.log('='.repeat(60));
    console.log(`📥 Total Questions: ${this.stats.total}`);
    console.log(`🔧 Questions Fixed: ${this.stats.fixed}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log('\n📈 Language Distribution:');
    Object.entries(this.stats.byLanguage).forEach(([lang, count]) => {
      if (count > 0) {
        console.log(`   ${lang.toUpperCase()}: ${count} questions`);
      }
    });
    console.log('='.repeat(60));
  }
}

// Main execution
async function main() {
  const fixer = new LocaleFixer();
  
  try {
    await fixer.fixAllLocales();
    console.log('\n🎉 Locale fixing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Locale fixing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LocaleFixer;
