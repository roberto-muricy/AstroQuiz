const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  // Get one FR question to see its structure
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  if (response.data.data && response.data.data.length > 0) {
    console.log('Sample FR question fields:', Object.keys(response.data.data[0]));
    console.log('');
    console.log('documentId:', response.data.data[0].documentId);
    console.log('id:', response.data.data[0].id);
  } else {
    console.log('No FR questions found');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkSchema().catch(error => {
  console.error('Error:', error.message);
});
