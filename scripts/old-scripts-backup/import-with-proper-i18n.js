#!/usr/bin/env node

/**
 * Import translated CSV into Strapi with PROPER i18n localizations
 * 
 * Strategy:
 * 1. First import all English questions (master language)
 * 2. Then create PT, ES, FR localizations linked to each English question
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    apiUrl: 'http://localhost:1337/api'
  },
  batchSize: 5, // Smaller batches for better error handling
  delayBetweenBatches: 2000 // 2 second delay
};

class ProperI18nImporter {
  constructor() {
    this.stats = {
      total: 0,
      imported: { en: 0, pt: 0, es: 0, fr: 0 },
      errors: 0,
      skipped: 0
    };
    this.translatedFileName = 'AstroQuiz Questions - en-translated.csv';
    this.englishQuestions = new Map(); // Store English questions with their Strapi IDs
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Read translated CSV file
   */
  async readTranslatedCSV(filePath) {
    this.log(`📖 Reading translated CSV: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Translated CSV file not found: ${filePath}`);
    }

    const csvContent = fs.readFileSync(filePath, 'utf8');

    const records = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    this.log(`✅ Loaded ${records.length} questions from translated CSV`);
    this.stats.total = records.length;
    return records;
  }

  /**
   * Create English (master) question in Strapi
   */
  async createEnglishQuestion(questionData) {
    // Clamp level between 1 and 5 to match Strapi schema
    const rawLevel = parseInt(questionData.level) || 1;
    const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);

    const strapiData = {
      data: {
        baseId: questionData.baseId || `astro_${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        topic: questionData.topic,
        level: clampedLevel,
        question: questionData.question,
        optionA: questionData.optionA,
        optionB: questionData.optionB,
        optionC: questionData.optionC,
        optionD: questionData.optionD,
        correctOption: questionData.correctOption || 'A',
        explanation: questionData.explanation,
        locale: 'en'
      }
    };

    try {
      const response = await axios.post(`${CONFIG.strapi.apiUrl}/questions`, strapiData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.stats.imported.en++;
      
      // Store the English question data with its Strapi ID
      const createdQuestion = response.data.data;
      this.englishQuestions.set(questionData.baseId, {
        documentId: createdQuestion.documentId,
        id: createdQuestion.id,
        originalData: questionData
      });

      this.log(`✅ Created English question ${questionData.baseId} with ID: ${createdQuestion.id}`);

      return createdQuestion;
    } catch (error) {
      this.log(`❌ Error creating English question ${questionData.baseId}: ${error.response?.data?.error?.message || error.message}`);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Create localization for a specific language
   */
  async createLocalization(englishQuestionData, locale) {
    const suffix = `_${locale}`;
    const originalData = englishQuestionData.originalData;
    
    // Clamp level between 1 and 5 to match Strapi schema
    const rawLevel = parseInt(originalData.level) || 1;
    const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);

    const localizationData = {
      data: {
        baseId: originalData.baseId,
        topic: originalData[`topic${suffix}`] || originalData.topic,
        level: clampedLevel,
        question: originalData[`question${suffix}`] || originalData.question,
        optionA: originalData[`optionA${suffix}`] || originalData.optionA,
        optionB: originalData[`optionB${suffix}`] || originalData.optionB,
        optionC: originalData[`optionC${suffix}`] || originalData.optionC,
        optionD: originalData[`optionD${suffix}`] || originalData.optionD,
        correctOption: originalData.correctOption || 'A',
        explanation: originalData[`explanation${suffix}`] || originalData.explanation,
        locale: locale,
        localizations: [englishQuestionData.id] // Link to the English question
      }
    };

    try {
      // Create localization as a separate entry linked to the English question
      const response = await axios.post(
        `${CONFIG.strapi.apiUrl}/questions`, 
        localizationData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.stats.imported[locale]++;
      this.log(`✅ Created ${locale} localization for ${originalData.baseId} (ID: ${response.data.data.id})`);
      return response.data;
    } catch (error) {
      this.log(`❌ Error creating ${locale} localization for ${originalData.baseId}: ${error.response?.data?.error?.message || error.message}`);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Import English questions first (master language)
   */
  async importEnglishQuestions(questions) {
    this.log(`\n🇺🇸 Importing ${questions.length} English questions (master language)...`);
    
    for (let i = 0; i < questions.length; i += CONFIG.batchSize) {
      const batch = questions.slice(i, i + CONFIG.batchSize);
      const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / CONFIG.batchSize);
      
      this.log(`   📦 Processing English batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);
      
      // Create all English questions in this batch
      const promises = batch.map(async (question, index) => {
        try {
          await this.createEnglishQuestion(question);
          return { success: true, index: i + index, baseId: question.baseId };
        } catch (error) {
          return { success: false, index: i + index, baseId: question.baseId, error };
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      this.log(`   ✅ English batch completed: ${successes} success, ${failures} failures`);
      
      // Delay between batches
      if (i + CONFIG.batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
      }
    }
    
    this.log(`   🎉 English import completed: ${this.stats.imported.en} questions`);
  }

  /**
   * Import localizations for other languages
   */
  async importLocalizations() {
    const languages = ['pt', 'es', 'fr'];
    const languageFlags = { pt: '🇧🇷', es: '🇪🇸', fr: '🇫🇷' };
    
    for (const language of languages) {
      this.log(`\n${languageFlags[language]} Creating ${language.toUpperCase()} localizations...`);
      
      const englishQuestionsList = Array.from(this.englishQuestions.values());
      
      for (let i = 0; i < englishQuestionsList.length; i += CONFIG.batchSize) {
        const batch = englishQuestionsList.slice(i, i + CONFIG.batchSize);
        const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
        const totalBatches = Math.ceil(englishQuestionsList.length / CONFIG.batchSize);
        
        this.log(`   📦 Processing ${language} batch ${batchNum}/${totalBatches} (${batch.length} localizations)...`);
        
        // Create all localizations in this batch
        const promises = batch.map(async (englishQuestion, index) => {
          try {
            await this.createLocalization(englishQuestion, language);
            return { success: true, index: i + index, baseId: englishQuestion.originalData.baseId };
          } catch (error) {
            return { success: false, index: i + index, baseId: englishQuestion.originalData.baseId, error };
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        // Count successes and failures
        const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
        
        this.log(`   ✅ ${language} batch completed: ${successes} success, ${failures} failures`);
        
        // Delay between batches
        if (i + CONFIG.batchSize < englishQuestionsList.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
      }
      
      this.log(`   🎉 ${language.toUpperCase()} localizations completed: ${this.stats.imported[language]} questions`);
    }
  }

  /**
   * Show import summary
   */
  showSummary() {
    this.log('\n' + '='.repeat(70));
    this.log('🎉 PROPER I18N IMPORT COMPLETED!');
    this.log('='.repeat(70));

    this.log(`\n📊 IMPORT STATS:`);
    this.log(`   Total questions processed: ${this.stats.total}`);
    Object.entries(this.stats.imported).forEach(([lang, count]) => {
      const flag = { en: '🇺🇸', pt: '🇧🇷', es: '🇪🇸', fr: '🇫🇷' }[lang];
      this.log(`   ${flag} ${lang.toUpperCase()} imported: ${count} questions`);
    });
    this.log(`   Errors: ${this.stats.errors}`);
    this.log(`   Skipped: ${this.stats.skipped}`);

    const totalImported = Object.values(this.stats.imported).reduce((sum, count) => sum + count, 0);
    const expectedTotal = this.stats.total * 4; // 4 languages
    const successRate = ((totalImported / expectedTotal) * 100).toFixed(1);

    this.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    this.log(`   Expected: ${expectedTotal} total entries (1 master + 3 localizations per question)`);
    this.log(`   Imported: ${totalImported} total entries`);

    if (successRate >= 95) {
      this.log(`\n🎉 EXCELLENT! Import was highly successful!`);
    } else if (successRate >= 80) {
      this.log(`\n✅ GOOD! Most questions imported successfully.`);
    } else {
      this.log(`\n⚠️ Some issues occurred. Check the logs above.`);
    }

    this.log(`\n💡 NEXT STEPS:`);
    this.log(`   1. Check Strapi admin panel at http://localhost:1337/admin`);
    this.log(`   2. Go to Content Manager > Question`);
    this.log(`   3. You should see language tabs (EN, PT, ES, FR) for each question`);
    this.log(`   4. Click on a question and verify you can switch between locales`);
    this.log(`   5. Each question should show proper translations in each tab`);

    this.log('='.repeat(70));
  }

  /**
   * Run complete import with proper i18n linking
   */
  async runImport() {
    try {
      const csvFilePath = path.join(__dirname, this.translatedFileName);
      const questions = await this.readTranslatedCSV(csvFilePath);
      
      // Step 1: Import all English questions (master language)
      await this.importEnglishQuestions(questions);
      
      // Step 2: Create localizations for PT, ES, FR linked to English questions
      await this.importLocalizations();
      
      this.showSummary();

    } catch (error) {
      this.log(`💥 Import failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }
}

// Run import
async function main() {
  const importer = new ProperI18nImporter();
  await importer.runImport();
}

main().catch(console.error);
