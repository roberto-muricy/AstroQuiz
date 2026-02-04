const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkStructure() {
  console.log('Checking database structure...');
  console.log('');
  
  const response = await axios.get(PRODUCTION_URL + '/api/questions/debug-structure', {
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('Available columns:', response.data.columns.join(', '));
  console.log('');
  console.log('Sample data keys:', Object.keys(response.data.sampleData));
}

if (!API_TOKEN) {
  console.error('API_TOKEN required');
  process.exit(1);
}

checkStructure().catch(error => {
  console.error('Error:', error.message);
  console.error(error.response?.data);
});
