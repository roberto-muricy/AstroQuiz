#!/usr/bin/env node

/**
 * Clean everything - delete ALL questions from Strapi
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

class CompleteCleanup {
  constructor() {
    this.stats = {
      total: 0,
      deleted: 0,
      errors: 0
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Delete all questions completely
   */
  async deleteAllQuestions() {
    try {
      this.log('🗑️ Starting complete cleanup...');
      
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
          this.log(`📥 Found ${allQuestions.length} questions to delete...`);
        }
      }

      this.stats.total = allQuestions.length;
      this.log(`📊 Total questions to delete: ${this.stats.total}`);

      if (this.stats.total === 0) {
        this.log('✅ No questions found - database is already clean!');
        return;
      }

      // Delete all questions using documentId (Strapi v5)
      this.log('🔥 Starting mass deletion...');
      
      const batchSize = 10;
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        
        const promises = batch.map(async (question) => {
          try {
            await axios.delete(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.documentId}`);
            this.stats.deleted++;
            return { success: true, id: question.id, documentId: question.documentId };
          } catch (error) {
            this.stats.errors++;
            return { success: false, id: question.id, documentId: question.documentId, error: error.message };
          }
        });
        
        const results = await Promise.all(promises);
        
        const processed = Math.min(i + batchSize, allQuestions.length);
        if (processed % 100 === 0 || processed === allQuestions.length) {
          this.log(`🔥 Deleted ${this.stats.deleted}/${this.stats.total} questions (Errors: ${this.stats.errors})`);
        }
      }

      // Show final results
      this.log('\\n✅ Complete cleanup finished!');
      this.log('\\n============================================================');
      this.log('📊 COMPLETE CLEANUP SUMMARY');
      this.log('============================================================');
      this.log(`📊 Total questions found: ${this.stats.total}`);
      this.log(`🗑️ Successfully deleted: ${this.stats.deleted}`);
      this.log(`❌ Errors: ${this.stats.errors}`);
      
      if (this.stats.deleted === this.stats.total && this.stats.errors === 0) {
        this.log('\\n🎉 PERFECT! All questions deleted successfully!');
        this.log('\\n💡 Database is now completely clean and ready for fresh migration.');
      } else if (this.stats.errors > 0) {
        this.log(`\\n⚠️ ${this.stats.errors} questions could not be deleted.`);
      }
      
      this.log('============================================================');

    } catch (error) {
      this.log(`💥 Complete cleanup failed: ${error.message}`);
      throw error;
    }
  }
}

// Run complete cleanup
async function main() {
  const cleaner = new CompleteCleanup();
  await cleaner.deleteAllQuestions();
}

main().catch(console.error);
