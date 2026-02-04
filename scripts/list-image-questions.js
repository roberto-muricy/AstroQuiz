const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function listImageQuestions() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/list-image-questions.js');
    process.exit(1);
  }

  console.log('🔍 Fetching image questions from production...\n');

  // Fetch all EN questions with questionType='image'
  const allQuestions = [];
  let start = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: 'en',
          limit: limit,
          start: start,
          populate: 'image',
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      allQuestions.push(...data);
      start += limit;

      if (data.length < limit) break;
      await sleep(200);
    } catch (error) {
      console.error('❌ Error fetching questions:', error.message);
      break;
    }
  }

  const imageQuestions = allQuestions.filter(q => q.questionType === 'image');
  imageQuestions.sort((a, b) => {
    const aId = a.base_id || a.baseId || '';
    const bId = b.base_id || b.baseId || '';
    return aId.localeCompare(bId);
  });

  console.log(`📊 Found ${imageQuestions.length} image questions (EN only)\n`);
  console.log('=' .repeat(80));
  console.log('');

  imageQuestions.forEach((q, i) => {
    const baseId = q.base_id || q.baseId;
    const hasImage = q.image && q.image.id;
    const imageStatus = hasImage ? '✅ HAS IMAGE' : '❌ NO IMAGE';

    console.log(`${i + 1}. ${imageStatus} | baseId: ${baseId}`);
    console.log(`   ID: ${q.id} | documentId: ${q.documentId}`);
    console.log(`   Level: ${q.level} | Topic: ${q.topicKey || 'N/A'}`);
    console.log(`   Question: ${q.question}`);
    if (hasImage) {
      console.log(`   Image: ${q.image.url}`);
    }
    console.log('');
  });

  console.log('=' .repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total image questions: ${imageQuestions.length}`);
  console.log(`   With images: ${imageQuestions.filter(q => q.image && q.image.id).length}`);
  console.log(`   Without images: ${imageQuestions.filter(q => !q.image || !q.image.id).length}`);
  console.log('');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

listImageQuestions().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
