/**
 * Bulk update topicKey using Strapi Content API
 *
 * This script updates questions via the Strapi Content API (PUT /api/questions/:id)
 * which now uses the Documents API internally thanks to the controllers we added.
 *
 * Usage:
 *   API_TOKEN="your-token" node scripts/bulk-update-topickey.js
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');
const DELAY = 500; // 500ms between requests to avoid rate limits

async function bulkUpdateTopicKey() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/bulk-update-topickey.js');
    process.exit(1);
  }

  console.log('🔍 Reading topicKeys from local database...\n');

  // Read from local SQLite
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const localQuestions = await new Promise((resolve, reject) => {
    db.all(`
      SELECT DISTINCT base_id, topic_key
      FROM questions
      WHERE base_id IS NOT NULL AND topic_key IS NOT NULL
      GROUP BY base_id
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  db.close();

  console.log(`✅ Found ${localQuestions.length} unique baseIds with topicKey\n`);

  // Create map
  const topicKeyMap = new Map();
  localQuestions.forEach(q => {
    topicKeyMap.set(q.base_id, q.topic_key);
  });

  // Fetch all questions from production
  console.log('🔍 Fetching questions from production...\n');

  const allQuestions = [];
  const locales = ['en', 'pt', 'fr', 'es'];

  for (const locale of locales) {
    let start = 0;
    const limit = 100;

    while (true) {
      try {
        const response = await axios.get(`${PRODUCTION_URL}/api/questions`, {
          params: { locale, limit, start },
          headers: { 'Authorization': `Bearer ${API_TOKEN}` },
        });

        const data = response.data.data;
        if (!data || data.length === 0) break;

        allQuestions.push(...data);
        start += limit;

        if (data.length < limit) break;
        await sleep(200);
      } catch (error) {
        console.error(`❌ Error fetching ${locale}:`, error.message);
        break;
      }
    }
  }

  console.log(`✅ Found ${allQuestions.length} questions total\n`);

  // Find questions that need updating
  const toUpdate = [];

  for (const q of allQuestions) {
    const baseId = q.baseId || q.base_id;
    if (baseId && topicKeyMap.has(baseId)) {
      const correctTopicKey = topicKeyMap.get(baseId);
      const currentTopicKey = q.topicKey;

      if (!currentTopicKey || currentTopicKey !== correctTopicKey) {
        toUpdate.push({
          id: q.id,
          documentId: q.documentId,
          locale: q.locale,
          baseId: baseId,
          currentTopicKey: currentTopicKey || 'NULL',
          newTopicKey: correctTopicKey,
        });
      }
    }
  }

  console.log(`📝 Questions needing update: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('🎉 All questions already have correct topicKey!');
    return;
  }

  console.log('Sample questions to update:');
  toUpdate.slice(0, 5).forEach(q => {
    console.log(`  - ID: ${q.id} | locale: ${q.locale} | baseId: ${q.baseId}`);
    console.log(`    ${q.currentTopicKey} → ${q.newTopicKey}`);
  });
  console.log('');

  console.log(`🔧 Updating via Strapi Content API...\n`);

  let success = 0;
  let errors = 0;
  const errorLog = [];

  for (let i = 0; i < toUpdate.length; i++) {
    const q = toUpdate[i];

    try {
      // Use Strapi Content API with proper format
      await axios.put(
        `${PRODUCTION_URL}/api/questions/${q.id}`,
        {
          data: {
            topicKey: q.newTopicKey,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      success++;
      process.stdout.write(`\r✅ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      await sleep(DELAY);
    } catch (error) {
      errors++;
      errorLog.push({
        id: q.id,
        baseId: q.baseId,
        error: error.response?.data?.error?.message || error.message,
      });

      process.stdout.write(`\r❌ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      if (errors === 1) {
        console.log('\n');
        console.log('First error:');
        console.log('  ID:', q.id);
        console.log('  Error:', error.response?.data || error.message);
        console.log('');
      }
    }
  }

  console.log('\n\n🎉 Bulk update completed!');
  console.log(`   Success: ${success}`);
  console.log(`   Errors: ${errors}\n`);

  if (errorLog.length > 0) {
    console.log('Error details (first 5):');
    errorLog.slice(0, 5).forEach(e => {
      console.log(`  - ${e.baseId} (ID: ${e.id}): ${e.error}`);
    });
  }

  console.log('\n💡 After this completes, refresh the Strapi Admin (Ctrl+Shift+R)');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

bulkUpdateTopicKey().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
