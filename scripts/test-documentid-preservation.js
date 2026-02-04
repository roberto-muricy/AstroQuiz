const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testDocumentId() {
  console.log('🧪 Testing if documentId is preserved in FR creation...');
  console.log('');
  
  // Get first EN question
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enQuestion = enResponse.data.data[0];
  console.log('EN question documentId:', enQuestion.documentId);
  console.log('');
  
  // Create FR localization with SAME documentId
  console.log('Creating FR localization with documentId:', enQuestion.documentId);
  const createResponse = await axios.post(
    PRODUCTION_URL + '/api/questions/add-localization',
    {
      documentId: enQuestion.documentId,
      locale: 'fr',
      question: 'Question de test',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
      explanation: 'Test',
      topic: 'Test',
      level: 1,
      baseId: enQuestion.baseId,
      questionType: 'text',
    },
    {
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Response success:', createResponse.data.success);
  console.log('Response skipped:', createResponse.data.skipped);
  console.log('');
  
  // Fetch the FR question we just created
  console.log('Fetching FR questions with the same documentId...');
  const frResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 100 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const matchingFR = frResponse.data.data.find(q => q.documentId === enQuestion.documentId);
  
  if (matchingFR) {
    console.log('✅ FOUND FR question with SAME documentId:', matchingFR.documentId);
    console.log('   Question:', matchingFR.question);
  } else {
    console.log('❌ NO FR question found with documentId:', enQuestion.documentId);
    console.log('   First FR documentId:', frResponse.data.data[0]?.documentId);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

testDocumentId().catch(error => {
  console.error('Error:', error.message);
  console.error(error.response?.data);
});
