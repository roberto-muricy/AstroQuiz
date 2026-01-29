const fs = require('fs');
const Database = require('better-sqlite3');

const API_URL = 'http://localhost:1337/api/questions';
const db = new Database('.tmp/data.db');

async function createQuestion(data, locale) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  // Load backup
  const backup = JSON.parse(fs.readFileSync('image-questions-backup.json', 'utf8'));
  const baseIds = Object.keys(backup);

  console.log(`\n🚀 Reimportando ${baseIds.length} perguntas de imagem...\n`);

  let created = 0;
  let errors = 0;

  for (const baseId of baseIds) {
    const translations = backup[baseId];

    try {
      // First, create in English via API
      const enData = translations.en || translations.pt; // fallback to pt if en missing

      const apiData = {
        question: enData.question,
        optionA: enData.optionA,
        optionB: enData.optionB,
        optionC: enData.optionC,
        optionD: enData.optionD,
        correctOption: enData.correctOption,
        explanation: enData.explanation,
        level: enData.level,
        topicKey: enData.topicKey,
        baseId: baseId,
        questionType: 'image',
        locale: 'en'
      };

      const result = await createQuestion(apiData, 'en');
      const documentId = result.data.documentId;
      const newId = result.data.id;

      // Get the actual ID from database (API returns different id format)
      const dbEntry = db.prepare(
        "SELECT id FROM questions WHERE document_id = ? AND locale = 'en'"
      ).get(documentId);

      if (!dbEntry) {
        console.log(`  ⚠️  ${baseId}: Não encontrado no DB após criação`);
        continue;
      }

      // Now add other locales directly to DB with same document_id
      const locales = ['pt', 'es', 'fr'];
      const now = Date.now();

      for (const locale of locales) {
        const localeData = translations[locale];
        if (!localeData) continue;

        db.prepare(`
          INSERT INTO questions (
            document_id, question, option_a, option_b, option_c, option_d,
            correct_option, explanation, level, topic_key, base_id,
            question_type, locale, created_at, updated_at, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'image', ?, ?, ?, ?)
        `).run(
          documentId,
          localeData.question,
          localeData.optionA,
          localeData.optionB,
          localeData.optionC,
          localeData.optionD,
          localeData.correctOption,
          localeData.explanation,
          localeData.level,
          localeData.topicKey,
          baseId,
          locale,
          now,
          now,
          now
        );
      }

      // Publish the EN version too
      db.prepare(
        "UPDATE questions SET published_at = ? WHERE document_id = ? AND locale = 'en'"
      ).run(now, documentId);

      created++;
      process.stdout.write(`   ✅ ${created}/${baseIds.length} - ${baseId}\r`);

    } catch (err) {
      console.log(`   ❌ ${baseId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`✅ Importação concluída!`);
  console.log(`   - Criadas: ${created}`);
  console.log(`   - Erros: ${errors}`);

  // Verify
  const counts = db.prepare(
    "SELECT locale, COUNT(*) as cnt FROM questions WHERE question_type = 'image' GROUP BY locale"
  ).all();
  console.log(`\n📊 Contagem final de perguntas com imagem:`);
  counts.forEach(c => console.log(`   ${c.locale}: ${c.cnt}`));

  db.close();
}

main().catch(console.error);
