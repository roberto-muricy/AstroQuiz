require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  checkpointFile: path.join(__dirname, 'import-checkpoint.json'),
  strapi: {
    apiUrl: 'http://localhost:1337/api',
    timeout: 30000
  },
  deepl: {
    apiKey: process.env.DEEPL_API_KEY,
    apiUrl: 'https://api-free.deepl.com/v2/translate',
    usageUrl: 'https://api-free.deepl.com/v2/usage',
    timeout: 30000,
    batchSize: 1, // Very conservative for quota issues
    delayBetweenBatches: 15000, // 15 seconds between batches
    maxRetries: 3,
    retryDelay: 30000 // 30 seconds retry delay
  },
  locales: {
    'pt': 'PT-BR',
    'es': 'ES', 
    'fr': 'FR'
  }
};

class TranslationResumer {
  constructor() {
    this.checkpoint = this.loadCheckpoint();
    this.englishQuestions = new Map();
    this.stats = {
      translations: 0,
      errors: 0,
      languages: { pt: 0, es: 0, fr: 0 }
    };
  }

  loadCheckpoint() {
    try {
      if (fs.existsSync(CONFIG.checkpointFile)) {
        const data = fs.readFileSync(CONFIG.checkpointFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log(`[${this.getTimestamp()}] ⚠️ Could not load checkpoint:`, error.message);
    }
    throw new Error('No checkpoint file found. Run the main import script first.');
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

      const quota = response.data;
      const used = quota.character_count;
      const limit = quota.character_limit;
      const remaining = limit - used;
      const percentUsed = ((used / limit) * 100).toFixed(1);

      console.log(`[${this.getTimestamp()}] 📈 DeepL Quota: ${used.toLocaleString()}/${limit.toLocaleString()} chars (${percentUsed}% used)`);
      console.log(`[${this.getTimestamp()}] 💰 Remaining: ${remaining.toLocaleString()} characters`);

      return remaining > 5000; // Need at least 5k characters

    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Error checking DeepL quota:`, error.message);
      return false;
    }
  }

  async loadEnglishQuestions() {
    console.log(`[${this.getTimestamp()}] 📖 Loading English questions from Strapi...`);
    
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await axios.get(
          `${CONFIG.strapi.apiUrl}/questions?locale=en&pagination[page]=${page}&pagination[pageSize]=100`,
          { timeout: CONFIG.strapi.timeout }
        );
        
        const questions = response.data.data;
        
        for (const question of questions) {
          this.englishQuestions.set(question.baseId, {
            id: question.id,
            documentId: question.documentId,
            originalData: question
          });
        }
        
        hasMore = questions.length === 100;
        page++;
      }
      
      console.log(`[${this.getTimestamp()}] ✅ Loaded ${this.englishQuestions.size} English questions`);
      
    } catch (error) {
      console.error(`[${this.getTimestamp()}] ❌ Error loading English questions:`, error.message);
      throw error;
    }
  }

  async resumeTranslations() {
    console.log(`[${this.getTimestamp()}] 🔄 Resuming translations...`);
    
    // Check quota
    const hasQuota = await this.checkDeepLQuota();
    if (!hasQuota) {
      console.log(`[${this.getTimestamp()}] 🛑 Insufficient DeepL quota`);
      return;
    }

    const completedLanguages = this.checkpoint.completedLanguages || [];
    const remainingLanguages = Object.keys(CONFIG.locales).filter(lang => !completedLanguages.includes(lang));
    
    console.log(`[${this.getTimestamp()}] 📋 Completed languages: ${completedLanguages.join(', ') || 'none'}`);
    console.log(`[${this.getTimestamp()}] 📋 Remaining languages: ${remainingLanguages.join(', ') || 'none'}`);
    
    if (remainingLanguages.length === 0) {
      console.log(`[${this.getTimestamp()}] ✅ All translations already completed!`);
      return;
    }

    for (const locale of remainingLanguages) {
      console.log(`[${this.getTimestamp()}] 🚀 Processing ${locale.toUpperCase()} translations...`);
      
      const questionsArray = Array.from(this.englishQuestions.entries());
      const batches = this.createBatches(questionsArray, CONFIG.deepl.batchSize);
      let quotaExceeded = false;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[${this.getTimestamp()}] 📦 Processing batch ${i + 1}/${batches.length} for ${locale.toUpperCase()}`);
        
        try {
          const result = await this.processBatch(batch, locale);
          
          if (result.quotaExceeded) {
            console.log(`[${this.getTimestamp()}] 🚫 DeepL quota exceeded - stopping`);
            quotaExceeded = true;
            break;
          }
          
          // Delay between batches
          if (i < batches.length - 1) {
            console.log(`[${this.getTimestamp()}] ⏳ Waiting ${CONFIG.deepl.delayBetweenBatches/1000}s...`);
            await this.sleep(CONFIG.deepl.delayBetweenBatches);
          }
          
        } catch (error) {
          console.error(`[${this.getTimestamp()}] ❌ Error processing batch ${i + 1}:`, error.message);
          if (error.message.includes('456')) {
            quotaExceeded = true;
            break;
          }
        }
      }
      
      if (!quotaExceeded) {
        this.checkpoint.completedLanguages.push(locale);
        this.saveCheckpoint();
        console.log(`[${this.getTimestamp()}] ✅ ${locale.toUpperCase()} completed: ${this.stats.languages[locale]} translations`);
      } else {
        console.log(`[${this.getTimestamp()}] ⏸️ Paused due to quota limits`);
        this.saveCheckpoint();
        break;
      }
    }
  }

  async processBatch(batch, targetLocale) {
    let quotaExceeded = false;
    
    for (const [baseId, englishData] of batch) {
      try {
        // Translate
        const translatedData = await this.translateQuestion(englishData.originalData, targetLocale);
        
        // Import to Strapi
        await this.importTranslatedQuestion(translatedData, targetLocale);
        
        this.stats.translations++;
        this.stats.languages[targetLocale]++;
        
      } catch (error) {
        this.stats.errors++;
        console.error(`[${this.getTimestamp()}] ❌ Error processing ${baseId}:`, error.message);
        
        if (error.message.includes('456')) {
          quotaExceeded = true;
          break;
        }
      }
    }
    
    return { quotaExceeded };
  }

  async translateQuestion(originalData, targetLocale) {
    const targetLang = CONFIG.locales[targetLocale];
    
    const textsToTranslate = [
      originalData.topic || '',
      originalData.question || '',
      originalData.optionA || '',
      originalData.optionB || '',
      originalData.optionC || '',
      originalData.optionD || '',
      originalData.explanation || ''
    ].filter(text => text.length > 0);
    
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
        
        let translationIndex = 0;
        return {
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
        
      } catch (error) {
        retries++;
        const statusCode = error.response?.status;
        
        if (statusCode === 456) {
          throw new Error('DeepL quota exceeded (456)');
        } else if (statusCode === 429) {
          console.log(`[${this.getTimestamp()}] ⏳ Rate limit, waiting... (retry ${retries})`);
          await this.sleep(CONFIG.deepl.retryDelay);
        } else {
          console.error(`[${this.getTimestamp()}] ❌ Translation error (retry ${retries}):`, error.message);
          if (retries >= CONFIG.deepl.maxRetries) throw error;
          await this.sleep(10000);
        }
      }
    }
  }

  async importTranslatedQuestion(translatedData, locale) {
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
    
    const response = await axios.post(
      `${CONFIG.strapi.apiUrl}/questions?locale=${locale}`,
      strapiData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: CONFIG.strapi.timeout
      }
    );
    
    return response.data.data;
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

  printFinalReport() {
    console.log(`\n[${this.getTimestamp()}] 📊 RESUME TRANSLATION REPORT`);
    console.log('='.repeat(60));
    console.log(`🌍 Total new translations: ${this.stats.translations}`);
    console.log(`❌ Total errors: ${this.stats.errors}`);
    console.log('\n🌍 New Translations by Language:');
    console.log(`  🇧🇷 Portuguese: ${this.stats.languages.pt}`);
    console.log(`  🇪🇸 Spanish: ${this.stats.languages.es}`);
    console.log(`  🇫🇷 French: ${this.stats.languages.fr}`);
    
    const completed = this.checkpoint.completedLanguages || [];
    console.log(`\n✅ Completed Languages: ${completed.join(', ') || 'none'}`);
    
    const remaining = Object.keys(CONFIG.locales).filter(lang => !completed.includes(lang));
    if (remaining.length > 0) {
      console.log(`⏸️ Remaining Languages: ${remaining.join(', ')}`);
      console.log(`\n💡 Run this script again when you have more DeepL quota`);
    } else {
      console.log(`\n🎉 All translations completed!`);
    }
    
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🔄 Resume DeepL Translations');
  console.log('='.repeat(50));
  
  if (!CONFIG.deepl.apiKey) {
    console.error('❌ DEEPL_API_KEY environment variable not set');
    process.exit(1);
  }
  
  const resumer = new TranslationResumer();
  
  try {
    await resumer.loadEnglishQuestions();
    await resumer.resumeTranslations();
    resumer.printFinalReport();
    
  } catch (error) {
    console.error(`[${resumer.getTimestamp()}] 💥 Fatal error:`, error);
    resumer.saveCheckpoint();
    process.exit(1);
  }
}

main();
