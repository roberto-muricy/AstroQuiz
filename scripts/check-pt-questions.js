const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkPT() {
  console.log('🔍 Checking PT questions in production...');
  
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: {
      locale: 'pt',
      limit: 5,
      start: 0,
    },
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  console.log('Total PT questions:', response.data.meta?.total || 0);
  console.log('');
  
  if (response.data.data && response.data.data.length > 0) {
    console.log('First 3 PT questions:');
    response.data.data.slice(0, 3).forEach(q => {
      console.log('  - baseId:', q.baseId);
      console.log('    Question:', q.question?.substring(0, 60));
      console.log('    Locale:', q.locale);
      console.log('');
    });
  } else {
    console.log('❌ No PT questions found!');
    console.log('');
    console.log('Checking if endpoint exists...');
    
    // Test the add-localization endpoint
    try {
      const testResponse = await axios.post(
        PRODUCTION_URL + '/api/questions/add-localization',
        { documentId: 'test', locale: 'pt' },
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
          },
        }
      );
      console.log('Endpoint response:', testResponse.data);
    } catch (error) {
      console.log('Endpoint error:', error.response?.status, error.response?.data);
    }
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkPT().catch(error => {
  console.error('Error:', error.message);
});
