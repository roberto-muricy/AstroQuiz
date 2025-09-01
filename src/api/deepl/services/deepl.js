/**
 * DeepL Service
 * Handles DeepL API integration for translation functionality
 */

'use strict';

const axios = require('axios');

module.exports = () => ({
  /**
   * Initialize DeepL service
   */
  async init() {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPL_API_KEY not found in environment variables');
    }
    console.log('✅ DeepL service initialized');
  },

  /**
   * Get API configuration
   */
  getConfig() {
    return {
      apiKey: process.env.DEEPL_API_KEY,
      apiUrl: process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2'
    };
  },

  /**
   * Test DeepL API connection
   */
  async testConnection() {
    try {
      const config = this.getConfig();
      if (!config.apiKey) {
        throw new Error('DEEPL_API_KEY not configured');
      }

      const response = await axios.get(`${config.apiUrl}/usage`, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ DeepL connection successful:', response.data);
      
      return { 
        success: true, 
        usage: response.data 
      };
    } catch (error) {
      console.error('❌ DeepL connection failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  /**
   * Get DeepL API usage statistics
   */
  async getUsage() {
    try {
      const config = this.getConfig();
      if (!config.apiKey) {
        throw new Error('DEEPL_API_KEY not configured');
      }

      const response = await axios.get(`${config.apiUrl}/usage`, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get DeepL usage:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  /**
   * Translate text using DeepL API
   */
  async translateText(text, targetLang, sourceLang = 'EN') {
    try {
      const config = this.getConfig();
      if (!config.apiKey) {
        throw new Error('DEEPL_API_KEY not configured');
      }

      if (!text || !targetLang) {
        throw new Error('Text and target language are required');
      }

      const response = await axios.post(`${config.apiUrl}/translate`, {
        text: [text],
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data.translations && response.data.translations.length > 0) {
        return response.data.translations[0].text;
      } else {
        throw new Error('No translation returned from DeepL API');
      }
    } catch (error) {
      console.error('❌ Translation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 456) {
        throw new Error('DeepL API quota exceeded');
      } else if (error.response?.status === 429) {
        throw new Error('DeepL API rate limit exceeded');
      } else {
        throw new Error(error.response?.data?.message || error.message);
      }
    }
  },

  /**
   * Translate multiple fields of a question
   */
  async translateQuestion(questionData, targetLang, sourceLang = 'EN') {
    const translatedData = {};
    const fieldsToTranslate = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation', 'topic'];
    
    for (const field of fieldsToTranslate) {
      if (questionData[field]) {
        try {
          translatedData[field] = await this.translateText(questionData[field], targetLang, sourceLang);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`Failed to translate field ${field}:`, error.message);
          translatedData[field] = questionData[field]; // Fallback to original
        }
      }
    }
    
    return translatedData;
  },

  /**
   * Reset usage counters (placeholder)
   */
  async resetCounters() {
    // This would reset internal counters if we were tracking them
    console.log('✅ Usage counters reset');
    return true;
  },

  /**
   * Check if DeepL API is configured
   */
  isConfigured() {
    return !!process.env.DEEPL_API_KEY;
  }
});