const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function compare() {
  console.log('🔍 Comparing PT and FR questions...');
  console.log('');
  
  // Get one PT question
  const ptResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  // Get one FR question
  const frResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  if (!ptResponse.data.data || ptResponse.data.data.length === 0) {
    console.log('❌ No PT questions found');
    return;
  }
  
  if (!frResponse.data.data || frResponse.data.data.length === 0) {
    console.log('❌ No FR questions found');
    return;
  }
  
  const pt = ptResponse.data.data[0];
  const fr = frResponse.data.data[0];
  
  console.log('PT question fields:', Object.keys(pt).sort().join(', '));
  console.log('');
  console.log('FR question fields:', Object.keys(fr).sort().join(', '));
  console.log('');
  
  // Find differences
  const ptKeys = new Set(Object.keys(pt));
  const frKeys = new Set(Object.keys(fr));
  
  const missingInFR = [...ptKeys].filter(k => !frKeys.has(k));
  const extraInFR = [...frKeys].filter(k => !ptKeys.has(k));
  
  if (missingInFR.length > 0) {
    console.log('❌ Fields in PT but MISSING in FR:', missingInFR.join(', '));
  }
  
  if (extraInFR.length > 0) {
    console.log('⚠️  Fields in FR but NOT in PT:', extraInFR.join(', '));
  }
  
  if (missingInFR.length === 0 && extraInFR.length === 0) {
    console.log('✅ Both have the same fields');
  }
  
  console.log('');
  console.log('PT publishedAt:', pt.publishedAt);
  console.log('FR publishedAt:', fr.publishedAt);
  console.log('');
  console.log('PT documentId:', pt.documentId);
  console.log('FR documentId:', fr.documentId);
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

compare().catch(error => {
  console.error('Error:', error.message);
});
