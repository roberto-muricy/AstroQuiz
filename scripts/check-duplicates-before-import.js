#!/usr/bin/env node
/**
 * Verifica se perguntas do CSV já existem no banco antes de importar
 * 
 * Uso:
 *   node scripts/check-duplicates-before-import.js ARQUIVO.csv [locale]
 */

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const csvFile = process.argv[2];
const locale = process.argv[3] || 'pt';

if (!csvFile) {
  console.log('❌ Uso: node scripts/check-duplicates-before-import.js ARQUIVO.csv [locale]');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.log(`❌ Arquivo não encontrado: ${csvFile}`);
  process.exit(1);
}

function normalizeText(text) {
  return text.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]/g, '');
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

async function checkDuplicates() {
  console.log('🔍 Verificando duplicatas...\n');
  
  const dbPath = path.resolve(__dirname, '../.tmp/data.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir o banco de dados:', err.message);
      process.exit(1);
    }
  });

  try {
    // 1. Load existing questions from database
    console.log('📊 Carregando perguntas existentes do banco...');
    const existingQuestions = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, question FROM questions WHERE locale = ? AND published_at IS NOT NULL",
        [locale],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log(`✅ Carregadas ${existingQuestions.length} perguntas existentes do banco\n`);
    
    // Create normalized map of existing questions
    const existingNormalized = new Map();
    for (const q of existingQuestions) {
      const normalized = normalizeText(q.question || '');
      existingNormalized.set(normalized, q);
    }
    
    // 2. Parse CSV
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const header = lines[0].split(',').map(h => h.trim());
    
    console.log(`📄 Lendo ${lines.length - 1} perguntas do CSV...\n`);
    
    const newQuestions = [];
    const duplicates = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const row = {};
      header.forEach((col, index) => {
        row[col] = values[index] || '';
      });
      
      const questionText = row.question;
      const normalized = normalizeText(questionText);
      
      if (existingNormalized.has(normalized)) {
        const existing = existingNormalized.get(normalized);
        duplicates.push({
          baseId: row.baseId,
          question: questionText.substring(0, 80) + (questionText.length > 80 ? '...' : ''),
          existingId: existing.id,
        });
      } else {
        newQuestions.push(row);
      }
    }
    
    // 3. Report results
    console.log('📊 RESULTADO DA ANÁLISE:\n');
    console.log(`   ✅ Perguntas novas (podem ser importadas): ${newQuestions.length}`);
    console.log(`   ⚠️  Perguntas duplicadas (já existem): ${duplicates.length}`);
    console.log(`   📄 Total no CSV: ${lines.length - 1}\n`);
    
    if (duplicates.length > 0) {
      console.log('🔴 DUPLICATAS ENCONTRADAS:\n');
      duplicates.forEach((dup, idx) => {
        if (idx < 10) { // Show first 10
          console.log(`   ${dup.baseId}: "${dup.question}"`);
          console.log(`      → Já existe como ID ${dup.existingId}\n`);
        }
      });
      if (duplicates.length > 10) {
        console.log(`   ... e mais ${duplicates.length - 10} duplicatas\n`);
      }
    }
    
    if (newQuestions.length === 0) {
      console.log('✅ Todas as perguntas do CSV já existem no banco!');
      console.log('   Nada a importar.\n');
      db.close();
      return;
    }
    
    // 4. Save unique questions to a new file
    const uniqueFile = csvFile.replace('.csv', '-unique.csv');
    const csvLines = [lines[0]]; // header
    
    for (const q of newQuestions) {
      const line = [
        q.baseId,
        q.topic,
        `"${q.question}"`,
        q.level,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.correctOption,
        `"${q.explanation}"`
      ].join(',');
      csvLines.push(line);
    }
    
    fs.writeFileSync(uniqueFile, csvLines.join('\n'));
    
    // 5. Next steps
    console.log('💡 PRÓXIMOS PASSOS:\n');
    console.log(`💾 Arquivo criado com apenas perguntas únicas: ${uniqueFile}`);
    console.log(`   Importar com: node scripts/import-questions.js ${uniqueFile} ${locale}\n`);

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
      }
    });
  }
}

checkDuplicates();
