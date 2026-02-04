const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function verifyPT() {
  console.log('🔍 Checking PT questions via API...');
  
  // Check with different params
  const tests = [
    { locale: 'pt', limit: 5, start: 0, published: 'all' },
    { locale: 'pt', limit: 5, start: 0 },
    { locale: 'pt', limit: 5, start: 0, published: 'true' },
    { locale: 'pt', limit: 5, start: 0, published: 'false' },
  ];

  for (const params of tests) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: params,
        headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      });

      console.log('');
      console.log('Params:', JSON.stringify(params));
      console.log('  Total:', response.data.meta?.total || 0);
      if (response.data.data && response.data.data.length > 0) {
        const first = response.data.data[0];
        console.log('  First question:');
        console.log('    documentId:', first.documentId);
        console.log('    question:', first.question?.substring(0, 50));
        console.log('    publishedAt:', first.publishedAt);
      }
    } catch (error) {
      console.log('');
      console.log('Params:', JSON.stringify(params));
      console.log('  Error:', error.message);
    }
  }

  // Also check one EN question to compare
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Comparing with EN question:');
  
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  const enQuestion = enResponse.data.data[0];
  console.log('EN Question:');
  console.log('  documentId:', enQuestion.documentId);
  console.log('  question:', enQuestion.question?.substring(0, 50));
  console.log('  publishedAt:', enQuestion.publishedAt);
  
  // Try to find PT with same documentId
  const allPtResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 1000, start: 0, published: 'all' },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const matchingPt = allPtResponse.data.data?.find(q => q.documentId === enQuestion.documentId);
  
  if (matchingPt) {
    console.log('');
    console.log('✅ Found matching PT:');
    console.log('  documentId:', matchingPt.documentId);
    console.log('  question:', matchingPt.question?.substring(0, 50));
    console.log('  publishedAt:', matchingPt.publishedAt);
  } else {
    console.log('');
    console.log('❌ No PT found with documentId:', enQuestion.documentId);
    console.log('   Total PT questions in DB:', allPtResponse.data.meta?.total || 0);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

verifyPT().catch(error => {
  console.error('Error:', error.message);
});
