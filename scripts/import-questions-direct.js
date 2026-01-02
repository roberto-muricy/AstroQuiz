#!/usr/bin/env node
/**
 * Importa perguntas do CSV diretamente no banco SQLite
 * 
 * Uso:
 *   node scripts/import-questions-direct.js ARQUIVO.csv [locale]
 */

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const csvFile = process.argv[2];
const locale = process.argv[3] || 'pt';

if (!csvFile) {
  console.log('❌ Uso: node scripts/import-questions-direct.js ARQUIVO.csv [locale]');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.log(`❌ Arquivo não encontrado: ${csvFile}`);
  process.exit(1);
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function generateDocumentId() {
  return crypto.randomBytes(12).toString('base64url');
}

async function importQuestions() {
  console.log('📥 Importando perguntas direto no banco SQLite...\n');
  
  const dbPath = path.resolve(__dirname, '../.tmp/data.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir o banco de dados:', err.message);
      process.exit(1);
    }
  });

  try {
    // 1. Parse CSV
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const header = lines[0].split(',').map(h => h.trim());
    
    console.log(`📄 Lendo ${lines.length - 1} perguntas do CSV...\n`);
    
    let imported = 0;
    let errors = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const row = {};
      header.forEach((col, index) => {
        row[col] = values[index] || '';
      });
      
      const now = new Date().toISOString();
      const documentId = generateDocumentId();
      
      const questionData = {
        documentId: documentId,
        question: row.question,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctOption: row.correctOption,
        explanation: row.explanation,
        topic: row.topic || 'Geral',
        level: parseInt(row.level, 10) || 1,
        baseId: row.baseId || null,
        locale: locale,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        createdBy: null,
        updatedBy: null,
      };
      
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO questions 
            (document_id, question, option_a, option_b, option_c, option_d, correct_option, 
             explanation, topic, level, base_id, locale, created_at, updated_at, published_at, 
             created_by_id, updated_by_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              questionData.documentId,
              questionData.question,
              questionData.optionA,
              questionData.optionB,
              questionData.optionC,
              questionData.optionD,
              questionData.correctOption,
              questionData.explanation,
              questionData.topic,
              questionData.level,
              questionData.baseId,
              questionData.locale,
              questionData.createdAt,
              questionData.updatedAt,
              questionData.publishedAt,
              questionData.createdBy,
              questionData.updatedBy,
            ],
            function (err) {
              if (err) reject(err);
              else {
                console.log(`   ✓ ${row.baseId}: ${row.question.substring(0, 60)}...`);
                resolve();
              }
            }
          );
        });
        imported++;
      } catch (error) {
        console.log(`   ✗ ${row.baseId}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Importação concluída!`);
    console.log(`   ✓ Importadas: ${imported}`);
    console.log(`   ✗ Erros: ${errors}`);
    console.log(`   📊 Total: ${lines.length - 1}\n`);

  } catch (error) {
    console.error('❌ Erro fatal durante a importação:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
      }
    });
  }
}

importQuestions();
