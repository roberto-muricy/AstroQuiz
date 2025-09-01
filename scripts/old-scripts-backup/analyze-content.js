#!/usr/bin/env node

/**
 * Analyze question content to understand language patterns
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

async function analyzeContent() {
  try {
    console.log('🔍 Analyzing question content patterns...\n');
    
    // Get a sample of questions
    const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
      params: {
        'pagination[limit]': 20,
        'sort': 'id:desc'
      }
    });
    
    const questions = response.data.data;
    
    console.log('📝 Sample questions analysis:');
    console.log('='.repeat(100));
    
    questions.forEach((q, index) => {
      const content = q.question || '';
      const optionA = q.optionA || '';
      
      console.log(`\n${index + 1}. ID: ${q.id} | Current Locale: ${q.locale}`);
      console.log(`   Question: ${content.substring(0, 80)}...`);
      console.log(`   Option A: ${optionA.substring(0, 50)}...`);
      
      // Manual language detection
      let detectedLang = 'unknown';
      
      if (/\b(qual|como|onde|quando|por que|quantos?|o que|de acordo com)\b/i.test(content) ||
          /\b(universo|galáxia|estrela|planeta|sistema solar)\b/i.test(content)) {
        detectedLang = 'pt';
      } else if (/\b(cuál|cómo|dónde|cuándo|por qué|cuántos?|qué|de acuerdo con)\b/i.test(content) ||
                 /\b(universo|galaxia|estrella|planeta|sistema solar)\b/i.test(content)) {
        detectedLang = 'es';
      } else if (/\b(quel|quelle|comment|où|quand|pourquoi|combien|qu'est-ce que|selon)\b/i.test(content) ||
                 /\b(univers|galaxie|étoile|planète|système solaire)\b/i.test(content)) {
        detectedLang = 'fr';
      } else if (/\b(what|how|where|when|why|which|according to)\b/i.test(content) ||
                 /\b(universe|galaxy|star|planet|solar system)\b/i.test(content)) {
        detectedLang = 'en';
      }
      
      console.log(`   Detected: ${detectedLang} | Match: ${detectedLang !== 'unknown' ? '✅' : '❌'}`);
    });
    
    console.log('\n' + '='.repeat(100));
    
    // Get questions by ID ranges to understand the pattern
    console.log('\n🔍 Checking ID ranges for language patterns...\n');
    
    const ranges = [
      { name: 'Very Recent (7000+)', min: 7000, max: 10000 },
      { name: 'Recent (5000-7000)', min: 5000, max: 7000 },
      { name: 'Middle (3000-5000)', min: 3000, max: 5000 },
      { name: 'Old (1000-3000)', min: 1000, max: 3000 },
      { name: 'Very Old (0-1000)', min: 0, max: 1000 }
    ];
    
    for (const range of ranges) {
      try {
        const response = await axios.get(`${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`, {
          params: {
            'filters[id][$gte]': range.min,
            'filters[id][$lt]': range.max,
            'pagination[limit]': 5
          }
        });
        
        const questions = response.data.data;
        const total = response.data.meta.pagination.total;
        
        console.log(`📊 ${range.name}: ${total} questions`);
        
        if (questions.length > 0) {
          questions.forEach((q, idx) => {
            const content = q.question ? q.question.substring(0, 60) : 'N/A';
            console.log(`   ${idx + 1}. ID ${q.id}: ${content}...`);
          });
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ Error checking ${range.name}: ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeContent();