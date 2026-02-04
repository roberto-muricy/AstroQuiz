const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function removeDuplicates() {
  console.log('🔍 Fetching all EN questions from production...');

  const questions = await fetchAllQuestions('en');
  console.log('✅ Found ' + questions.length + ' EN questions');
  console.log('');

  // Group by base_id to find duplicates
  const byBaseId = {};
  for (const q of questions) {
    const baseId = q.base_id || 'no-base-id';
    if (!byBaseId[baseId]) {
      byBaseId[baseId] = [];
    }
    byBaseId[baseId].push(q);
  }

  // Find duplicates (base_id with more than 1 question)
  const duplicates = [];
  let uniqueCount = 0;

  for (const baseId in byBaseId) {
    const qs = byBaseId[baseId];
    if (qs.length > 1) {
      // Keep the first one, mark others for deletion
      uniqueCount++;
      for (let i = 1; i < qs.length; i++) {
        duplicates.push(qs[i]);
      }
    } else {
      uniqueCount++;
    }
  }

  console.log('📊 Statistics:');
  console.log('   Unique questions: ' + uniqueCount);
  console.log('   Duplicates to delete: ' + duplicates.length);
  console.log('   Total questions: ' + questions.length);
  console.log('');

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log('🗑️  Deleting duplicates...');
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < duplicates.length; i++) {
    const q = duplicates[i];
    try {
      await axios.delete(
        PRODUCTION_URL + '/api/questions/' + q.id,
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
          },
          timeout: 10000,
        }
      );
      deleted++;

      if ((i + 1) % 50 === 0 || i === duplicates.length - 1) {
        process.stdout.write('\r✅ Progress: ' + (i + 1) + '/' + duplicates.length + ' | Deleted: ' + deleted + ' | Errors: ' + errors + '  ');
      }
    } catch (error) {
      errors++;
    }

    // Small delay to avoid rate limiting
    if ((i + 1) % 100 === 0) {
      await sleep(1000);
    }
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Cleanup completed!');
  console.log('   Duplicates deleted: ' + deleted);
  console.log('   Errors: ' + errors);
  console.log('   Remaining unique questions: ' + uniqueCount);
  console.log('═══════════════════════════════════════');
}

async function fetchAllQuestions(locale) {
  const questions = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: locale,
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      questions.push(...data);

      // Stop at 10000 to avoid infinite loop
      if (questions.length >= 10000) {
        console.log('⚠️  Reached 10000 questions limit, stopping fetch');
        break;
      }

      if (data.length < pageSize) break;
      page++;

      // Add delay every 10 pages to avoid rate limiting
      if (page % 10 === 0) {
        await sleep(1000);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('\n⚠️  Rate limit hit at page ' + page + ', waiting 5 seconds...');
        await sleep(5000);
        continue;
      }
      console.error('\nFailed to fetch page ' + page + ':', error.message);
      break;
    }
  }

  return questions;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/remove-duplicates.js');
  process.exit(1);
}

removeDuplicates().catch(error => {
  console.error('\n\nFatal error:', error);
  process.exit(1);
});
