const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testEndpoint() {
  console.log('🧪 Testing /api/questions/add-localization endpoint...');
  console.log('');

  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions/add-localization',
      {
        documentId: 'test-doc-id',
        locale: 'pt',
        question: 'Test question',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
        explanation: 'Test',
        topic: 'Test',
        level: 1,
        baseId: 'test-123',
        questionType: 'text',
      },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ Endpoint exists!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Endpoint NOT FOUND (404)');
      console.log('   The endpoint was not deployed to production!');
      console.log('   Need to redeploy.');
    } else {
      console.log('Status:', error.response?.status);
      console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

testEndpoint();
