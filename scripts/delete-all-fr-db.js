const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function deleteAllFrenchFromDB() {
  console.log('🔍 Requesting deletion of ALL FR questions (including drafts)...');
  console.log('');
  
  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/delete-locale',
      { locale: 'fr' },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes
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

deleteAllFrenchFromDB();
