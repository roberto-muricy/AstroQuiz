const axios = require('axios');

class DeepLService {
  constructor() {
    this.apiKey = process.env.DEEPL_API_KEY;
    this.apiUrl = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2';
    this.usage = null;
  }

  async init() {
    if (!this.apiKey) {
      throw new Error('DEEPL_API_KEY not found in environment variables');
    }
    console.log('✅ DeepL service initialized');
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.apiUrl}/usage`, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.usage = response.data;
      console.log('✅ DeepL connection successful:', this.usage);
      
      return { 
        success: true, 
        usage: this.usage 
      };
    } catch (error) {
      console.error('❌ DeepL connection failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async translateText(text, targetLang, sourceLang = 'EN') {
    try {
      const response = await axios.post(`${this.apiUrl}/translate`, {
        text: [text],
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translatedText = response.data.translations[0].text;
      console.log(`🌍 Translated "${text.substring(0, 30)}..." to ${targetLang}: "${translatedText.substring(0, 30)}..."`);
      
      return translatedText;
    } catch (error) {
      console.error(`❌ Translation failed for ${targetLang}:`, error.response?.data || error.message);
      throw new Error(`Translation failed for ${targetLang}: ${error.response?.data?.message || error.message}`);
    }
  }

  async batchTranslate(texts, targetLang, sourceLang = 'EN') {
    try {
      const response = await axios.post(`${this.apiUrl}/translate`, {
        text: texts,
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translations = response.data.translations.map(t => t.text);
      console.log(`🌍 Batch translated ${texts.length} texts to ${targetLang}`);
      
      return translations;
    } catch (error) {
      console.error(`❌ Batch translation failed for ${targetLang}:`, error.response?.data || error.message);
      throw new Error(`Batch translation failed for ${targetLang}: ${error.response?.data?.message || error.message}`);
    }
  }

  async translateQuestion(question) {
    console.log('🌍 Starting question translation...');
    
    const fieldsToTranslate = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation', 'topic'];
    const sourceTexts = fieldsToTranslate.map(field => question[field] || '');
    
    const targetLanguages = {
      'PT-BR': 'pt',
      'ES': 'es', 
      'FR': 'fr'
    };
    
    const translations = {};
    
    for (const [deeplLang, strapiLocale] of Object.entries(targetLanguages)) {
      try {
        console.log(`🔄 Translating to ${deeplLang} (${strapiLocale})...`);
        
        const translatedTexts = await this.batchTranslate(sourceTexts, deeplLang, 'EN');
        
        translations[strapiLocale] = {
          question: translatedTexts[0] || question.question,
          optionA: translatedTexts[1] || question.optionA,
          optionB: translatedTexts[2] || question.optionB,
          optionC: translatedTexts[3] || question.optionC,
          optionD: translatedTexts[4] || question.optionD,
          explanation: translatedTexts[5] || question.explanation,
          topic: translatedTexts[6] || question.topic,
          baseId: question.baseId,
          level: question.level,
          correctOption: question.correctOption
        };
        
        console.log(`✅ ${strapiLocale} translation completed`);
        
      } catch (error) {
        console.error(`❌ Failed to translate to ${strapiLocale}:`, error.message);
        throw error;
      }
    }
    
    return translations;
  }

  async getUsage() {
    try {
      const response = await axios.get(`${this.apiUrl}/usage`, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.usage = response.data;
      return this.usage;
    } catch (error) {
      console.error('❌ Failed to get usage:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = DeepLService;
