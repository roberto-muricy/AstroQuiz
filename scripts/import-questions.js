/**
 * Script para importar perguntas via API do Strapi
 *
 * Uso:
 *   node scripts/import-questions.js <arquivo.json|csv> [locale]
 *
 * Exemplo:
 *   node scripts/import-questions.js novas-perguntas.json en
 *   node scripts/import-questions.js novas-perguntas.csv pt
 */

const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const DB_PATH = path.join(__dirname, '../.tmp/data.db');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const VALID_TOPIC_KEYS = [
  'Galaxies & Cosmology', 'General Curiosities', 'Relativity & Fundamental Physics',
  'Scientists', 'Small Solar System Bodies', 'Solar System', 'Space Missions',
  'Space Observation', 'Stellar Objects', 'Worlds Beyond'
];

function loadFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const data = JSON.parse(content);
    // Suporta tanto array direto quanto { questions: [...] }
    return Array.isArray(data) ? data : data.questions;
  } else if (ext === '.csv') {
    const { parse } = require('csv-parse/sync');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    throw new Error('Formato não suportado. Use .json ou .csv');
  }
}

async function importQuestions(filePath, locale = 'en') {
  console.log('🚀 Importando perguntas de:', filePath);
  console.log('   Locale:', locale, '\n');

  const records = loadFile(filePath);
  console.log('📊', records.length, 'perguntas encontradas\n');

  const sqlite3 = require('better-sqlite3');
  const db = sqlite3(DB_PATH);

  let created = 0, skipped = 0, errors = 0;

  for (const row of records) {
    try {
      // Validar campos obrigatórios
      if (!row.question || !row.optionA || !row.optionB || !row.optionC || !row.optionD || !row.correctOption) {
        console.log('   ⚠️  Pergunta inválida (campos faltando):', row.baseId || row.question?.substring(0, 30));
        skipped++;
        continue;
      }

      // Verificar se já existe
      if (row.baseId) {
        const existing = db.prepare('SELECT id FROM questions WHERE base_id = ? AND locale = ?').get(row.baseId, locale);
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Validar topicKey
      let topicKey = row.topicKey && VALID_TOPIC_KEYS.includes(row.topicKey) ? row.topicKey : null;

      // Criar via API
      const response = await fetch(STRAPI_URL + '/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            question: row.question,
            optionA: row.optionA,
            optionB: row.optionB,
            optionC: row.optionC,
            optionD: row.optionD,
            correctOption: row.correctOption.toUpperCase(),
            explanation: row.explanation || '',
            level: parseInt(row.level) || 1,
            topicKey: topicKey,
            questionType: row.questionType || 'text',
            baseId: row.baseId || null
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log('   ❌ Erro:', row.baseId || '', errText.substring(0, 60));
        errors++;
        continue;
      }

      const result = await response.json();
      const newId = result.data.id;

      // Atualizar locale se não for EN
      if (locale !== 'en') {
        db.prepare('UPDATE questions SET locale = ? WHERE id = ?').run(locale, newId);
      }

      // Vincular imagem se especificada
      if (row.imageFileId) {
        db.prepare(`
          INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
          VALUES (?, ?, 'api::question.question', 'image', 1)
        `).run(parseInt(row.imageFileId), newId);
      }

      created++;
      process.stdout.write('\r   ✅ Importadas: ' + created + '/' + records.length);
      await delay(30);

    } catch (e) {
      console.log('\n   ❌ Erro:', e.message);
      errors++;
    }
  }

  db.close();

  console.log('\n\n' + '='.repeat(50));
  console.log('✅ Importação concluída!');
  console.log('   - Criadas:', created);
  console.log('   - Puladas (já existem):', skipped);
  console.log('   - Erros:', errors);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
📥 Importador de Perguntas para AstroQuiz

Uso:
  node scripts/import-questions.js <arquivo.json|csv> [locale]

Exemplos:
  node scripts/import-questions.js novas-perguntas.json en
  node scripts/import-questions.js novas-perguntas.json pt

Formato JSON:
  [
    {
      "baseId": "q_001",
      "question": "What is the largest planet?",
      "optionA": "Mars",
      "optionB": "Jupiter",
      "optionC": "Saturn",
      "optionD": "Earth",
      "correctOption": "B",
      "explanation": "Jupiter is the largest planet.",
      "level": 1,
      "topicKey": "Solar System",
      "questionType": "text"
    }
  ]

Campos obrigatórios: question, optionA, optionB, optionC, optionD, correctOption
Campos opcionais: baseId, explanation, level (1-5), topicKey, questionType (text/image)
`);
  process.exit(1);
}

const filePath = args[0];
const locale = args[1] || 'en';

if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo não encontrado:', filePath);
  process.exit(1);
}

importQuestions(filePath, locale).catch(console.error);
