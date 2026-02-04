const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function triggerTranslation() {
  console.log('🚀 Starting PT translation on Railway server...');
  console.log('   This will use DeepL API configured on Railway');
  console.log('');

  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/translate-to-pt',
      {},
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 600000, // 10 minutes timeout
      }
    );

    console.log('✅ Translation completed!');
    console.log('');
    console.log('Stats:');
    console.log('   Total EN questions:', response.data.stats.total);
    console.log('   Already translated:', response.data.stats.alreadyTranslated);
    console.log('   Newly translated:', response.data.stats.translated);
    console.log('   Errors:', response.data.stats.errors);

    if (response.data.errorLog && response.data.errorLog.length > 0) {
      console.log('');
      console.log('First errors:');
      response.data.errorLog.forEach(err => {
        console.log('   -', err.baseId + ':', err.error);
      });
    }

    console.log('');
    console.log('Check Strapi Content Manager and switch to PT locale!');
  } catch (error) {
    console.error('❌ Translation failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/trigger-translation.js');
  process.exit(1);
}

triggerTranslation();
