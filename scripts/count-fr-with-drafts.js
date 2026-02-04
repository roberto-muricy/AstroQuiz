const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkFrQuestions() {
  console.log('🔍 Checking FR questions (including drafts)...');
  console.log('');
  
  // Check via custom endpoint (published only)
  const publishedResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('Published FR questions:', publishedResponse.data.meta?.total || 0);
  
  // We need to check the database directly for drafts
  // Let's fetch a sample to see the status field
  const sampleResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 5, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  if (sampleResponse.data.data && sampleResponse.data.data.length > 0) {
    console.log('');
    console.log('Sample FR question:');
    console.log('  documentId:', sampleResponse.data.data[0].documentId);
    console.log('  id:', sampleResponse.data.data[0].id);
    console.log('  publishedAt:', sampleResponse.data.data[0].publishedAt);
    console.log('  question:', sampleResponse.data.data[0].question?.substring(0, 50) + '...');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkFrQuestions().catch(error => {
  console.error('Error:', error.message);
  console.error(error.response?.data);
});
