require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');
const axios = require('axios');

// Configuration
const CONFIG = {
  csvFile: path.join(__dirname, '..', 'AstroQuiz Questions import.csv'),
  checkpointFile: path.join(__dirname, 'import-checkpoint.json'),
  strapi: {
    apiUrl: 'http://localhost:1337/api',
    timeout: 30000
  },
  deepl: {
    apiKey: process.env.DEEPL_API_KEY,
    apiUrl: 'https://api.deepl.com/v2/translate', // Pro API URL
    usageUrl: 'https://api.deepl.com/v2/usage',   // Pro Usage URL
    timeout: 30000,
    batchSize: 10, // Increased for Pro plan - much higher quota
    delayBetweenBatches: 2000, // Reduced to 2 seconds - Pro has higher rate limits
    maxRetries: 3,
    retryDelay: 5000, // Reduced retry delay for Pro
    quotaCheckInterval: 100 // Check quota every 100 translations (Pro has much more quota)
  },
  locales: {
    'pt': 'PT-BR', // Portuguese Brazil
    'es': 'ES',    // Spanish
    'fr': 'FR'     // French
  }
};

class CSVImporter {
  constructor() {
    this.questions = [];
    this.importedQuestions = new Map(); // baseId -> { en: questionData, pt: questionData, etc. }
    this.checkpoint = this.loadCheckpoint();
    this.quotaUsage = null;
    this.translationCount = 0;
    this.stats = {
      processed: 0,
      successful: 0,
      errors: 0,
      translations: 0,
      languages: { en: 0, pt: 0, es: 0, fr: 0 }
    };
  }

  loadCheckpoint() {
    try {
      if (fs.existsSync(CONFIG.checkpointFile)) {
        const data = fs.readFileSync(CONFIG.checkpointFile, 'utf8');
        const checkpoint = JSON.parse(data);
        console.log(`[${this.getTimestamp()}] 📂 Checkpoint loaded: ${checkpoint.completedLanguages?.length || 0} languages completed`);
        return checkpoint;
      }
    } catch (error) {
      console.log(`[${this.getTimestamp()}] ⚠️ Could not load checkpoint:`, error.message);
    }
    return {
      englishCompleted: false,
      completedLanguages: [],
      failedTranslations: []
    };
  }

