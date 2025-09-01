#!/usr/bin/env node

/**
 * Translate CSV file using DeepL API
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
  batchSize: 50, // Translate 50 texts at once
  delayBetweenBatches: 1000 // 1 second delay
};

class CSVTranslator {
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
   * Read CSV file
   */
  readCSV(filePath) {
    this.log(`📖 Reading CSV file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\\n');
    const header = lines[0].split(',');
    
    const data = lines.slice(1).filter(line => line.trim()).map(line => {
      // Simple CSV parsing (assuming quoted fields)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      // Create object from header and values
      const row = {};
      header.forEach((col, index) => {
        row[col.replace(/"/g, '')] = values[index] ? values[index].replace(/"/g, '').replace(/""/g, '"') : '';
      });
      
      return row;
    });
    
    this.stats.total = data.length;
    this.log(`✅ Loaded ${data.length} questions from CSV`);
    
    return { header, data };
  }

  /**
   * Translate text using DeepL
   */
  async translateText(texts, targetLang) {
    try {
      const response = await axios.post(CONFIG.deepl.apiUrl, null, {
        params: {
          auth_key: CONFIG.deepl.apiKey,
          text: texts,
          target_lang: CONFIG.deepl.languages[targetLang],
          source_lang: 'EN'
        }
      });
      
      return response.data.translations.map(t => t.text);
    } catch (error) {
      this.log(`❌ Translation error for ${targetLang}: ${error.response?.data?.message || error.message}`);
      this.stats.errors++;
      return texts.map(() => ''); // Return empty strings on error
    }
  }

  /**
   * Translate all questions for one language
   */
  async translateLanguage(data, language) {
    this.log(`\\n🌍 Translating to ${language.toUpperCase()}...`);
    
    const fieldsToTranslate = ['question_en', 'optionA_en', 'optionB_en', 'optionC_en', 'optionD_en', 'explanation_en', 'topic_en'];
    const targetFields = fieldsToTranslate.map(field => field.replace('_en', `_${language}`));
    
    for (const field of fieldsToTranslate) {
      const targetField = field.replace('_en', `_${language}`);
      this.log(`   📝 Translating ${field} -> ${targetField}...`);
      
      // Get all texts for this field
      const texts = data.map(row => row[field] || '').filter(text => text.trim());
      
      if (texts.length === 0) {
        this.log(`   ⚠️ No texts to translate for ${field}`);
        continue;
      }
      
      // Translate in batches
      const batchSize = CONFIG.batchSize;
      const translations = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchTranslations = await this.translateText(batch, language);
        translations.push(...batchTranslations);
        
        this.log(`   ✅ Translated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)} (${batch.length} texts)`);
        
        // Delay between batches to respect API limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
      }
      
      // Apply translations back to data
      let translationIndex = 0;
      data.forEach(row => {
        if (row[field] && row[field].trim()) {
          row[targetField] = translations[translationIndex] || '';
          translationIndex++;
        }
      });
      
      this.stats.translated[language] += translations.length;
    }
    
    this.log(`   ✅ ${language.toUpperCase()} translation completed`);
  }

  /**
   * Save translated CSV
   */
  saveTranslatedCSV(header, data, originalFilePath) {
    const translatedFilePath = originalFilePath.replace('.csv', '-translated.csv');
    
    this.log(`\\n💾 Saving translated CSV...`);
    
    // Rebuild CSV content
    const csvHeader = header.join(',');
    const csvRows = data.map(row => {
      return header.map(col => {
        const value = row[col] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = value.replace(/"/g, '""');
        return value.includes(',') || value.includes('"') || value.includes('\\n') ? `"${escaped}"` : escaped;
      }).join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\\n');
    
    try {
      fs.writeFileSync(translatedFilePath, csvContent, 'utf8');
      this.log(`✅ Translated CSV saved: ${translatedFilePath}`);
      return translatedFilePath;
    } catch (error) {
      this.log(`❌ Error saving translated CSV: ${error.message}`);
      throw error;
    }
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
      const { header, data } = this.readCSV(csvFilePath);
      
      // Translate to all languages
      for (const language of ['pt', 'es', 'fr']) {
        await this.translateLanguage(data, language);
      }
      
      const translatedFilePath = this.saveTranslatedCSV(header, data, csvFilePath);
      this.showSummary(translatedFilePath);
      
    } catch (error) {
      this.log(`💥 Translation failed: ${error.message}`);
      throw error;
    }
  }
}

// Run translation
async function main() {
  const translator = new CSVTranslator();
  await translator.runTranslation();
}

main().catch(console.error);
