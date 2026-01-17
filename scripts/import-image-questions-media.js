#!/usr/bin/env node
/**
 * Importa perguntas com imagem do image-questions.json e cria o vínculo com o Media Library
 * via files_related_mph (Strapi upload relations).
 *
 * - Não usa API HTTP (import direto no SQLite)
 * - Upsert por (base_id, locale): se já existir, atualiza e garante o vínculo
 * - Publica automaticamente (published_at = now)
 *
 * Uso:
 *   node scripts/import-image-questions-media.js
 *
 * Pré-requisitos:
 * - As imagens já precisam existir no Media Library (tabela files), com name compatível:
 *   Ex.: imageFilename "img_lucy_001.jpg" -> procura file.name = "img_lucy_001"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');
const jsonFile = path.resolve(__dirname, 'image-questions.json');

const TOPIC_TO_KEY = {
  'Space Missions': 'Space Missions',
  'Solar System': 'Solar System',
  'Space Observation': 'Space Observation',
  'Stellar Objects': 'Stellar Objects',
  'Galaxies & Cosmology': 'Galaxies & Cosmology',
};

function generateDocumentId() {
  return crypto.randomBytes(12).toString('base64url');
}

function stripExt(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

function main() {
  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Arquivo não encontrado: ${jsonFile}`);
    process.exit(1);
  }
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Banco não encontrado: ${dbPath}`);
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`📥 Importando ${items.length} perguntas com imagem (media field) ...\n`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  const now = Date.now();

  const getFileByName = db.prepare(`
    SELECT id, name, url
    FROM files
    WHERE name = ?
    LIMIT 1
  `);

  const getBestQuestionForBase = db.prepare(`
    SELECT id, base_id, locale, published_at
    FROM questions
    WHERE base_id = ? AND locale = ?
    ORDER BY
      CASE WHEN published_at IS NULL OR published_at = '' THEN 1 ELSE 0 END ASC,
      CAST(published_at AS INTEGER) DESC,
      id DESC
    LIMIT 1
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions
      (document_id, question, option_a, option_b, option_c, option_d, correct_option,
       explanation, topic, level, base_id, locale, topic_key, question_type,
       created_at, updated_at, published_at, created_by_id, updated_by_id)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateQuestion = db.prepare(`
    UPDATE questions SET
      question = ?,
      option_a = ?,
      option_b = ?,
      option_c = ?,
      option_d = ?,
      correct_option = ?,
      explanation = ?,
      topic = ?,
      level = ?,
      topic_key = ?,
      question_type = ?,
      updated_at = ?,
      published_at = ?,
      updated_by_id = ?
    WHERE id = ?
  `);

  const hasRelation = db.prepare(`
    SELECT 1
    FROM files_related_mph
    WHERE related_type = 'api::question.question'
      AND field = 'image'
      AND related_id = ?
    LIMIT 1
  `);

  const insertRelation = db.prepare(`
    INSERT INTO files_related_mph
      (file_id, related_id, related_type, field, "order")
    VALUES
      (?, ?, 'api::question.question', 'image', 1)
  `);

  const tx = db.transaction(() => {
    let created = 0;
    let updated = 0;
    let linked = 0;
    let missingFiles = 0;
    let errors = 0;

    for (const q of items) {
      const locale = q.locale || 'en';
      const baseId = q.baseId;
      const topicKey = TOPIC_TO_KEY[q.topic] || q.topic || null;

      const imageKey = q.imageFilename ? stripExt(q.imageFilename) : null;
      const file = imageKey ? getFileByName.get(imageKey) : null;

      if (!file) {
        missingFiles++;
        console.log(`   ⚠️ Sem arquivo no Media Library para ${baseId} (esperado files.name="${imageKey}")`);
      }

      try {
        const existing = baseId ? getBestQuestionForBase.get(baseId, locale) : null;

        let questionId;
        if (!existing) {
          const docId = generateDocumentId();
          const info = insertQuestion.run(
            docId,
            q.question,
            q.optionA,
            q.optionB,
            q.optionC,
            q.optionD,
            q.correctOption,
            q.explanation,
            q.topic,
            q.level,
            baseId,
            locale,
            topicKey,
            'image',
            now,
            now,
            now,
            1,
            1
          );
          questionId = info.lastInsertRowid;
          created++;
        } else {
          questionId = existing.id;
          updateQuestion.run(
            q.question,
            q.optionA,
            q.optionB,
            q.optionC,
            q.optionD,
            q.correctOption,
            q.explanation,
            q.topic,
            q.level,
            topicKey,
            'image',
            now,
            now,
            1,
            questionId
          );
          updated++;
        }

        if (file && !hasRelation.get(questionId)) {
          insertRelation.run(file.id, questionId);
          linked++;
        }

        const status = existing ? '↺' : '✓';
        console.log(`   ${status} ${baseId} (${locale}) -> qid=${questionId}${file ? `, file=${file.name}` : ''}`);
      } catch (e) {
        errors++;
        console.log(`   ✗ ${baseId} (${locale}): ${e.message}`);
      }
    }

    return { created, updated, linked, missingFiles, errors };
  });

  const result = tx();
  db.close();

  console.log('\n✅ Import concluído!');
  console.log(`   Criadas: ${result.created}`);
  console.log(`   Atualizadas: ${result.updated}`);
  console.log(`   Vínculos (imagem) criados: ${result.linked}`);
  console.log(`   Arquivos ausentes no Media Library: ${result.missingFiles}`);
  console.log(`   Erros: ${result.errors}`);
  console.log('\n📝 Dica: reinicie o Strapi após import para refletir no admin/app.');
}

main();

