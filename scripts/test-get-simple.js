const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testGet() {
  console.log('Testing GET without Strapi pagination params...');
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: {
      locale: 'en',
      limit: 3,
      start: 0,
    },
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  console.log('Total:', response.data.meta?.total);
  console.log('');
  console.log('First 3 questions:');
  response.data.data.slice(0, 3).forEach(q => {
    console.log('  - baseId:', q.baseId, '| Question:', q.question?.substring(0, 50));
  });
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

testGet().catch(error => {
  console.error('Error:', error.message);
});
