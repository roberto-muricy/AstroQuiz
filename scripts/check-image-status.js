const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkImageStatus() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/check-image-status.js');
    process.exit(1);
  }

  console.log('🔍 Checking image question status...\n');

  // Fetch all EN questions with image populated
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

  console.log(`📊 Total EN questions: ${allQuestions.length}\n`);

  // Analyze by type and image presence
  const withImageType = allQuestions.filter(q => q.questionType === 'image');
  const withImageField = allQuestions.filter(q => q.image && q.image.id);
  const imageTypeButNoImage = allQuestions.filter(q => q.questionType === 'image' && (!q.image || !q.image.id));
  const textTypeWithImage = allQuestions.filter(q => (!q.questionType || q.questionType === 'text') && q.image && q.image.id);

  console.log('By questionType field:');
  console.log(`  questionType='image': ${withImageType.length}`);
  console.log(`  questionType='text' or null: ${allQuestions.length - withImageType.length}\n`);

  console.log('By image field:');
  console.log(`  With image attached: ${withImageField.length}`);
  console.log(`  Without image: ${allQuestions.length - withImageField.length}\n`);

  console.log('Inconsistencies:');
  console.log(`  questionType='image' but NO image attached: ${imageTypeButNoImage.length}`);
  console.log(`  questionType='text' but HAS image attached: ${textTypeWithImage.length}\n`);

  if (imageTypeButNoImage.length > 0) {
    console.log('Sample questions with type=image but no image:');
    imageTypeButNoImage.slice(0, 5).forEach(q => {
      console.log(`  - ID: ${q.id} | documentId: ${q.documentId}`);
      console.log(`    Question: ${q.question.substring(0, 60)}...`);
      console.log(`    baseId: ${q.base_id || q.baseId || 'N/A'}`);
      console.log('');
    });
  }

  if (withImageField.length > 0) {
    console.log('Sample questions WITH images:');
    withImageField.slice(0, 5).forEach(q => {
      console.log(`  - ID: ${q.id} | documentId: ${q.documentId}`);
      console.log(`    Question: ${q.question.substring(0, 60)}...`);
      console.log(`    Image URL: ${q.image.url}`);
      console.log(`    QuestionType: ${q.questionType || 'N/A'}`);
      console.log('');
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

checkImageStatus().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
