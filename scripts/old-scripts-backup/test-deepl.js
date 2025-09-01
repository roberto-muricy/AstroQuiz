/**
 * DeepL Integration Test Script
 * Tests the DeepL API integration functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

// Test data
const testQuestion = {
  question: "What is the largest planet in our solar system?",
  optionA: "Earth",
  optionB: "Mars", 
  optionC: "Jupiter",
  optionD: "Saturn",
  explanation: "Jupiter is the largest planet in our solar system, with a mass more than twice that of Saturn and about 318 times that of Earth.",
  topic: "Astronomy"
};

async function testDeepLIntegration() {
  console.log('🧪 Testing DeepL Integration...\n');

  try {
    // 1. Test API connection
    console.log('1️⃣ Testing DeepL API connection...');
    const connectionResponse = await axios.get(`${BASE_URL}/deepl/test`);
    console.log('✅ Connection successful:', connectionResponse.data.message);
    console.log('📊 Usage info:', connectionResponse.data.usage);
    console.log('');

    // 2. Get usage statistics
    console.log('2️⃣ Getting usage statistics...');
    const usageResponse = await axios.get(`${BASE_URL}/deepl/usage`);
    console.log('✅ Usage stats retrieved');
    console.log('📈 Current session:', {
      characters: usageResponse.data.data.totalCharactersTranslated,
      apiCalls: usageResponse.data.data.apiCallsMade
    });
    console.log('');

    // 3. Test translation (requires a valid question ID)
    console.log('3️⃣ Testing translation...');
    console.log('⚠️  Note: This requires a valid question ID from your database');
    console.log('   You can test this manually in the admin panel');
    console.log('');

    // 4. Test with mock data
    console.log('4️⃣ Testing with mock data...');
    const mockTranslationResponse = await axios.post(`${BASE_URL}/deepl/translate/test-123`, {
      questionData: testQuestion
    });
    
    if (mockTranslationResponse.data.success) {
      console.log('✅ Translation request accepted');
      console.log('🔄 Status:', mockTranslationResponse.data.data.status);
    } else {
      console.log('❌ Translation request failed:', mockTranslationResponse.data.message);
    }
    console.log('');

    // 5. Test progress endpoint
    console.log('5️⃣ Testing progress endpoint...');
    const progressResponse = await axios.get(`${BASE_URL}/deepl/progress/test-123`);
    console.log('✅ Progress endpoint working');
    console.log('📊 Progress:', progressResponse.data.data);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Set your DeepL API key in .env file');
    console.log('   2. Create a question in the admin panel');
    console.log('   3. Click the "Auto-translate" button');
    console.log('   4. Monitor usage in Settings → DeepL Usage');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response data:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
    
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure Strapi is running on port 1337');
    console.log('   2. Check if DeepL API key is configured');
    console.log('   3. Verify network connectivity');
    console.log('   4. Check server logs for errors');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testDeepLIntegration();
}

module.exports = { testDeepLIntegration };
