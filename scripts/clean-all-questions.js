const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function cleanAllQuestions() {
  console.log('⚠️  WARNING: This will delete ALL questions from production!');
  console.log('');

  try {
    console.log('🗑️  Truncating questions table...');
    const response = await axios.post(
      `${PRODUCTION_URL}/api/questions/truncate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ Success:', response.data.message);
    console.log('');
    console.log('Now you can import fresh questions with:');
    console.log('  API_TOKEN="..." node scripts/import-to-production-3locales.js');
  } catch (error) {
    console.error('❌ Failed to truncate:', error.response?.data || error.message);
    process.exit(1);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/clean-all-questions.js');
  process.exit(1);
}

cleanAllQuestions();
