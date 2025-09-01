#!/usr/bin/env node

/**
 * Robust CSV Translation with DeepL API
 * Uses proper CSV parsing libraries
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

const CONFIG = {
  deepl: {
    apiUrl: 'https://api-free.deepl.com/v2/translate',
    apiKey: process.env.DEEPL_API_KEY,
    languages: {
      pt: 'PT-BR',
      es: 'ES', 
      fr: 'FR'
    }
  },
  batchSize: 3, // Reduce batch size to 3 texts at once for rate limiting
  delayBetweenBatches: 8000, // Increase delay to 8 seconds between batches
  maxRetries: 3, // Maximum number of retries for failed requests
  retryDelay: 15000 // 15 seconds delay before retry
};

class RobustCSVTranslator {
  constructor() {
    this.stats = {
      total: 0,
      translated: { pt: 0, es: 0, fr: 0 },
      errors: 0
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Check if DeepL API key is available
   */
  checkApiKey() {
    if (!CONFIG.deepl.apiKey) {
      this.log('❌ DEEPL_API_KEY environment variable not set');
      this.log('💡 Please set your DeepL API key:');
      this.log('   export DEEPL_API_KEY="your-api-key-here"');
      throw new Error('DeepL API key not found');
    }
    this.log('✅ DeepL API key found');
  }

  /**
   * Read CSV file using proper CSV parser
   */
  async readCSV(filePath) {
    this.log(`📖 Reading CSV file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const records = [];
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      parse(csvContent, {
        columns: true, // Use first line as column headers
        skip_empty_lines: true,
        trim: true
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          this.log(`✅ Loaded ${data.length} questions from CSV`);
          this.stats.total = data.length;
          resolve(data);
        }
      });
    });
  }

  /**
   * Translate text using DeepL API with retry logic
   */
  async translateText(texts, targetLanguage, attempt = 1) {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty texts
    const nonEmptyTexts = texts.filter(text => text && text.trim());
    if (nonEmptyTexts.length === 0) {
      return texts.map(() => '');
    }

    try {
      const response = await axios.post(CONFIG.deepl.apiUrl, {
        text: nonEmptyTexts,
        target_lang: CONFIG.deepl.languages[targetLanguage],
        source_lang: 'EN'
      }, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${CONFIG.deepl.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translations = response.data.translations.map(t => t.text);
      this.stats.translated[targetLanguage] += translations.length;
      this.stats.charactersTranslated += nonEmptyTexts.join('').length;
      
      // Map back to original array (filling empty positions)
      let translationIndex = 0;
      return texts.map(text => {
        if (text && text.trim()) {
          return translations[translationIndex++];
        }
        return '';
      });

    } catch (error) {
      // Handle rate limiting (429) with retry logic
      if (error.response?.status === 429 && attempt <= CONFIG.maxRetries) {
        this.log(`⏳ Rate limit hit (attempt ${attempt}/${CONFIG.maxRetries}). Waiting ${CONFIG.retryDelay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        return this.translateText(texts, targetLanguage, attempt + 1);
      }
      
      this.log(`❌ Translation error (attempt ${attempt}): ${error.message}`);
      this.stats.errors += texts.length;
      
      // If we've exhausted retries, return original English text instead of empty
      return texts.map(text => text || '');
    }
  }

  /**
   * Translate questions to target language
   */
  async translateQuestions(questions, targetLanguage) {
    this.log(`\\n🌍 Translating ${questions.length} questions to ${targetLanguage.toUpperCase()}...`);
    
    const translatedQuestions = [...questions]; // Copy original data
    
    // Process in batches
    for (let i = 0; i < questions.length; i += CONFIG.batchSize) {
      const batch = questions.slice(i, i + CONFIG.batchSize);
      const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / CONFIG.batchSize);
      
      this.log(`   📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} questions)...`);
      
      // Collect texts to translate from this batch
      const questionsToTranslate = batch.map(q => q.question || '');
      const optionsAToTranslate = batch.map(q => q.optionA || '');
      const optionsBToTranslate = batch.map(q => q.optionB || '');
      const optionsCToTranslate = batch.map(q => q.optionC || '');
      const optionsDToTranslate = batch.map(q => q.optionD || '');
      const explanationsToTranslate = batch.map(q => q.explanation || '');
      const topicsToTranslate = batch.map(q => q.topic || '');

      // Translate all fields
      const [
        translatedQuestions_,
        translatedOptionsA,
        translatedOptionsB, 
        translatedOptionsC,
        translatedOptionsD,
        translatedExplanations,
        translatedTopics
      ] = await Promise.all([
        this.translateText(questionsToTranslate, targetLanguage),
        this.translateText(optionsAToTranslate, targetLanguage),
        this.translateText(optionsBToTranslate, targetLanguage),
        this.translateText(optionsCToTranslate, targetLanguage),
        this.translateText(optionsDToTranslate, targetLanguage),
        this.translateText(explanationsToTranslate, targetLanguage),
        this.translateText(topicsToTranslate, targetLanguage)
      ]);

      // Update the translated questions with new language data
      for (let j = 0; j < batch.length; j++) {
        const originalIndex = i + j;
        translatedQuestions[originalIndex] = {
          ...translatedQuestions[originalIndex],
          [`question_${targetLanguage}`]: translatedQuestions_[j],
          [`optionA_${targetLanguage}`]: translatedOptionsA[j],
          [`optionB_${targetLanguage}`]: translatedOptionsB[j],
          [`optionC_${targetLanguage}`]: translatedOptionsC[j],
          [`optionD_${targetLanguage}`]: translatedOptionsD[j],
          [`explanation_${targetLanguage}`]: translatedExplanations[j],
          [`topic_${targetLanguage}`]: translatedTopics[j]
        };
      }
      
      // Delay between batches
      if (i + CONFIG.batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
      }
    }
    
    this.log(`   ✅ ${targetLanguage.toUpperCase()} translation completed`);
    return translatedQuestions;
  }

  /**
   * Save translated CSV
   */
  async saveTranslatedCSV(questions, originalFilePath) {
    this.log('\\n💾 Saving translated CSV...');
    
    const translatedFilePath = originalFilePath.replace('.csv', '-translated.csv');
    
    // Prepare headers
    const baseHeaders = ['baseId', 'topic', 'level', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'explanation', 'language'];
    const translatedHeaders = [];
    
    // Add translated columns
    for (const lang of ['pt', 'es', 'fr']) {
      translatedHeaders.push(
        `question_${lang}`,
        `optionA_${lang}`,
        `optionB_${lang}`,
        `optionC_${lang}`,
        `optionD_${lang}`,
        `explanation_${lang}`,
        `topic_${lang}`
      );
    }
    
    const allHeaders = [...baseHeaders, ...translatedHeaders];
    
    return new Promise((resolve, reject) => {
      stringify(questions, {
        header: true,
        columns: allHeaders
      }, (err, csvContent) => {
        if (err) {
          reject(err);
        } else {
          try {
            fs.writeFileSync(translatedFilePath, csvContent, 'utf8');
            this.log(`✅ Translated CSV saved: ${translatedFilePath}`);
            resolve(translatedFilePath);
          } catch (writeError) {
            this.log(`❌ Error saving translated CSV: ${writeError.message}`);
            reject(writeError);
          }
        }
      });
    });
  }

  /**
   * Show translation summary
   */
  showSummary(translatedFilePath) {
    this.log('\\n' + '='.repeat(70));
    this.log('🌍 CSV TRANSLATION COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 TRANSLATION STATS:`);
    this.log(`   Total questions: ${this.stats.total}`);
    Object.entries(this.stats.translated).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()} translations: ${count} texts`);
    });
    this.log(`   Errors: ${this.stats.errors}`);
    
    this.log(`\\n📄 OUTPUT FILE:`);
    this.log(`   Translated CSV: ${translatedFilePath}`);
    
    this.log(`\\n💡 NEXT STEPS:`);
    this.log(`   1. Review the translated CSV file`);
    this.log(`   2. Make any manual corrections if needed`);
    this.log(`   3. Run the import script to create PT/ES/FR questions in Strapi`);
    
    this.log('='.repeat(70));
  }

  /**
   * Run complete translation
   */
  async runTranslation() {
    try {
      this.checkApiKey();
      
      const csvFilePath = path.join(__dirname, 'AstroQuiz Questions - en.csv');
      let questions = await this.readCSV(csvFilePath);
      
      // Translate to all languages
      for (const language of ['pt', 'es', 'fr']) {
        questions = await this.translateQuestions(questions, language);
      }
      
      const translatedFilePath = await this.saveTranslatedCSV(questions, csvFilePath);
      this.showSummary(translatedFilePath);
      
    } catch (error) {
      this.log(`💥 Translation failed: ${error.message}`);
      throw error;
    }
  }
}

// Run translation
async function main() {
  const translator = new RobustCSVTranslator();
  await translator.runTranslation();
}

main().catch(console.error);
