#!/usr/bin/env node

/**
 * Fix locale assignments based on ID pattern (EN → PT → ES → FR every 4 questions)
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

class PatternLocaleFixer {
  constructor() {
    this.stats = {
      total: 0,
      fixed: 0,
      errors: 0,
      byLocale: { en: 0, pt: 0, es: 0, fr: 0 },
      skipped: 0
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Determine correct locale based on ID pattern
   * Pattern: EN (even IDs divisible by 4), PT (even+2), ES (odd), FR (odd+2)
   * More specifically: ID % 4 determines language
   */
  getCorrectLocaleByPattern(id) {
    // Find the relative position in groups of 4
    const remainder = id % 4;
    
    switch (remainder) {
      case 2: return 'en';  // IDs ending in 2: 7194, 7202, etc.
      case 0: return 'pt';  // IDs ending in 0: 7196, 7204, etc. 
      case 2: return 'es';  // IDs ending in 8: 7198, 7206, etc.
      case 0: return 'fr';  // IDs ending in 0: 7200, 7208, etc.
      default: return 'en'; // fallback
    }
  }

  /**
   * Better pattern detection based on analysis
   */
  getCorrectLocaleByAnalysis(id) {
    // Based on the pattern observed:
    // 7194 (EN), 7196 (PT), 7198 (ES), 7200 (FR)
    // 7186 (EN), 7188 (PT), 7190 (ES), 7192 (FR)
    // 7178 (EN), 7180 (PT), 7182 (ES), 7184 (FR)
    
    // Pattern: every group of 4 consecutive even IDs
    const baseGroup = Math.floor((id - 2) / 4) * 4 + 2; // Normalize to start of group
    const positionInGroup = ((id - baseGroup) / 2) % 4;
    
    switch (positionInGroup) {
      case 0: return 'en';  // 1st in group
      case 1: return 'pt';  // 2nd in group  
      case 2: return 'es';  // 3rd in group
      case 3: return 'fr';  // 4th in group
      default: return 'en';
    }
  }

  /**
   * Even simpler pattern - based on observation
   */
  getCorrectLocale(id) {
    // From analysis: 7194=EN, 7196=PT, 7198=ES, 7200=FR
    // Pattern: ID % 8 determines the language
    const mod8 = id % 8;
    
    if (mod8 === 2) return 'en';      // 7194 % 8 = 2
    if (mod8 === 4) return 'pt';      // 7196 % 8 = 4  
    if (mod8 === 6) return 'es';      // 7198 % 8 = 6
    if (mod8 === 0) return 'fr';      // 7200 % 8 = 0
    
    // For odd IDs or other patterns, try different approach
    const mod4 = id % 4;
    if (mod4 === 0) return 'pt';
    if (mod4 === 1) return 'es';
    if (mod4 === 2) return 'en';
    if (mod4 === 3) return 'fr';
    
    return 'en'; // fallback
  }

  /**
   * Fix a single question's locale based on pattern
   */
  async fixQuestionLocale(question) {
    try {
      const correctLocale = this.getCorrectLocale(question.id);
      
      // If locale is already correct, skip
      if (question.locale === correctLocale) {
        this.stats.skipped++;
        this.stats.byLocale[correctLocale]++;
        return { success: true, skipped: true, locale: correctLocale };
      }
      
      // Update the question with correct locale
      await axios.put(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.id}`, {
        data: {
          locale: correctLocale
        }
      });
      
      this.stats.fixed++;
      this.stats.byLocale[correctLocale]++;
      
      return { 
        success: true, 
        skipped: false, 
        oldLocale: question.locale, 
        newLocale: correctLocale,
        id: question.id
      };
      
    } catch (error) {
      this.stats.errors++;
      return { success: false, error: error.message, id: question.id };
    }
  }

  /**
   * Fix all questions with pattern-based locale detection
   */
  async fixAllLocales() {
    try {
      this.log('🔧 Starting pattern-based locale fix...');
      
      // Get all questions in batches
      let page = 1;
      let hasMore = true;
      let allQuestions = [];
      
      while (hasMore) {
        const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
          params: {
            'pagination[page]': page,
            'pagination[pageSize]': 100,
            'sort': 'id:asc'  // Important: sort by ID to maintain pattern
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

      // Show pattern prediction for first few questions
      this.log('\n🔍 Pattern prediction for sample questions:');
      allQuestions.slice(-20).forEach((q, i) => {
        const predicted = this.getCorrectLocale(q.id);
        const current = q.locale;
        const match = predicted === current ? '✅' : '❌';
        this.log(`   ID ${q.id}: Current=${current} → Predicted=${predicted} ${match}`);
      });

      this.log('\n🔄 Starting locale fixes...');

      // Process questions in smaller batches to avoid overwhelming the API
      const batchSize = 20;
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        
        const promises = batch.map(async (question) => {
          return await this.fixQuestionLocale(question);
        });
        
        const results = await Promise.all(promises);
        
        // Log some successful fixes
        const fixes = results.filter(r => r.success && !r.skipped);
        if (fixes.length > 0 && i % 200 === 0) {
          this.log(`   Fixed: ID ${fixes[0].id} ${fixes[0].oldLocale}→${fixes[0].newLocale}`);
        }
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 400 === 0 || processed === allQuestions.length) {
          this.log(`🔄 Processed ${processed}/${this.stats.total} questions (Fixed: ${this.stats.fixed}, Skipped: ${this.stats.skipped})`);
        }
      }

      // Show results
      this.log('\n✅ Pattern-based locale fix completed!');
      this.log('\n============================================================');
      this.log('📊 PATTERN LOCALE FIX SUMMARY');
      this.log('============================================================');
      this.log(`📊 Total questions: ${this.stats.total}`);
      this.log(`🔧 Locales fixed: ${this.stats.fixed}`);
      this.log(`⏭️ Already correct (skipped): ${this.stats.skipped}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      this.log('\n📈 Final distribution by language:');
      Object.entries(this.stats.byLocale).forEach(([locale, count]) => {
        this.log(`   ${locale.toUpperCase()}: ${count} questions`);
      });
      
      const totalByLocale = Object.values(this.stats.byLocale).reduce((sum, count) => sum + count, 0);
      this.log(`\n📊 Total by locale: ${totalByLocale}`);
      
      // Check if distribution is correct
      if (this.stats.byLocale.en === 898 && this.stats.byLocale.pt === 898 && 
          this.stats.byLocale.es === 898 && this.stats.byLocale.fr === 898) {
        this.log('\n🎉 PERFECT! All locales have exactly 898 questions each!');
      } else if (Math.abs(this.stats.byLocale.en - 898) <= 10 && 
                 Math.abs(this.stats.byLocale.pt - 898) <= 10 &&
                 Math.abs(this.stats.byLocale.es - 898) <= 10 && 
                 Math.abs(this.stats.byLocale.fr - 898) <= 10) {
        this.log('\n✅ GOOD! Distribution is very close to expected (~898 per language)');
      } else {
        this.log('\n⚠️ Distribution needs adjustment - expected ~898 per language');
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 Pattern locale fix failed: ${error.message}`);
      throw error;
    }
  }
}

// Run pattern-based locale fix
async function main() {
  const fixer = new PatternLocaleFixer();
  await fixer.fixAllLocales();
}

main().catch(console.error);
