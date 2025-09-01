/**
 * Simple DeepL Test Script
 * Tests DeepL API integration directly
 */

require('dotenv').config();
const axios = require('axios');

// Test DeepL API directly
async function testDeepLDirectly() {
  console.log('🧪 Testing DeepL API directly...\n');

  const apiKey = process.env.DEEPL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ DEEPL_API_KEY not found in environment variables');
    console.log('💡 Make sure you have set the API key in your .env file');
    return;
  }

  console.log('✅ API Key found in environment variables');

  try {
    // Test DeepL API connection
    console.log('1️⃣ Testing DeepL API connection...');
    
    const response = await axios.get('https://api-free.deepl.com/v2/usage', {
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ DeepL API connection successful!');
    console.log('📊 Usage info:', response.data);
    console.log('');

    // Test translation
    console.log('2️⃣ Testing translation...');
    
    const translationResponse = await axios.post('https://api-free.deepl.com/v2/translate', {
      text: ['Hello, how are you?'],
      source_lang: 'EN',
      target_lang: 'PT'
    }, {
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Translation successful!');
    console.log('🌐 Translated text:', translationResponse.data.translations[0].text);
    console.log('');

    console.log('🎉 All DeepL tests passed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Your DeepL API is working correctly');
    console.log('   2. You can now use the translation features in Strapi');
    console.log('   3. Access the admin panel at http://localhost:1337/admin');
    console.log('   4. Create a question and use the Auto-translate button');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📄 Response data:', error.response.data);
      console.error('📊 Status:', error.response.status);
      
      if (error.response.status === 403) {
        console.error('🔑 This usually means the API key is invalid or expired');
      }
    }
    
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check if your API key is correct');
    console.log('   2. Verify your DeepL account is active');
    console.log('   3. Check if you have remaining API quota');
    console.log('   4. Ensure network connectivity');
  }
}

// Run the test
testDeepLDirectly();
