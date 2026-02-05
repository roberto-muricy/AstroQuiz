const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN;
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');

async function main() {
  console.log('Starting bulk update...\n');

  // Get topicKey map from local DB
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT base_id, topic_key FROM questions WHERE base_id IS NOT NULL AND topic_key IS NOT NULL GROUP BY base_id', [], (err, rows) => err ? reject(err) : resolve(rows));
  });
  db.close();

  const topicKeyMap = new Map(rows.map(r => [r.base_id, r.topic_key]));
  console.log(`Loaded ${topicKeyMap.size} topicKeys from local DB\n`);

  // Fetch EN questions only (topicKey is not localized, so updating EN updates all)
  const questions = [];
  let start = 0;

  while (true) {
    const res = await axios.get(`${PRODUCTION_URL}/api/questions`, {
      params: { locale: 'en', limit: 100, start },
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const data = res.data.data;
    if (!data || data.length === 0) break;

    questions.push(...data);
    start += 100;
    console.log(`Fetched ${questions.length} questions...`);

    if (data.length < 100) break;
  }

  console.log(`\nTotal: ${questions.length} EN questions\n`);

  // Find questions needing update
  const toUpdate = questions.filter(q => {
    const baseId = q.baseId || q.base_id;
    if (!baseId || !topicKeyMap.has(baseId)) return false;

    const correct = topicKeyMap.get(baseId);
    const current = q.topicKey;

    return !current || current !== correct;
  });

  console.log(`Need to update: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('All done!');
    return;
  }

  // Update
  let success = 0;
  let errors = 0;

  for (let i = 0; i < toUpdate.length; i++) {
    const q = toUpdate[i];
    const baseId = q.baseId || q.base_id;
    const topicKey = topicKeyMap.get(baseId);

    try {
      await axios.put(
        `${PRODUCTION_URL}/api/questions/${q.id}`,
        { data: { topicKey } },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      success++;
      process.stdout.write(`\r✅ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      errors++;
      process.stdout.write(`\r❌ ${i + 1}/${toUpdate.length} | Success: ${success} | Errors: ${errors}  `);
    }
  }

  console.log('\n\nDone!');
  console.log(`Success: ${success}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
