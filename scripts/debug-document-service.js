const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function debugDocumentService() {
  console.log('🔍 Debugging Document Service behavior...');
  console.log('');
  
  // Get first EN question
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enQuestion = enResponse.data.data[0];
  console.log('EN question documentId:', enQuestion.documentId);
  console.log('');
  
  // Create FR localization
  console.log('Creating FR localization with SAME documentId...');
  const response1 = await axios.post(
    PRODUCTION_URL + '/api/questions/add-localization',
    {
      documentId: enQuestion.documentId,  // Use SAME documentId
      locale: 'fr',
      question: 'Test FR',
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
  
  console.log('Created FR question documentId:', response1.data.data?.documentId);
  console.log('');
  
  if (response1.data.data?.documentId === enQuestion.documentId) {
    console.log('✅ Document Service CORRECTLY used the provided documentId');
  } else {
    console.log('❌ Document Service CREATED A NEW documentId!');
    console.log('   Expected:', enQuestion.documentId);
    console.log('   Got:', response1.data.data?.documentId);
  }
  
  console.log('');
  console.log('Fetching FR questions to verify...');
  const frResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'fr', limit: 10 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('Total FR questions:', frResponse.data.meta?.total);
  if (frResponse.data.data && frResponse.data.data.length > 0) {
    console.log('First FR documentId:', frResponse.data.data[0].documentId);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

debugDocumentService().catch(error => {
  console.error('Error:', error.message);
  console.error(error.response?.data);
});
