const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function deleteAllPT() {
  console.log('🔍 Requesting deletion of ALL PT questions (including drafts)...');
  console.log('');
  
  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/delete-locale',
      { locale: 'pt' },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

deleteAllPT();
