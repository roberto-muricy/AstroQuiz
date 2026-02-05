/**
 * Fix topicKey using Strapi Documents API
 *
 * This script connects to Strapi and uses the Documents API to properly
 * update topicKey so the Admin Panel can see it.
 *
 * IMPORTANT: This must be run from within the Strapi project directory
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run strapi -- scripts:fix-topickey
 *
 * OR create a Strapi admin script in package.json:
 *   "scripts": {
 *     "fix-topickey": "node scripts/fix-topickey-via-strapi-local.js"
 *   }
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');

module.exports = async ({ strapi }) => {
  console.log('🔍 Starting topicKey migration via Documents API...\n');

  // Read topicKeys from local SQLite
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

  // Get all production questions via Documents API
  console.log('🔍 Fetching questions via Documents API...\n');

  const allQuestions = await strapi.documents('api::question.question').findMany({
    locale: 'all', // Get all locales
    limit: 10000,
  });

  console.log(`✅ Found ${allQuestions.length} questions in production\n`);

  // Group by documentId to update only once
  const toUpdate = new Map();

  for (const q of allQuestions) {
    const baseId = q.baseId || q.base_id;
    if (baseId && topicKeyMap.has(baseId)) {
      const correctTopicKey = topicKeyMap.get(baseId);
      const currentTopicKey = q.topicKey;

      if (!currentTopicKey || currentTopicKey !== correctTopicKey) {
        if (!toUpdate.has(q.documentId)) {
          toUpdate.set(q.documentId, {
            documentId: q.documentId,
            locale: q.locale,
            baseId: baseId,
            topicKey: correctTopicKey,
          });
        }
      }
    }
  }

  const documentsToUpdate = Array.from(toUpdate.values());

  console.log(`📝 Documents needing update: ${documentsToUpdate.length}\n`);

  if (documentsToUpdate.length === 0) {
    console.log('🎉 All questions already have correct topicKey!');
    return;
  }

  console.log('Sample documents to update:');
  documentsToUpdate.slice(0, 5).forEach(d => {
    console.log(`  - documentId: ${d.documentId} | baseId: ${d.baseId}`);
    console.log(`    New topicKey: ${d.topicKey}`);
  });
  console.log('');

  console.log(`🔧 Updating ${documentsToUpdate.length} documents...\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < documentsToUpdate.length; i++) {
    const doc = documentsToUpdate[i];

    try {
      // Use Documents API - this will sync with Admin Panel
      await strapi.documents('api::question.question').update({
        documentId: doc.documentId,
        locale: doc.locale,
        data: {
          topicKey: doc.topicKey,
        },
      });

      success++;
      process.stdout.write(`\r✅ ${i + 1}/${documentsToUpdate.length} | Success: ${success} | Errors: ${errors}  `);
    } catch (error) {
      errors++;
      process.stdout.write(`\r❌ ${i + 1}/${documentsToUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      if (errors === 1) {
        console.log('\n');
        console.log('First error:', error.message);
        console.log('Document:', doc.documentId);
        console.log('');
      }
    }
  }

  console.log('\n\n🎉 Update completed!');
  console.log(`   Success: ${success}`);
  console.log(`   Errors: ${errors}\n`);

  process.exit(0);
};
