const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function verifyTopicKeyInDB() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/verify-topickey-db.js');
    process.exit(1);
  }

  console.log('🔍 Fetching sample questions from production API...\n');

  // Fetch first 10 questions
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: {
      locale: 'en',
      limit: 10,
      start: 0,
    },
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const questions = response.data.data;

  console.log('📊 First 10 questions:\n');

  questions.forEach((q, i) => {
    console.log(`${i + 1}. ID: ${q.id}`);
    console.log(`   baseId: ${q.baseId || q.base_id || 'N/A'}`);
    console.log(`   topic: ${q.topic || 'N/A'}`);
    console.log(`   topicKey: ${q.topicKey || 'N/A'}`);
    console.log(`   topic_key (raw): ${q.topic_key || 'N/A'}`);
    console.log(`   Question: ${q.question.substring(0, 60)}...`);
    console.log('');
  });

  // Count questions with topicKey
  const withTopicKey = questions.filter(q => q.topicKey || q.topic_key);
  console.log(`📊 Summary: ${withTopicKey.length} of ${questions.length} have topicKey\n`);

  // Fetch a specific question by ID to see full details
  console.log('🔍 Fetching specific question (ID: 12231) for detailed inspection...\n');

  const specificResponse = await axios.get(PRODUCTION_URL + '/api/questions/12231', {
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const specificQ = specificResponse.data.data;
  console.log('Full question object:');
  console.log(JSON.stringify(specificQ, null, 2));
}

verifyTopicKeyInDB().catch(error => {
  console.error('\n\nFatal error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
  process.exit(1);
});
