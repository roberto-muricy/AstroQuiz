const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkDatabaseQuestionType() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/check-db-questiontype.js');
    process.exit(1);
  }

  console.log('🔍 Checking questionType in database...\n');

  // Fetch a few questions with baseId starting with astro_img_
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

  const allQuestions = response.data.data;
  const imageBaseIdQuestions = allQuestions.filter(q => {
    const baseId = q.base_id || q.baseId;
    return baseId && baseId.startsWith('astro_img_');
  });

  console.log('Sample questions with baseId starting with astro_img_:');
  console.log('');

  imageBaseIdQuestions.forEach(q => {
    console.log(`ID: ${q.id} | documentId: ${q.documentId}`);
    console.log(`baseId: ${q.base_id || q.baseId}`);
    console.log(`questionType: ${q.questionType || 'null'}`);
    console.log(`question_type (raw): ${q.question_type || 'null'}`);
    console.log(`Question: ${q.question.substring(0, 60)}...`);
    console.log('');
  });

  // Also check one specific ID that we know was updated
  console.log('Checking specific question ID 12107 (astro_img_0026):');
  const specificResponse = await axios.get(PRODUCTION_URL + '/api/questions/12107', {
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const specificQ = specificResponse.data.data;
  console.log('');
  console.log(`ID: ${specificQ.id}`);
  console.log(`baseId: ${specificQ.base_id || specificQ.baseId}`);
  console.log(`questionType: ${specificQ.questionType || 'null'}`);
  console.log(`question_type (raw): ${specificQ.question_type || 'null'}`);
  console.log(`Question: ${specificQ.question}`);
  console.log('');
}

checkDatabaseQuestionType().catch(error => {
  console.error('\n\nFatal error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
  process.exit(1);
});
