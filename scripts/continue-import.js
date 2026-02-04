const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function continueImport() {
  console.log('📖 Reading EN questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const enRecords = records.filter(r => r.locale === 'en');
  console.log('✅ Total: ' + enRecords.length);
  console.log('');

  // Check what's already imported
  console.log('🔍 Checking existing questions...');
  const existing = await fetchAll();
  const existingBaseIds = new Set(existing.map(q => q.baseId).filter(Boolean));
  console.log('✅ Already imported: ' + existingBaseIds.size);
  
  const toImport = enRecords.filter(r => !existingBaseIds.has(r.base_id));
  console.log('📝 Need to import: ' + toImport.length);
  console.log('');

  if (toImport.length === 0) {
    console.log('🎉 All questions already imported!');
    return;
  }

  console.log('📤 Importing remaining questions...');
  let success = 0;
  let errors = 0;

  for (let i = 0; i < toImport.length; i++) {
    const r = toImport[i];
    
    try {
      await axios.post(
        PRODUCTION_URL + '/api/questions',
        {
          data: {
            question: r.question,
            optionA: r.option_a,
            optionB: r.option_b,
            optionC: r.option_c,
            optionD: r.option_d,
            correctOption: r.correct_option,
            explanation: r.explanation || '',
            topic: r.topic || 'Geral',
            level: parseInt(r.level) || 1,
            baseId: r.base_id,
            questionType: 'text',
          },
        },
        {
          params: { locale: 'en' },
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      success++;
      process.stdout.write('\r✅ ' + (i + 1) + '/' + toImport.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');
      await new Promise(r => setTimeout(r, 200)); // Increased delay
    } catch (error) {
      errors++;
      process.stdout.write('\r❌ ' + (i + 1) + '/' + toImport.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');
      await new Promise(r => setTimeout(r, 500)); // Delay after error
    }
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Import completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);
  console.log('   Total EN: ' + (existingBaseIds.size + success));
  console.log('═══════════════════════════════════════');
}

async function fetchAll() {
  const questions = [];
  let start = 0;

  while (true) {
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: { locale: 'en', limit: 100, start: start },
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    });

    const data = response.data.data;
    if (!data || data.length === 0) break;

    questions.push(...data);
    if (data.length < 100) break;
    start += 100;
  }

  return questions;
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

continueImport().catch(error => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
