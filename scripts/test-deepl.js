const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testDeepL() {
  console.log('🧪 Testing DeepL connection on Railway...');
  console.log('');

  try {
    const response = await axios.get(
      PRODUCTION_URL + '/api/questions/test-deepl',
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
        timeout: 30000,
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('');
      console.log('✅ DeepL connection successful!');
      console.log('   Key type:', response.data.keyType);
      console.log('   URL:', response.data.url);
      console.log('   Character usage:', response.data.usage.character_count, '/', response.data.usage.character_limit);
    } else {
      console.log('');
      console.log('❌ DeepL connection failed!');
      console.log('   Key type:', response.data.keyType);
      console.log('   URL:', response.data.url);
      console.log('   Error:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Test request failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/test-deepl.js');
  process.exit(1);
}

testDeepL();
