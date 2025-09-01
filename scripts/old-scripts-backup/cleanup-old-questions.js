#!/usr/bin/env node

/**
 * Delete old questions with wrong locales (keep only the correctly migrated ones from ID 4000+)
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

class QuestionCleanup {
  constructor() {
    this.stats = {
      deleted: 0,
      errors: 0,
      kept: 0
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  async deleteOldQuestions() {
    try {
      this.log('🧹 Starting cleanup of old questions...');
      
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
        
        this.log(`📥 Fetched page ${page-1}, total: ${allQuestions.length} questions`);
      }

      this.log(`📊 Total questions found: ${allQuestions.length}`);

      // Delete questions with ID < 4000 (old ones with wrong locales)
      const questionsToDelete = allQuestions.filter(q => q.id < 4000);
      const questionsToKeep = allQuestions.filter(q => q.id >= 4000);

      this.log(`🗑️ Questions to delete (ID < 4000): ${questionsToDelete.length}`);
      this.log(`✅ Questions to keep (ID >= 4000): ${questionsToKeep.length}`);

      // Delete old questions
      for (let i = 0; i < questionsToDelete.length; i++) {
        const question = questionsToDelete[i];
        
        try {
          await axios.delete(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.id}`);
          this.stats.deleted++;
          
          if (this.stats.deleted % 50 === 0) {
            this.log(`🗑️ Deleted ${this.stats.deleted}/${questionsToDelete.length} old questions`);
          }
        } catch (error) {
          this.stats.errors++;
          if (error.response?.status !== 404) {
            this.log(`❌ Failed to delete question ${question.id}: ${error.response?.data?.error?.message || error.message}`);
          }
        }
      }

      this.stats.kept = questionsToKeep.length;

      this.log('\n✅ Cleanup completed!');
      this.log('\n============================================================');
      this.log('📊 CLEANUP SUMMARY');
      this.log('============================================================');
      this.log(`🗑️ Old questions deleted: ${this.stats.deleted}`);
      this.log(`✅ New questions kept: ${this.stats.kept}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      this.log('============================================================');

      // Verify final counts by locale
      await this.verifyLocaleCounts();

    } catch (error) {
      this.log(`💥 Cleanup failed: ${error.message}`);
      throw error;
    }
  }

  async verifyLocaleCounts() {
    try {
      this.log('\n🔍 Verifying final locale distribution...');
      
      const locales = ['en', 'pt', 'es', 'fr'];
      const counts = {};
      
      for (const locale of locales) {
        try {
          const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
            params: {
              'locale': locale,
              'pagination[limit]': 1
            }
          });
          counts[locale] = response.data.meta.pagination.total;
        } catch (error) {
          counts[locale] = 0;
        }
      }
      
      this.log('\n📈 Questions by Language:');
      Object.entries(counts).forEach(([locale, count]) => {
        this.log(`   ${locale.toUpperCase()}: ${count} questions`);
      });
      
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      this.log(`\n📊 Total questions: ${total}`);
      
      // Check if we have the expected 1448 questions (362 per language)
      if (total === 1448 && counts.en === 362 && counts.pt === 362 && counts.es === 362 && counts.fr === 362) {
        this.log('\n🎉 Perfect! All locales have exactly 362 questions each!');
      } else {
        this.log('\n⚠️ Locale distribution is not as expected (should be 362 per language)');
      }
      
    } catch (error) {
      this.log(`❌ Failed to verify locale counts: ${error.message}`);
    }
  }
}

// Run cleanup
async function main() {
  const cleanup = new QuestionCleanup();
  await cleanup.deleteOldQuestions();
}

main().catch(console.error);
