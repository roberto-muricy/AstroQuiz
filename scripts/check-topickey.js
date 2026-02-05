const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkTopicKeys() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN required');
    console.error('   Usage: API_TOKEN="token" node scripts/check-topickey.js');
    process.exit(1);
  }

  console.log('🔍 Checking topicKey field in production...\n');

  // Fetch sample questions
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: {
      locale: 'en',
      limit: 50,
      start: 0,
    },
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
    },
  });

  const questions = response.data.data;
  const withTopicKey = questions.filter(q => q.topicKey || q.topic_key);
  const withoutTopicKey = questions.filter(q => !q.topicKey && !q.topic_key);

  console.log(`📊 Sample of ${questions.length} questions:`);
  console.log(`   With topicKey: ${withTopicKey.length}`);
  console.log(`   Without topicKey: ${withoutTopicKey.length}`);
  console.log('');

  if (withTopicKey.length > 0) {
    console.log('Sample questions WITH topicKey:');
    withTopicKey.slice(0, 3).forEach(q => {
      console.log(`  - ID: ${q.id} | topicKey: ${q.topicKey || q.topic_key}`);
      console.log(`    Question: ${q.question.substring(0, 60)}...`);
    });
    console.log('');
  }

  console.log('Sample questions WITHOUT topicKey:');
  withoutTopicKey.slice(0, 5).forEach(q => {
    console.log(`  - ID: ${q.id} | topic: ${q.topic || 'N/A'}`);
    console.log(`    Question: ${q.question.substring(0, 60)}...`);
  });
  console.log('');

  // Check local database
  console.log('🔍 Checking local database...\n');

  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.resolve(__dirname, '../.tmp/data.db');

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Could not open local database:', err.message);
      return;
    }
  });

  db.all(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN topic_key IS NOT NULL AND topic_key != '' THEN 1 END) as with_key,
      COUNT(CASE WHEN topic_key IS NULL OR topic_key = '' THEN 1 END) as without_key
    FROM questions
    WHERE locale = 'en'
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Error querying local database:', err.message);
    } else {
      const stats = rows[0];
      console.log(`📊 Local database (EN questions):`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   With topicKey: ${stats.with_key}`);
      console.log(`   Without topicKey: ${stats.without_key}`);
      console.log('');
    }

    // Sample questions from local DB
    db.all(`
      SELECT id, topic, topic_key, question
      FROM questions
      WHERE locale = 'en' AND topic_key IS NOT NULL AND topic_key != ''
      LIMIT 5
    `, [], (err, rows) => {
      if (!err && rows.length > 0) {
        console.log('Sample questions WITH topicKey in local DB:');
        rows.forEach(r => {
          console.log(`  - ID: ${r.id} | topicKey: ${r.topic_key}`);
          console.log(`    Question: ${r.question.substring(0, 60)}...`);
        });
      } else {
        console.log('No questions with topicKey found in local DB');
      }

      db.close();
    });
  });
}

checkTopicKeys().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
