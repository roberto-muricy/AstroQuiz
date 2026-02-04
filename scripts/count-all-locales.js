const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function countAll() {
  console.log('Counting questions by locale...');
  console.log('');
  
  const locales = ['en', 'pt', 'fr', 'es'];
  
  for (const locale of locales) {
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: { locale: locale, limit: 1, start: 0 },
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    });
    
    const total = response.data.meta?.total || 0;
    console.log(locale.toUpperCase() + ':', total, 'questions');
  }
}

if (!API_TOKEN) {
  console.error('API_TOKEN required');
  process.exit(1);
}

countAll().catch(error => {
  console.error('Error:', error.message);
});
