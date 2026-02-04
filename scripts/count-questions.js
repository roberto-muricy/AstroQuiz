const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function countQuestions() {
  try {
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: {
        locale: 'en',
        'pagination[pageSize]': 1,
      },
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
      },
    });

    const total = response.data.meta?.pagination?.total || 0;
    console.log('Total EN questions:', total);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

countQuestions();
