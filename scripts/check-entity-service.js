const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkEntityService() {
  console.log('🔍 Checking if Strapi Entity Service sees PT questions...');
  console.log('');
  
  // Our custom endpoint uses SQL - it sees 522 PT
  console.log('1. Custom SQL endpoint:');
  const sqlResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 3 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  console.log('   Found:', sqlResponse.data.meta?.total, 'PT questions');
  console.log('');
  
  // Strapi's default API uses Entity Service
  console.log('2. Trying Strapi default REST API:');
  try {
    const strapiResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: {
        locale: 'pt',
        'pagination[pageSize]': 3,
      },
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    });
    console.log('   Found:', strapiResponse.data.meta?.pagination?.total, 'PT questions via Strapi API');
  } catch (error) {
    console.log('   Error:', error.response?.status, error.response?.data);
  }
  
  console.log('');
  console.log('The Content Manager uses Entity Service (like #2).');
  console.log('If #1 shows 522 but #2 shows 0, then PT questions were');
  console.log('inserted via SQL but Entity Service cannot see them.');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkEntityService().catch(error => {
  console.error('Error:', error.message);
});
