const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function countFrench() {
  console.log('🔍 Counting French questions...');
  
  const frResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('');
  console.log('EN questions:', enResponse.data.meta?.total || 0);
  console.log('FR questions:', frResponse.data.meta?.total || 0);
  console.log('');
  
  if ((frResponse.data.meta?.total || 0) > (enResponse.data.meta?.total || 0)) {
    console.log('⚠️  More FR questions than EN - possible duplicates!');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

countFrench().catch(error => {
  console.error('Error:', error.message);
});
