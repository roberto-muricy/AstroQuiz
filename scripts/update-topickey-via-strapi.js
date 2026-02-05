const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');
const DELAY = 300; // 300ms between requests

async function updateTopicKeyViaStrapi() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/update-topickey-via-strapi.js');
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

  // Get all questions with topicKey from local DB grouped by baseId
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

  // Create a map baseId -> topicKey
  const topicKeyMap = new Map();
  localQuestions.forEach(q => {
    topicKeyMap.set(q.base_id, q.topic_key);
  });

  // Fetch questions from production to get documentIds
  console.log('🔍 Fetching questions from production...\n');

  const allProdQuestions = [];
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

        allProdQuestions.push(...data);
        start += limit;

        if (data.length < limit) break;
        await sleep(200);
      } catch (error) {
        console.error(`❌ Error fetching ${locale} questions:`, error.message);
        break;
      }
    }
  }

  console.log(`✅ Found ${allProdQuestions.length} questions in production (all locales)\n`);

  // Group by documentId to update only once per document (not per locale)
  const documentMap = new Map();
  allProdQuestions.forEach(q => {
    const baseId = q.baseId || q.base_id;
    if (baseId && topicKeyMap.has(baseId)) {
      const topicKey = topicKeyMap.get(baseId);
      const currentTopicKey = q.topicKey || q.topic_key;

      if (!currentTopicKey || currentTopicKey !== topicKey) {
        if (!documentMap.has(q.documentId)) {
          documentMap.set(q.documentId, {
            documentId: q.documentId,
            id: q.id,
            baseId: baseId,
            locale: q.locale,
            currentTopicKey: currentTopicKey || 'NULL',
            newTopicKey: topicKey,
          });
        }
      }
    }
  });

  const documentsToUpdate = Array.from(documentMap.values());

  console.log(`📝 Documents needing topicKey update: ${documentsToUpdate.length}\n`);

  if (documentsToUpdate.length === 0) {
    console.log('🎉 All questions already have correct topicKey!');
    return;
  }

  console.log('Sample documents to update:');
  documentsToUpdate.slice(0, 5).forEach(d => {
    console.log(`  - documentId: ${d.documentId} | baseId: ${d.baseId}`);
    console.log(`    Current: ${d.currentTopicKey} -> New: ${d.newTopicKey}`);
  });
  console.log('');

  console.log(`🔧 Updating ${documentsToUpdate.length} documents via Strapi Entity Service...\n`);

  let success = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < documentsToUpdate.length; i++) {
    const doc = documentsToUpdate[i];

    try {
      // Use Strapi's Entity Service endpoint (same as Content Manager uses)
      await axios.put(
        `${PRODUCTION_URL}/api/questions/${doc.id}`,
        {
          data: {
            topicKey: doc.newTopicKey,
          }
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
      process.stdout.write(`\r✅ ${i + 1}/${documentsToUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      await sleep(DELAY);
    } catch (error) {
      errors++;
      errorDetails.push({
        documentId: doc.documentId,
        baseId: doc.baseId,
        error: error.response?.data?.error?.message || error.message,
      });

      process.stdout.write(`\r❌ ${i + 1}/${documentsToUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      // Log first error for debugging
      if (errors === 1) {
        console.log('\n');
        console.log('First error details:');
        console.log('Error:', error.response?.data || error.message);
        console.log('Document ID:', doc.documentId);
        console.log('Base ID:', doc.baseId);
        console.log('\n');
      }
    }
  }

  console.log('');
  console.log('');
  console.log('🎉 Update completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);

  if (errorDetails.length > 0) {
    console.log('\nError details (first 5):');
    errorDetails.slice(0, 5).forEach(e => {
      console.log(`  - ${e.baseId}: ${e.error}`);
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

updateTopicKeyViaStrapi().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
