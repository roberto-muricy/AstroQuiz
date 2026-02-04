const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DELAY = 300; // 300ms between requests

async function fixImageQuestionType() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/fix-image-questiontype.js');
    process.exit(1);
  }

  console.log('🔍 Finding questions with images...\n');

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

  console.log(`✅ Found ${allQuestions.length} EN questions total\n`);

  // Filter questions that have image but questionType is 'text'
  const questionsToFix = allQuestions.filter(q => {
    const hasImage = q.image && q.image.id;
    const isText = !q.questionType || q.questionType === 'text';
    return hasImage && isText;
  });

  console.log(`📝 Questions with image but questionType='text': ${questionsToFix.length}\n`);

  if (questionsToFix.length === 0) {
    console.log('🎉 All questions are correctly typed!');
    return;
  }

  console.log('Sample questions to fix:');
  questionsToFix.slice(0, 3).forEach(q => {
    console.log(`  - ID: ${q.id} | documentId: ${q.documentId}`);
    console.log(`    Question: ${q.question.substring(0, 60)}...`);
    console.log(`    Image: ${q.image.url}`);
  });
  console.log('');

  console.log(`🔧 Updating ${questionsToFix.length} questions...\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < questionsToFix.length; i++) {
    const q = questionsToFix[i];

    try {
      await axios.put(
        PRODUCTION_URL + '/api/questions/' + q.id,
        {
          questionType: 'image',
        },
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      success++;
      process.stdout.write(`\r✅ ${i + 1}/${questionsToFix.length} | Success: ${success} | Errors: ${errors}  `);

      await sleep(DELAY);
    } catch (error) {
      errors++;
      process.stdout.write(`\r❌ ${i + 1}/${questionsToFix.length} | Success: ${success} | Errors: ${errors}  `);

      // Log first error for debugging
      if (errors === 1) {
        console.log('\n');
        console.log('First error details:');
        console.log('Error:', error.response?.data || error.message);
        console.log('Question ID:', q.id);
        console.log('Question documentId:', q.documentId);
        console.log('\n');
      }
    }
  }

  console.log('');
  console.log('');
  console.log('🎉 Update completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);
  console.log('');
  console.log('📊 Verifying...');

  // Verify final count
  const verifyResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: {
      locale: 'en',
      limit: 100,
      start: 0,
      populate: 'image',
    },
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const verified = verifyResponse.data.data;
  const imageQuestions = verified.filter(q => q.image && q.image.id && q.questionType === 'image');
  const stillWrong = verified.filter(q => q.image && q.image.id && (!q.questionType || q.questionType === 'text'));

  console.log('');
  console.log('   Questions with questionType="image": ' + imageQuestions.length);
  console.log('   Questions still with wrong type: ' + stillWrong.length);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

fixImageQuestionType().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
