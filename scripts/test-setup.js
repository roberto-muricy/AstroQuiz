// Jest setup file for API testing
const axios = require('axios');

// Global test configuration
global.API_BASE_URL = 'http://localhost:1337';
global.API_PATH = '/api';

// Test timeout for all tests (30 seconds)
jest.setTimeout(30000);

// Mock data for testing
global.MOCK_QUESTION = {
  baseId: 'test_00001',
  topic: 'Test Topic',
  level: 3,
  question: 'What is a test question?',
  optionA: 'Option A',
  optionB: 'Option B', 
  optionC: 'Option C',
  optionD: 'Option D',
  correctOption: 'A',
  explanation: 'This is a test explanation.',
  locale: 'en'
};

global.LOCALES = ['en', 'pt', 'es', 'fr'];

// Helper function to check if Strapi is running
global.checkStrapiHealth = async () => {
  try {
    const response = await axios.get(`${global.API_BASE_URL}${global.API_PATH}/questions?pagination[pageSize]=1`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Helper function to wait for a condition
global.waitFor = (conditionFn, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = async () => {
      try {
        if (await conditionFn()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      } catch (error) {
        reject(error);
      }
    };
    check();
  });
};

// Global beforeAll to check Strapi connection
beforeAll(async () => {
  console.log('🔍 Checking Strapi connection...');
  const isHealthy = await global.checkStrapiHealth();
  if (!isHealthy) {
    console.warn('⚠️  Strapi is not running or not accessible. Some tests may fail.');
    console.log('💡 Make sure to start Strapi with: npm run develop');
  } else {
    console.log('✅ Strapi is running and accessible');
  }
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
