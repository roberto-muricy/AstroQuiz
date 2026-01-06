#!/usr/bin/env node
/**
 * Exporta perguntas do banco para CSV para validação/edição
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');
const outputFile = path.resolve(__dirname, 'questions-export.csv');

async function exportToCSV() {
  console.log('📤 Exportando perguntas para CSV...\n');

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco:', err.message);
      process.exit(1);
    }
  });

  try {
    const questions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, document_id, base_id, locale, level, topic, question, 
                option_a, option_b, option_c, option_d, correct_option, explanation,
                created_at, published_at, created_by_id
         FROM questions 
         WHERE base_id LIKE 'astro_%'
         ORDER BY base_id, locale`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log(`📊 Encontradas ${questions.length} perguntas\n`);

    // CSV header
    const header = 'ID,Document ID,Base ID,Locale,Level,Topic,Question,Option A,Option B,Option C,Option D,Correct,Explanation,Created At,Published At,Created By';
    
    // CSV rows
    const rows = questions.map(q => {
      const escape = (str) => {
        if (!str) return '';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };
      
      return [
        q.id,
        escape(q.document_id),
        escape(q.base_id),
        q.locale,
        q.level,
        escape(q.topic),
        escape(q.question),
        escape(q.option_a),
        escape(q.option_b),
        escape(q.option_c),
        escape(q.option_d),
        q.correct_option,
        escape(q.explanation),
        q.created_at,
        q.published_at,
        q.created_by_id,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    fs.writeFileSync(outputFile, csv, 'utf8');

    console.log(`✅ Exportado para: ${outputFile}`);
    console.log(`📝 Total: ${questions.length} perguntas`);
    console.log(`\nVocê pode abrir no Excel/Numbers para validar/editar.`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    db.close();
  }
}

exportToCSV();
