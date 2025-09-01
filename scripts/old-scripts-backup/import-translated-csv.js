#!/usr/bin/env node

/**
 * Import translated CSV into Strapi with proper i18n locales
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
  batchSize: 10, // Import 10 questions at once
  delayBetweenBatches: 1000 // 1 second delay
};

class CSVImporter {
  constructor() {
    this.stats = {
      total: 0,
      imported: { en: 0, pt: 0, es: 0, fr: 0 },
      errors: 0,
      skipped: 0
    };
    this.translatedFileName = 'AstroQuiz Questions - en-translated.csv';
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
   * Create a question in Strapi for specific locale
   */
  async createQuestion(questionData, locale) {
    const suffix = locale === 'en' ? '' : `_${locale}`;
    
          // Clamp level between 1 and 5 to match Strapi schema
      const rawLevel = parseInt(questionData.level) || 1;
      const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);

      const strapiData = {
        data: {
          baseId: questionData.baseId || `astro_${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
          topic: questionData[`topic${suffix}`] || questionData.topic,
          level: clampedLevel,
          question: questionData[`question${suffix}`] || questionData.question,
          optionA: questionData[`optionA${suffix}`] || questionData.optionA,
          optionB: questionData[`optionB${suffix}`] || questionData.optionB,
          optionC: questionData[`optionC${suffix}`] || questionData.optionC,
          optionD: questionData[`optionD${suffix}`] || questionData.optionD,
          correctOption: questionData.correctOption || 'A',
          explanation: questionData[`explanation${suffix}`] || questionData.explanation,
          locale: locale
        }
      };

    try {
      const response = await axios.post(`${CONFIG.strapi.apiUrl}/questions`, strapiData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.stats.imported[locale]++;
      return response.data;
    } catch (error) {
      this.log(`❌ Error creating ${locale} question: ${error.response?.data?.error?.message || error.message}`);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Import questions in batches
   */
  async importQuestions(questions) {
    this.log(`\\n🚀 Starting import of ${questions.length} questions...`);
    
    const languages = ['en', 'pt', 'es', 'fr'];
    
    for (const language of languages) {
      this.log(`\\n🌍 Importing ${language.toUpperCase()} questions...`);
      
      for (let i = 0; i < questions.length; i += CONFIG.batchSize) {
        const batch = questions.slice(i, i + CONFIG.batchSize);
        const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
        const totalBatches = Math.ceil(questions.length / CONFIG.batchSize);
        
        this.log(`   📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);
        
        // Create all questions in this batch for current language
        const promises = batch.map(async (question, index) => {
          try {
            await this.createQuestion(question, language);
            return { success: true, index: i + index };
          } catch (error) {
            return { success: false, index: i + index, error };
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        // Count successes and failures
        const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
        
        this.log(`   ✅ Batch completed: ${successes} success, ${failures} failures`);
        
        // Delay between batches
        if (i + CONFIG.batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
      }
      
      this.log(`   🎉 ${language.toUpperCase()} import completed: ${this.stats.imported[language]} questions`);
    }
  }

  /**
   * Show import summary
   */
  showSummary() {
    this.log('\\n' + '='.repeat(70));
    this.log('🎉 CSV IMPORT COMPLETED!');
    this.log('='.repeat(70));

    this.log(`\\n📊 IMPORT STATS:`);
    this.log(`   Total questions processed: ${this.stats.total}`);
    Object.entries(this.stats.imported).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()} imported: ${count} questions`);
    });
    this.log(`   Errors: ${this.stats.errors}`);
    this.log(`   Skipped: ${this.stats.skipped}`);

    const totalImported = Object.values(this.stats.imported).reduce((sum, count) => sum + count, 0);
    const expectedTotal = this.stats.total * 4; // 4 languages
    const successRate = ((totalImported / expectedTotal) * 100).toFixed(1);

    this.log(`\\n📈 SUCCESS RATE: ${successRate}%`);
    this.log(`   Expected: ${expectedTotal} total questions`);
    this.log(`   Imported: ${totalImported} total questions`);

    if (successRate >= 95) {
      this.log(`\\n🎉 EXCELLENT! Import was highly successful!`);
    } else if (successRate >= 80) {
      this.log(`\\n✅ GOOD! Most questions imported successfully.`);
    } else {
      this.log(`\\n⚠️ Some issues occurred. Check the logs above.`);
    }

    this.log(`\\n💡 NEXT STEPS:`);
    this.log(`   1. Check Strapi admin panel at http://localhost:1337/admin`);
    this.log(`   2. Verify questions appear in correct language tabs`);
    this.log(`   3. Test switching between locales`);
    this.log(`   4. Review any error messages above`);

    this.log('='.repeat(70));
  }

  /**
   * Run complete import
   */
  async runImport() {
    try {
      const csvFilePath = path.join(__dirname, this.translatedFileName);
      const questions = await this.readTranslatedCSV(csvFilePath);
      
      await this.importQuestions(questions);
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
  const importer = new CSVImporter();
  await importer.runImport();
}

main().catch(console.error);
