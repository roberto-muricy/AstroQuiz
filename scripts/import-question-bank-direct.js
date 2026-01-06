#!/usr/bin/env node
/**
 * Importa question-bank.json direto no SQLite (.tmp/data.db).
 * Não usa API HTTP, então ignora permissões de rota.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const FILE = path.join(__dirname, 'question-bank.json');
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');

function generateDocumentId() {
  return crypto.randomBytes(12).toString('base64url');
}

async function run() {
  if (!fs.existsSync(FILE)) {
    console.error(`❌ question-bank.json não encontrado em ${FILE}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`📥 Importando ${questions.length} perguntas direto no banco SQLite (${DB_PATH})...`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir o banco de dados:', err.message);
      process.exit(1);
    }
  });

  let ok = 0;
  let err = 0;
  const now = new Date().toISOString();

  for (const q of questions) {
    const docId = generateDocumentId();
    const row = {
      document_id: docId,
      question: q.question,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      explanation: q.explanation,
      topic: q.topic,
      level: q.level,
      base_id: q.baseId || null,
      locale: q.locale || 'en',
      created_at: now,
      updated_at: now,
      published_at: now,
      created_by_id: null,
      updated_by_id: null,
    };

    try {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO questions 
          (document_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, topic, level, base_id, locale, created_at, updated_at, published_at, created_by_id, updated_by_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.document_id,
            row.question,
            row.option_a,
            row.option_b,
            row.option_c,
            row.option_d,
            row.correct_option,
            row.explanation,
            row.topic,
            row.level,
            row.base_id,
            row.locale,
            row.created_at,
            row.updated_at,
            row.published_at,
            row.created_by_id,
            row.updated_by_id,
          ],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      ok++;
      if ((ok + err) % 25 === 0) {
        console.log(`   Progresso: ${ok + err}/${questions.length}`);
      }
    } catch (e) {
      err++;
      console.warn(`   Falha (${q.baseId || 'sem baseId'}): ${e.message}`);
    }
  }

  console.log(`\n✅ Concluído. Sucesso: ${ok} | Erros: ${err} | Total: ${questions.length}`);
  db.close();
}

run().catch((e) => {
  console.error('❌ Erro fatal:', e.message);
  process.exit(1);
});
