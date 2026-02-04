const axios = require('axios');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';

async function testDirectly() {
  if (!DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY environment variable is required');
    console.error('   Get it from Railway and run:');
    console.error('   DEEPL_API_KEY="key-here" node scripts/test-deepl-direct.js');
    process.exit(1);
  }

  console.log('🧪 Testing DeepL API directly...');
  console.log('');

  // Detect key type
  const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
  const DEEPL_API_URL = isFreeKey
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2';

  console.log('Key type:', isFreeKey ? 'Free' : 'Pro');
  console.log('URL:', DEEPL_API_URL);
  console.log('Key (first 10):', DEEPL_API_KEY.substring(0, 10) + '...');
  console.log('');

  try {
    // Test 1: Check usage
    console.log('Test 1: Checking API usage...');
    const usageResponse = await axios.get(DEEPL_API_URL + '/usage', {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
      },
      timeout: 10000,
    });

    console.log('✅ Usage check successful!');
    console.log('   Character count:', usageResponse.data.character_count);
    console.log('   Character limit:', usageResponse.data.character_limit);
    console.log('');

    // Test 2: Translate a simple text
    console.log('Test 2: Translating sample text...');
    const translateResponse = await axios.post(
      DEEPL_API_URL + '/translate',
      {
        text: ['Hello world'],
        source_lang: 'EN',
        target_lang: 'PT',
      },
      {
        headers: {
          'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Translation successful!');
    console.log('   Original: Hello world');
    console.log('   Translated:', translateResponse.data.translations[0].text);
    console.log('');
    console.log('🎉 DeepL API is working correctly!');
    console.log('   The key should work in production too.');
  } catch (error) {
    console.error('❌ DeepL API test failed!');
    console.error('');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('  - Key is invalid or expired');
    console.error('  - Wrong URL for key type (Free vs Pro)');
    console.error('  - Account not activated');
    console.error('  - Billing issue');
    process.exit(1);
  }
}

testDirectly();
