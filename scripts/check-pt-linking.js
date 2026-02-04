const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkPTLinking() {
  console.log('🔍 Checking if PT questions are linked to EN...');
  console.log('');
  
  // Get first 5 EN questions
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 5 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  // Get first 5 PT questions
  const ptResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 5 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enDocs = enResponse.data.data.map(q => q.documentId);
  const ptDocs = ptResponse.data.data.map(q => q.documentId);
  
  console.log('First 5 EN documentIds:', enDocs);
  console.log('First 5 PT documentIds:', ptDocs);
  console.log('');
  
  const shared = enDocs.filter(id => ptDocs.includes(id));
  
  if (shared.length > 0) {
    console.log('✅ Found', shared.length, 'shared documentIds - PT questions ARE linked to EN');
  } else {
    console.log('❌ NO shared documentIds - PT questions are NOT linked to EN');
    console.log('   This means PT has the same problem as FR!');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkPTLinking().catch(error => {
  console.error('Error:', error.message);
});
