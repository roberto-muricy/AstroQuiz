/**
 * DeepL Routes
 * API endpoints for DeepL translation functionality
 */

module.exports = {
  routes: [
    // Test DeepL API connection
    {
      method: 'GET',
      path: '/deepl/test',
      handler: 'deepl.testConnection',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Get DeepL usage statistics
    {
      method: 'GET',
      path: '/deepl/usage',
      handler: 'deepl.getUsage',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Translate text directly
    {
      method: 'POST',
      path: '/deepl/translate',
      handler: 'deepl.translateText',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Translate a question
    {
      method: 'POST',
      path: '/deepl/translate-question/:questionId',
      handler: 'deepl.translateQuestion',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Get translation progress
    {
      method: 'GET',
      path: '/deepl/progress/:questionId',
      handler: 'deepl.getTranslationProgress',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Reset usage counters
    {
      method: 'POST',
      path: '/deepl/reset-counters',
      handler: 'deepl.resetCounters',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
