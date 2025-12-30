#!/usr/bin/env node
/**
 * Script para importar perguntas do CSV para o Strapi
 * 
 * Uso:
 *   node scripts/import-questions.js ARQUIVO.csv [locale]
 * 
 * Exemplo:
 *   node scripts/import-questions.js minhas-perguntas.csv pt
 */

const fs = require('fs');
const axios = require('axios');

const API_URL = 'http://localhost:1337';
const locale = process.argv[3] || 'pt';
const csvFile = process.argv[2];

if (!csvFile) {
  console.log('❌ Uso: node scripts/import-questions.js ARQUIVO.csv [locale]');
  console.log('   Exemplo: node scripts/import-questions.js minhas-perguntas.csv pt');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.log(`❌ Arquivo não encontrado: ${csvFile}`);
  process.exit(1);
}

async function importQuestions() {
  console.log('📖 Lendo arquivo CSV:', csvFile);
  console.log('🌐 Locale:', locale);
  
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const header = lines[0].split(',');
  
  console.log(`📊 Encontradas ${lines.length - 1} perguntas no CSV`);
  
  let imported = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (simple parser - handle quotes)
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
    
    // Create object from header and values
    const row = {};
    header.forEach((col, index) => {
      row[col.trim()] = values[index] || '';
    });
    
    // Create question payload
    const questionData = {
      baseId: row.baseId,
      topic: row.topic,
      question: row.question,
      level: parseInt(row.level) || 1,
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
      correctOption: row.correctOption,
      explanation: row.explanation,
      locale: locale,
      publishedAt: new Date().toISOString(),
    };
    
    try {
      const response = await axios.post(
        `${API_URL}/api/questions`,
        { data: questionData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      imported++;
      process.stdout.write(`\r   ✓ Importadas: ${imported}/${lines.length - 1}`);
    } catch (error) {
      errors++;
      console.log(`\n   ✗ Erro na linha ${i + 1} (${row.baseId}):`, error.response?.data?.error?.message || error.message);
    }
  }
  
  console.log(`\n\n✅ Importação concluída!`);
  console.log(`   ✓ Importadas: ${imported}`);
  console.log(`   ✗ Erros: ${errors}`);
  console.log(`   📊 Total: ${imported + errors}`);
}

importQuestions().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
