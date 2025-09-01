require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');

// Configuration
const CONFIG = {
  csvFile: path.join(__dirname, '..', 'AstroQuiz Questions - en-translated.csv'),
  strapi: {
    apiUrl: 'http://localhost:1337/api'
  }
};

// Import Strapi for entity service access
let strapi;

class CSVImporter {
  constructor() {
    this.questions = [];
    this.englishQuestions = new Map(); // Map baseId -> English question data
    this.stats = {
      processed: 0,
      successful: 0,
      errors: 0,
      languages: { en: 0, pt: 0, es: 0, fr: 0 }
    };
  }

  async loadCSV() {
    console.log(`[${this.getTimestamp()}] 📖 Loading CSV file: ${CONFIG.csvFile}`);
    
    const csvContent = fs.readFileSync(CONFIG.csvFile, 'utf8');
    
    return new Promise((resolve, reject) => {
      csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) {
          console.error(`[${this.getTimestamp()}] ❌ CSV parsing error:`, err);
          reject(err);
          return;
        }
        
        console.log(`[${this.getTimestamp()}] ✅ Loaded ${records.length} questions from CSV`);
        this.questions = records;
        resolve();
      });
    });
  }

  async initializeStrapi() {
    console.log(`[${this.getTimestamp()}] 🚀 Initializing Strapi...`);
    
    try {
      // Import Strapi factory
      const createStrapi = require('@strapi/strapi').createStrapi;
      
      // Create Strapi instance
      strapi = await createStrapi({
        dir: process.cwd(),
        autoReload: false,
        serveAdminPanel: false
      });
      
      await strapi.load();
      console.log(`[${this.getTimestamp()}] ✅ Strapi initialized successfully`);
      
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Failed to initialize Strapi:`, error);
      throw error;
    }
  }

  async createEnglishQuestions() {
    console.log(`[${this.getTimestamp()}] 🇺🇸 Creating English master questions...`);
    
    // Filter English questions
    const englishQuestions = this.questions.filter(q => q.baseId && !q.baseId.includes('_'));
    
    console.log(`[${this.getTimestamp()}] 📊 Found ${englishQuestions.length} English questions`);
    
    for (const questionData of englishQuestions) {
      try {
        this.stats.processed++;
        
        // Clamp level between 1 and 5
        const rawLevel = parseInt(questionData.level) || 1;
        const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);
        
        // Prepare data for Strapi
        const strapiData = {
          baseId: questionData.baseId,
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
        };
        
        // Create using entityService
        const createdQuestion = await strapi.entityService.create('api::question.question', {
          data: strapiData
        });
        
        // Store the created question for localization linking
        this.englishQuestions.set(questionData.baseId, {
          id: createdQuestion.id,
          documentId: createdQuestion.documentId,
          originalData: questionData
        });
        
        this.stats.successful++;
        this.stats.languages.en++;
        
        if (this.stats.processed % 50 === 0) {
          console.log(`[${this.getTimestamp()}] 📈 Progress: ${this.stats.processed} processed, ${this.stats.successful} successful`);
        }
        
      } catch (error) {
        this.stats.errors++;
        console.error(`[${this.getTimestamp()}] ❌ Error creating English question ${questionData.baseId}:`, error.message);
      }
    }
    
    console.log(`[${this.getTimestamp()}] ✅ English questions created: ${this.stats.languages.en}`);
  }

  async createLocalizations() {
    console.log(`[${this.getTimestamp()}] 🌍 Creating localizations...`);
    
    const locales = ['pt', 'es', 'fr'];
    
    for (const locale of locales) {
      console.log(`[${this.getTimestamp()}] 🚀 Processing ${locale.toUpperCase()} localizations...`);
      
      for (const [baseId, englishQuestionData] of this.englishQuestions) {
        try {
          await this.createLocalization(englishQuestionData, locale);
          
        } catch (error) {
          this.stats.errors++;
          console.error(`[${this.getTimestamp()}] ❌ Error creating ${locale} localization for ${baseId}:`, error.message);
        }
      }
      
      console.log(`[${this.getTimestamp()}] ✅ ${locale.toUpperCase()} localizations created: ${this.stats.languages[locale]}`);
    }
  }

  async createLocalization(englishQuestionData, locale) {
    const suffix = `_${locale}`;
    const originalData = englishQuestionData.originalData;

    // Clamp level between 1 and 5 to match Strapi schema
    const rawLevel = parseInt(originalData.level) || 1;
    const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);

    const localizationData = {
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
    };

    try {
      // Create localization using entityService with proper linking
      const createdLocalization = await strapi.entityService.create('api::question.question', {
        data: localizationData
      });

      this.stats.successful++;
      this.stats.languages[locale]++;

      // Also update the English question to link back to this localization
      await strapi.entityService.update('api::question.question', englishQuestionData.id, {
        data: {
          localizations: [createdLocalization.id, ...(englishQuestionData.localizations || [])]
        }
      });

      return createdLocalization;

    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Failed to create ${locale} localization for ${originalData.baseId}:`, error);
      throw error;
    }
  }

  getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  async printFinalReport() {
    console.log(`\n[${this.getTimestamp()}] 📊 FINAL IMPORT REPORT`);
    console.log('='.repeat(50));
    console.log(`📈 Total processed: ${this.stats.processed}`);
    console.log(`✅ Total successful: ${this.stats.successful}`);
    console.log(`❌ Total errors: ${this.stats.errors}`);
    console.log('\n🌍 By Language:');
    console.log(`  🇺🇸 English: ${this.stats.languages.en}`);
    console.log(`  🇧🇷 Portuguese: ${this.stats.languages.pt}`);
    console.log(`  🇪🇸 Spanish: ${this.stats.languages.es}`);
    console.log(`  🇫🇷 French: ${this.stats.languages.fr}`);
    
    const totalExpected = this.englishQuestions.size * 4; // 4 languages per question
    const successRate = ((this.stats.successful / totalExpected) * 100).toFixed(1);
    
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    console.log(`📊 Expected: ${totalExpected} total questions`);
    console.log(`📊 Imported: ${this.stats.successful} total questions`);
    console.log('='.repeat(50));
  }

  async cleanup() {
    if (strapi) {
      console.log(`[${this.getTimestamp()}] 🧹 Cleaning up Strapi instance...`);
      await strapi.destroy();
    }
  }
}

async function main() {
  const importer = new CSVImporter();
  
  try {
    console.log(`[${importer.getTimestamp()}] 🚀 Starting CSV import with EntityService strategy...`);
    console.log('='.repeat(70));
    
    // Initialize Strapi
    await importer.initializeStrapi();
    
    // Load CSV data
    await importer.loadCSV();
    
    // Create English master questions first
    await importer.createEnglishQuestions();
    
    // Create localizations linked to English questions
    await importer.createLocalizations();
    
    // Print final report
    await importer.printFinalReport();
    
    console.log(`\n[${importer.getTimestamp()}] 🎉 Import completed successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Check Strapi admin panel: http://localhost:1337/admin`);
    console.log(`   2. Go to Content Manager > Question`);
    console.log(`   3. Verify language tabs appear for each question`);
    console.log(`   4. Test switching between locales using the locale filter`);
    
  } catch (error) {
    console.error(`[${importer.getTimestamp()}] 💥 Fatal error:`, error);
    process.exit(1);
  } finally {
    await importer.cleanup();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (strapi) {
    await strapi.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (strapi) {
    await strapi.destroy();
  }
  process.exit(0);
});

// Run the importer
main();
