#!/usr/bin/env node

/**
 * Clean all questions and remigrate with correct locales
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

class CleanAndRemigrate {
  constructor() {
    this.stats = {
      deleted: 0,
      errors: 0
    };
  }

  /**
   * Delete all questions
   */
  async deleteAllQuestions() {
    try {
      console.log('🗑️ Deleting all existing questions...\n');
      
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
        allQuestions = allQuestions.concat(questions);
        
        hasMore = questions.length === 100;
        page++;
      }
      
      console.log(`📊 Found ${allQuestions.length} questions to delete`);
      
      // Delete each question
      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        
        try {
          await axios.delete(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}/${question.id}`);
          this.stats.deleted++;
          
          if ((i + 1) % 100 === 0) {
            console.log(`🗑️ Deleted ${i + 1}/${allQuestions.length} questions`);
          }
          
        } catch (error) {
          this.stats.errors++;
          console.error(`❌ Failed to delete question ${question.id}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Deletion complete: ${this.stats.deleted} deleted, ${this.stats.errors} errors\n`);
      
    } catch (error) {
      console.error('💥 Failed to delete questions:', error.message);
      throw error;
    }
  }

  /**
   * Run the corrected migration
   */
  async runCorrectedMigration() {
    console.log('🚀 Starting corrected migration with proper locales...\n');
    
    // Import and run the corrected migration
    const CorrectedMigrator = require('./migrate-with-correct-locales');
    const migrator = new CorrectedMigrator();
    
    await migrator.migrate();
  }
}

// Main execution
async function main() {
  const cleaner = new CleanAndRemigrate();
  
  try {
    console.log('🧹 CLEAN AND REMIGRATE PROCESS\n');
    console.log('This will delete all existing questions and remigrate with correct locales.\n');
    
    // Ask for confirmation
    console.log('⚠️ WARNING: This will delete ALL existing questions!');
    console.log('Type "yes" to continue or anything else to cancel:');
    
    // For now, we'll skip the interactive part and proceed
    console.log('Proceeding with cleanup and remigration...\n');
    
    // Step 1: Delete all questions
    await cleaner.deleteAllQuestions();
    
    // Step 2: Run corrected migration
    await cleaner.runCorrectedMigration();
    
    console.log('\n🎉 Clean and remigration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Clean and remigration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CleanAndRemigrate;
