const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function countAndShow() {
  console.log('🔍 Counting questions by locale...');
  
  // Count EN
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  // Count PT
  const ptResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  console.log('');
  console.log('EN questions:', enResponse.data.meta?.total || 0);
  console.log('PT questions:', ptResponse.data.meta?.total || 0);
  console.log('Missing:', (enResponse.data.meta?.total || 0) - (ptResponse.data.meta?.total || 0));
  console.log('');
  
  if ((ptResponse.data.meta?.total || 0) < (enResponse.data.meta?.total || 0)) {
    console.log('Run translation again to complete the missing ones:');
    console.log('  API_TOKEN="..." DEEPL_API_KEY="..." node scripts/translate-locally.js');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

countAndShow().catch(error => {
  console.error('Error:', error.message);
});
