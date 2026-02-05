const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkDBDirect() {
  console.log('Creating temporary endpoint to check raw database...\n');

  // We'll use the custom API to execute a raw SQL query
  const response = await axios.get(`${PRODUCTION_URL}/api/questions/12231`, {
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const question = response.data.data;

  console.log('Question via custom API:');
  console.log(`  ID: ${question.id}`);
  console.log(`  baseId: ${question.baseId}`);
  console.log(`  topic: ${question.topic}`);
  console.log(`  topicKey: ${question.topicKey}`);
  console.log('');

  // Now try the Strapi Content API (what the admin uses)
  try {
    const strapiResponse = await axios.get(`${PRODUCTION_URL}/content-manager/collection-types/api::question.question/${question.id}`, {
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
      },
    });

    console.log('Question via Strapi Content Manager API:');
    console.log(JSON.stringify(strapiResponse.data, null, 2));
  } catch (error) {
    console.log('Content Manager API failed:', error.response?.status, error.response?.data || error.message);
  }
}

checkDBDirect().catch(error => {
  console.error('Fatal error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
});
