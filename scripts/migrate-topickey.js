const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');
const DELAY = 200; // 200ms between requests

async function migrateTopicKeys() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/migrate-topickey.js');
    process.exit(1);
  }

  console.log('🔍 Reading topicKeys from local database...\n');

  // Open local database
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Could not open local database:', err.message);
      process.exit(1);
    }
  });

  // Get all EN questions with topicKey from local DB
  const localQuestions = await new Promise((resolve, reject) => {
    db.all(`
      SELECT base_id, topic_key
      FROM questions
      WHERE locale = 'en' AND base_id IS NOT NULL AND topic_key IS NOT NULL
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  db.close();

  console.log(`✅ Found ${localQuestions.length} questions with topicKey in local DB\n`);

  // Create a map baseId -> topicKey
  const topicKeyMap = new Map();
  localQuestions.forEach(q => {
    topicKeyMap.set(q.base_id, q.topic_key);
  });

  console.log(`📊 Unique baseIds with topicKey: ${topicKeyMap.size}\n`);

  // Fetch all questions from production
  console.log('🔍 Fetching questions from production...\n');

  const allProdQuestions = [];
  let start = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: 'en',
          limit: limit,
          start: start,
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      allProdQuestions.push(...data);
      start += limit;

      if (data.length < limit) break;
      await sleep(200);
    } catch (error) {
      console.error('❌ Error fetching questions:', error.message);
      break;
    }
  }

  console.log(`✅ Found ${allProdQuestions.length} EN questions in production\n`);

  // Find questions that need topicKey update
  const toUpdate = [];
  allProdQuestions.forEach(q => {
    const baseId = q.base_id || q.baseId;
    if (baseId && topicKeyMap.has(baseId)) {
      const currentTopicKey = q.topicKey || q.topic_key;
      const correctTopicKey = topicKeyMap.get(baseId);

      if (!currentTopicKey || currentTopicKey !== correctTopicKey) {
        toUpdate.push({
          id: q.id,
          documentId: q.documentId,
          baseId: baseId,
          currentTopicKey: currentTopicKey || 'NULL',
          correctTopicKey: correctTopicKey,
        });
      }
    }
  });

  console.log(`📝 Questions needing topicKey update: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('🎉 All questions already have correct topicKey!');
    return;
  }

  console.log('Sample questions to update:');
  toUpdate.slice(0, 5).forEach(q => {
    console.log(`  - ID: ${q.id} | baseId: ${q.baseId}`);
    console.log(`    Current: ${q.currentTopicKey} -> New: ${q.correctTopicKey}`);
  });
  console.log('');

  console.log(`🔧 Updating ${toUpdate.length} questions...\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toUpdate.length; i++) {
    const q = toUpdate[i];

    try {
      await axios.put(
        PRODUCTION_URL + '/api/questions/' + q.id,
        {
          topicKey: q.correctTopicKey,
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
        console.log('\n');
      }
    }
  }

  console.log('');
  console.log('');
  console.log('🎉 Update completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

migrateTopicKeys().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
