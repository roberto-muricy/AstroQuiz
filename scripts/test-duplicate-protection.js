const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testDuplicateProtection() {
  console.log('🧪 Testing duplicate protection...');
  console.log('');
  
  // Get first EN question
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  const enQuestion = enResponse.data.data[0];
  console.log('Test question documentId:', enQuestion.documentId);
  console.log('');
  
  // Try to create FR localization
  console.log('1st attempt: Creating FR localization...');
  const response1 = await axios.post(
    PRODUCTION_URL + '/api/questions/add-localization',
    {
      documentId: enQuestion.documentId,
      locale: 'fr',
      question: 'Test question in French',
      optionA: 'Option A',
      optionB: 'Option B',
      optionC: 'Option C',
      optionD: 'Option D',
      correctOption: 'A',
      explanation: 'Test explanation',
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
  
  console.log('Response 1:', response1.data.skipped ? 'SKIPPED (already exists)' : 'CREATED');
  console.log('');
  
  // Try again - should be skipped
  console.log('2nd attempt: Trying to create same FR localization again...');
  const response2 = await axios.post(
    PRODUCTION_URL + '/api/questions/add-localization',
    {
      documentId: enQuestion.documentId,
      locale: 'fr',
      question: 'Test question in French',
      optionA: 'Option A',
      optionB: 'Option B',
      optionC: 'Option C',
      optionD: 'Option D',
      correctOption: 'A',
      explanation: 'Test explanation',
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
  
  console.log('Response 2:', response2.data.skipped ? 'SKIPPED (already exists) ✅' : 'CREATED ❌');
  console.log('');
  
  if (response2.data.skipped) {
    console.log('✅ Duplicate protection is WORKING!');
  } else {
    console.log('❌ Duplicate protection is NOT WORKING!');
  }
  
  // Clean up - delete the test FR question
  console.log('');
  console.log('Cleaning up test question...');
  await axios.post(
    PRODUCTION_URL + '/api/questions/delete-locale',
    { locale: 'fr' },
    {
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('✅ Test cleanup done');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

testDuplicateProtection().catch(error => {
  console.error('Error:', error.message);
  console.error(error.response?.data);
});
