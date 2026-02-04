const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkAll() {
  try {
    // Without locale filter
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: {
        'pagination[pageSize]': 10,
      },
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
      },
    });

    console.log('Total questions (all locales):', response.data.meta?.pagination?.total || 0);
    console.log('');
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('First 3 questions:');
      response.data.data.slice(0, 3).forEach(q => {
        console.log('  -', q.base_id, '| Locale:', q.locale, '| Question:', q.question?.substring(0, 50) + '...');
      });
    } else {
      console.log('No questions found!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkAll();
