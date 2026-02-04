const axios = require('axios');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';

async function checkQuota() {
  const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
  const DEEPL_URL = isFreeKey ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';

  console.log('Checking DeepL quota...');
  console.log('Using:', isFreeKey ? 'Free API' : 'Pro API');
  console.log('');

  try {
    const response = await axios.get(DEEPL_URL + '/usage', {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
      },
    });

    console.log('✅ API Key is valid');
    console.log('Character count:', response.data.character_count);
    console.log('Character limit:', response.data.character_limit);
    console.log('Remaining:', response.data.character_limit - response.data.character_count);
    console.log('');
    console.log('Usage:', ((response.data.character_count / response.data.character_limit) * 100).toFixed(2) + '%');
  } catch (error) {
    console.log('❌ Failed to check quota');
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

checkQuota();
