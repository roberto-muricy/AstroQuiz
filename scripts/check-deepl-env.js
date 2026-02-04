const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkEnv() {
  console.log('🔍 Checking DeepL environment variables...');
  console.log('');

  try {
    // Use a simpler endpoint to check env vars
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/import-v2',
      { questions: [] },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
        timeout: 10000,
      }
    );

    console.log('API is responding:', response.data);
  } catch (error) {
    console.log('API error (expected):', error.response?.data || error.message);
  }

  console.log('');
  console.log('Now let me test DeepL directly from local machine...');
  console.log('Please provide your DEEPL_API_KEY so I can test it:');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  process.exit(1);
}

checkEnv();
