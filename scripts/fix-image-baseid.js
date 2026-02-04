const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DELAY = 300; // 300ms between requests

async function fixImageQuestions() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/fix-image-baseid.js');
    process.exit(1);
  }

  console.log('🔍 Finding questions with baseId starting with "astro_img_"...\n');

  // Fetch all questions (all locales)
  const allQuestions = [];
  const locales = ['en', 'pt', 'fr', 'es'];

  for (const locale of locales) {
    let start = 0;
    const limit = 100;

    while (true) {
      try {
        const response = await axios.get(PRODUCTION_URL + '/api/questions', {
          params: {
            locale: locale,
            limit: limit,
            start: start,
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
        console.error(`❌ Error fetching ${locale} questions:`, error.message);
        break;
      }
    }
  }

  console.log(`✅ Found ${allQuestions.length} questions total (all locales)\n`);

  // Filter questions with baseId starting with 'astro_img_'
  const imageQuestions = allQuestions.filter(q => {
    const baseId = q.base_id || q.baseId;
    return baseId && baseId.startsWith('astro_img_');
  });

  console.log(`📝 Questions with baseId starting with 'astro_img_': ${imageQuestions.length}\n`);

  if (imageQuestions.length === 0) {
    console.log('❌ No questions found with baseId pattern "astro_img_"');
    return;
  }

  // Show stats
  const byLocale = {};
  const byType = {};
  const uniqueBaseIds = new Set();

  imageQuestions.forEach(q => {
    const locale = q.locale;
    const type = q.questionType || 'null';
    const baseId = q.base_id || q.baseId;

    byLocale[locale] = (byLocale[locale] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
    if (baseId) uniqueBaseIds.add(baseId);
  });

  console.log('By locale:');
  Object.entries(byLocale).forEach(([locale, count]) => {
    console.log(`  ${locale}: ${count} questions`);
  });
  console.log('');

  console.log('By questionType:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} questions`);
  });
  console.log('');

  console.log(`Unique baseIds: ${uniqueBaseIds.size}`);
  console.log('');

  // Filter only those that need updating (questionType != 'image')
  const toUpdate = imageQuestions.filter(q => {
    const type = q.questionType || 'null';
    return type !== 'image';
  });

  console.log(`📝 Questions needing update: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('🎉 All questions already have questionType="image"!');
    return;
  }

  console.log('Sample questions to update:');
  toUpdate.slice(0, 3).forEach(q => {
    console.log(`  - ID: ${q.id} | documentId: ${q.documentId} | locale: ${q.locale}`);
    console.log(`    baseId: ${q.base_id || q.baseId}`);
    console.log(`    Question: ${q.question.substring(0, 60)}...`);
    console.log(`    Current type: ${q.questionType || 'null'}`);
    console.log('');
  });

  console.log(`🔧 Updating ${toUpdate.length} questions to questionType="image"...\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toUpdate.length; i++) {
    const q = toUpdate[i];

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
      process.stdout.write(`\r✅ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      await sleep(DELAY);
    } catch (error) {
      errors++;
      process.stdout.write(`\r❌ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);

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
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

fixImageQuestions().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