  saveCheckpoint() {
    try {
      fs.writeFileSync(CONFIG.checkpointFile, JSON.stringify(this.checkpoint, null, 2));
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Error saving checkpoint:`, error.message);
    }
  }

  async checkDeepLQuota() {
    try {
      console.log(`[${this.getTimestamp()}] 📊 Checking DeepL quota...`);
      
      const response = await axios.get(CONFIG.deepl.usageUrl, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${CONFIG.deepl.apiKey}`
        },
        timeout: CONFIG.deepl.timeout
      });

      this.quotaUsage = response.data;
      const used = this.quotaUsage.character_count;
      const limit = this.quotaUsage.character_limit;
      const remaining = limit - used;
      const percentUsed = ((used / limit) * 100).toFixed(1);

      console.log(`[${this.getTimestamp()}] 📈 DeepL Quota: ${used.toLocaleString()}/${limit.toLocaleString()} chars (${percentUsed}% used)`);
      console.log(`[${this.getTimestamp()}] 💰 Remaining: ${remaining.toLocaleString()} characters`);

      if (remaining < 10000) { // Less than 10k characters remaining
        console.log(`[${this.getTimestamp()}] ⚠️ WARNING: Low quota remaining (${remaining.toLocaleString()} chars)`);
        return false;
      }

      return true;

    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Error checking DeepL quota:`, error.message);
      if (error.response?.status === 456) {
        console.log(`[${this.getTimestamp()}] 🚫 Quota exceeded - cannot continue with translations`);
        return false;
      }
      return true; // Continue if we can't check quota
    }
  }

  async loadCSV() {
    console.log(`[${this.getTimestamp()}] 📖 Loading CSV file: ${CONFIG.csvFile}`);
    
    if (!fs.existsSync(CONFIG.csvFile)) {
      throw new Error(`CSV file not found: ${CONFIG.csvFile}`);
    }
    
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

  async importEnglishMasters() {
    console.log(`[${this.getTimestamp()}] 🇺🇸 Importing English master questions...`);
    
    for (const questionData of this.questions) {
      try {
        this.stats.processed++;
        
        // Validate required fields
        if (!questionData.baseId || !questionData.question) {
          throw new Error(`Missing required fields: baseId or question`);
        }
        
        // Clamp level between 1 and 5
        const rawLevel = parseInt(questionData.level) || 1;
        const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);
        
        // Prepare data for Strapi
        const strapiData = {
          data: {
            baseId: questionData.baseId,
            topic: questionData.topic || 'General',
            level: clampedLevel,
            question: questionData.question,
            optionA: questionData.optionA || 'Option A',
            optionB: questionData.optionB || 'Option B', 
            optionC: questionData.optionC || 'Option C',
            optionD: questionData.optionD || 'Option D',
            correctOption: questionData.correctOption || 'A',
            explanation: questionData.explanation || 'No explanation provided'
          }
        };
        
        // Create English master question
        const response = await axios.post(
          `${CONFIG.strapi.apiUrl}/questions?locale=en`,
          strapiData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: CONFIG.strapi.timeout
          }
        );
        
        // Store the imported question data
        if (!this.importedQuestions.has(questionData.baseId)) {
          this.importedQuestions.set(questionData.baseId, {});
        }
        
        this.importedQuestions.get(questionData.baseId).en = {
          strapiId: response.data.data.id,
          documentId: response.data.data.documentId,
          originalData: questionData
        };
        
        this.stats.successful++;
        this.stats.languages.en++;
        
        if (this.stats.processed % 25 === 0) {
          console.log(`[${this.getTimestamp()}] 📈 Progress: ${this.stats.processed}/${this.questions.length} processed`);
        }
        
      } catch (error) {
        this.stats.errors++;
        console.error(`[${this.getTimestamp()}] ❌ Error importing ${questionData.baseId}:`, error.message);
      }
    }
    
    console.log(`[${this.getTimestamp()}] ✅ English masters imported: ${this.stats.languages.en}`);
  }

  async translateAndImportLocalizations() {
    console.log(`[${this.getTimestamp()}] 🌍 Starting translation and import process...`);
    
    // Check quota before starting
    const hasQuota = await this.checkDeepLQuota();
    if (!hasQuota) {
      console.log(`[${this.getTimestamp()}] 🛑 Insufficient DeepL quota - stopping translation process`);
      return;
    }
    
    for (const locale of Object.keys(CONFIG.locales)) {
      // Skip if already completed
      if (this.checkpoint.completedLanguages.includes(locale)) {
        console.log(`[${this.getTimestamp()}] ✅ ${locale.toUpperCase()} already completed - skipping`);
        continue;
      }

      console.log(`[${this.getTimestamp()}] 🚀 Processing ${locale.toUpperCase()} translations...`);
      
      const questionsToTranslate = Array.from(this.importedQuestions.entries());
      const batches = this.createBatches(questionsToTranslate, CONFIG.deepl.batchSize);
      let quotaExceeded = false;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[${this.getTimestamp()}] 📦 Processing batch ${i + 1}/${batches.length} for ${locale.toUpperCase()}`);
        
        try {
          const result = await this.processBatch(batch, locale);
          
          if (result.quotaExceeded) {
            console.log(`[${this.getTimestamp()}] 🚫 DeepL quota exceeded during batch ${i + 1} - stopping ${locale} translations`);
            quotaExceeded = true;
            break;
          }
          
          // Check quota periodically
          if (this.translationCount % CONFIG.deepl.quotaCheckInterval === 0) {
            const stillHasQuota = await this.checkDeepLQuota();
            if (!stillHasQuota) {
              console.log(`[${this.getTimestamp()}] 🚫 DeepL quota exhausted - stopping translations`);
              quotaExceeded = true;
              break;
            }
          }
          
          // Delay between batches to respect rate limits
          if (i < batches.length - 1) {
            console.log(`[${this.getTimestamp()}] ⏳ Waiting ${CONFIG.deepl.delayBetweenBatches/1000}s before next batch...`);
            await this.sleep(CONFIG.deepl.delayBetweenBatches);
          }
          
        } catch (error) {
          console.error(`[${this.getTimestamp()}] ❌ Error processing batch ${i + 1} for ${locale}:`, error.message);
          
          if (error.message.includes('456') || error.message.includes('quota')) {
            console.log(`[${this.getTimestamp()}] 🚫 Quota error detected - stopping ${locale} translations`);
            quotaExceeded = true;
            break;
          }
        }
      }
      
      if (!quotaExceeded) {
        // Mark language as completed
        this.checkpoint.completedLanguages.push(locale);
        this.saveCheckpoint();
        console.log(`[${this.getTimestamp()}] ✅ ${locale.toUpperCase()} translations completed: ${this.stats.languages[locale]}`);
      } else {
        console.log(`[${this.getTimestamp()}] ⏸️ ${locale.toUpperCase()} translations paused due to quota limits`);
        this.saveCheckpoint();
        break; // Stop processing other languages
      }
    }
  }

  async processBatch(batch, targetLocale) {
    let quotaExceeded = false;
    
    for (const [baseId, questionData] of batch) {
      try {
        const englishData = questionData.en;
        if (!englishData) continue;
        
        // Translate the question
        const translatedData = await this.translateQuestion(englishData.originalData, targetLocale);
        
        // Import translated question to Strapi
        await this.importTranslatedQuestion(translatedData, targetLocale, englishData.strapiId);
        
        this.stats.translations++;
        this.stats.languages[targetLocale]++;
        this.translationCount++;
        
      } catch (error) {
        this.stats.errors++;
        console.error(`[${this.getTimestamp()}] ❌ Error processing ${baseId} for ${targetLocale}:`, error.message);
        
        // Check if it's a quota error
        if (error.message.includes('456') || error.message.includes('quota')) {
          quotaExceeded = true;
          break;
        }
      }
    }
    
    return { quotaExceeded };
  }

  async translateQuestion(originalData, targetLocale) {
    const targetLang = CONFIG.locales[targetLocale];
    
    // Prepare texts for translation
    const textsToTranslate = [
      originalData.topic || '',
      originalData.question || '',
      originalData.optionA || '',
      originalData.optionB || '',
      originalData.optionC || '',
      originalData.optionD || '',
      originalData.explanation || ''
    ].filter(text => text.length > 0);
    
    if (textsToTranslate.length === 0) {
      throw new Error('No texts to translate');
    }
    
    let retries = 0;
    while (retries < CONFIG.deepl.maxRetries) {
      try {
        const response = await axios.post(
          CONFIG.deepl.apiUrl,
          {
            text: textsToTranslate,
            target_lang: targetLang,
            source_lang: 'EN'
          },
          {
            headers: {
              'Authorization': `DeepL-Auth-Key ${CONFIG.deepl.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: CONFIG.deepl.timeout
          }
        );
        
        const translations = response.data.translations.map(t => t.text);
        
        // Map translations back to fields
        let translationIndex = 0;
        const translatedData = {
          baseId: originalData.baseId,
          topic: originalData.topic ? translations[translationIndex++] : originalData.topic || '',
          question: originalData.question ? translations[translationIndex++] : originalData.question || '',
          optionA: originalData.optionA ? translations[translationIndex++] : originalData.optionA || '',
          optionB: originalData.optionB ? translations[translationIndex++] : originalData.optionB || '',
          optionC: originalData.optionC ? translations[translationIndex++] : originalData.optionC || '',
          optionD: originalData.optionD ? translations[translationIndex++] : originalData.optionD || '',
          explanation: originalData.explanation ? translations[translationIndex++] : originalData.explanation || '',
          level: originalData.level,
          correctOption: originalData.correctOption
        };
        
        return translatedData;
        
      } catch (error) {
        retries++;
        const statusCode = error.response?.status;
        
        if (statusCode === 429) {
          console.log(`[${this.getTimestamp()}] ⏳ Rate limit hit, waiting ${CONFIG.deepl.retryDelay/1000}s... (retry ${retries}/${CONFIG.deepl.maxRetries})`);
          await this.sleep(CONFIG.deepl.retryDelay);
        } else if (statusCode === 456) {
          console.log(`[${this.getTimestamp()}] 🚫 DeepL quota exceeded - cannot continue`);
          throw new Error('DeepL quota exceeded (456)');
        } else if (error.code === 'ENOTFOUND') {
          console.log(`[${this.getTimestamp()}] 🌐 Network connection error, waiting ${CONFIG.deepl.retryDelay/1000}s... (retry ${retries}/${CONFIG.deepl.maxRetries})`);
          await this.sleep(CONFIG.deepl.retryDelay);
        } else {
          console.error(`[${this.getTimestamp()}] ❌ DeepL translation error (retry ${retries}):`, error.message);
          if (retries >= CONFIG.deepl.maxRetries) throw error;
          await this.sleep(5000);
        }
        
        if (retries >= CONFIG.deepl.maxRetries) {
          throw error;
        }
      }
    }
  }

  async importTranslatedQuestion(translatedData, locale, englishQuestionId) {
    // Clamp level between 1 and 5
    const rawLevel = parseInt(translatedData.level) || 1;
    const clampedLevel = Math.min(Math.max(rawLevel, 1), 5);
    
    const strapiData = {
      data: {
        baseId: translatedData.baseId,
        topic: translatedData.topic,
        level: clampedLevel,
        question: translatedData.question,
        optionA: translatedData.optionA,
        optionB: translatedData.optionB,
        optionC: translatedData.optionC,
        optionD: translatedData.optionD,
        correctOption: translatedData.correctOption,
        explanation: translatedData.explanation
      }
    };
    
    try {
      const response = await axios.post(
        `${CONFIG.strapi.apiUrl}/questions?locale=${locale}`,
        strapiData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.strapi.timeout
        }
      );
      
      // Store the imported localization
      if (!this.importedQuestions.has(translatedData.baseId)) {
        this.importedQuestions.set(translatedData.baseId, {});
      }
      
      this.importedQuestions.get(translatedData.baseId)[locale] = {
        strapiId: response.data.data.id,
        documentId: response.data.data.documentId,
        translatedData: translatedData
      };
      
      return response.data.data;
      
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Failed to import ${locale} translation for ${translatedData.baseId}:`, error.message);
      throw error;
    }
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  async printFinalReport() {
    console.log(`\n[${this.getTimestamp()}] 📊 FINAL IMPORT REPORT`);
    console.log('='.repeat(60));
    console.log(`📈 Total questions processed: ${this.stats.processed}`);
    console.log(`✅ Total successful imports: ${this.stats.successful}`);
    console.log(`🌍 Total translations created: ${this.stats.translations}`);
    console.log(`❌ Total errors: ${this.stats.errors}`);
    console.log('\n🌍 By Language:');
    console.log(`  🇺🇸 English (master): ${this.stats.languages.en}`);
    console.log(`  🇧🇷 Portuguese: ${this.stats.languages.pt}`);
    console.log(`  🇪🇸 Spanish: ${this.stats.languages.es}`);
    console.log(`  🇫🇷 French: ${this.stats.languages.fr}`);
    
    const totalExpected = this.questions.length * 4; // 4 languages per question
    const totalImported = Object.values(this.stats.languages).reduce((a, b) => a + b, 0);
    const successRate = ((totalImported / totalExpected) * 100).toFixed(1);
    
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    console.log(`📊 Expected: ${totalExpected} total entries`);
    console.log(`📊 Imported: ${totalImported} total entries`);
    
    if (this.stats.errors > 0) {
      console.log(`\n⚠️  Note: ${this.stats.errors} errors occurred during import`);
      console.log('   Check the logs above for details');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Check Strapi admin: http://localhost:1337/admin');
    console.log('   2. Go to Content Manager > Question');
    console.log('   3. Use the locale filter to switch between languages');
    console.log('   4. Verify translations are accurate');
    
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 CSV Import with DeepL Auto-Translation');
  console.log('='.repeat(70));
  
  // Validate environment
  if (!CONFIG.deepl.apiKey) {
    console.error('❌ DEEPL_API_KEY environment variable not set');
    process.exit(1);
  }
  
  const importer = new CSVImporter();
  
  try {
    // Load CSV data
    await importer.loadCSV();
    
    // Import English master questions (skip if already done)
    if (!importer.checkpoint.englishCompleted) {
      await importer.importEnglishMasters();
      importer.checkpoint.englishCompleted = true;
      importer.saveCheckpoint();
    } else {
      console.log(`[${importer.getTimestamp()}] ✅ English masters already imported - skipping`);
    }
    
    // Translate and import localizations
    await importer.translateAndImportLocalizations();
    
    // Print final report
    await importer.printFinalReport();
    
    // Clean up checkpoint if everything completed
    if (importer.checkpoint.completedLanguages.length === 3) {
      console.log(`[${importer.getTimestamp()}] 🧹 All languages completed - cleaning up checkpoint`);
      if (fs.existsSync(CONFIG.checkpointFile)) {
        fs.unlinkSync(CONFIG.checkpointFile);
      }
    }
    
    console.log(`\n[${importer.getTimestamp()}] 🎉 Import completed successfully!`);
    
  } catch (error) {
    console.error(`[${importer.getTimestamp()}] 💥 Fatal error:`, error);
    importer.saveCheckpoint(); // Save progress before exiting
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the importer
main();
