const axios = require('axios');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';

async function testProKey() {
  console.log('Testing DeepL Pro API key...');
  console.log('Key:', DEEPL_API_KEY);
  console.log('');

  // Try Pro API
  try {
    const response = await axios.get('https://api.deepl.com/v2/usage', {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
      },
    });

    console.log('✅ Pro API key is VALID!');
    console.log('Character count:', response.data.character_count);
    console.log('Character limit:', response.data.character_limit);
    console.log('Remaining:', response.data.character_limit - response.data.character_count);
    console.log('Usage:', ((response.data.character_count / response.data.character_limit) * 100).toFixed(2) + '%');
  } catch (error) {
    console.log('❌ Pro API failed');
    console.log('Error:', error.response?.data || error.message);
    console.log('');

    // Try Free API
    try {
      const response = await axios.get('https://api-free.deepl.com/v2/usage', {
        headers: {
          'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
        },
      });

      console.log('✅ Free API key is VALID!');
      console.log('Character count:', response.data.character_count);
      console.log('Character limit:', response.data.character_limit);
      console.log('Remaining:', response.data.character_limit - response.data.character_count);
      console.log('Usage:', ((response.data.character_count / response.data.character_limit) * 100).toFixed(2) + '%');
    } catch (error2) {
      console.log('❌ Free API also failed');
      console.log('Error:', error2.response?.data || error2.message);
    }
  }
}

testProKey();
