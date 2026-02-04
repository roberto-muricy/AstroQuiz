const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkLinking() {
  console.log('🔍 Checking if FR questions are linked to EN...');
  console.log('');
  
  // Get first 5 EN questions
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 5 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  // Get first 5 FR questions
  const frResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 5 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enDocs = enResponse.data.data.map(q => q.documentId);
  const frDocs = frResponse.data.data.map(q => q.documentId);
  
  console.log('First 5 EN documentIds:', enDocs);
  console.log('First 5 FR documentIds:', frDocs);
  console.log('');
  
  const shared = enDocs.filter(id => frDocs.includes(id));
  
  if (shared.length > 0) {
    console.log('✅ Found', shared.length, 'shared documentIds - FR questions ARE linked to EN');
  } else {
    console.log('❌ NO shared documentIds - FR questions are NOT linked to EN');
    console.log('   This is why they don\'t appear in Content Manager as localizations');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkLinking().catch(error => {
  console.error('Error:', error.message);
});
