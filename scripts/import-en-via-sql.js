const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function importViaSql() {
  console.log('📖 Reading EN questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const enRecords = records.filter(r => r.locale === 'en');
  console.log('✅ Found ' + enRecords.length + ' EN questions');
  console.log('');

  // Truncate
  console.log('🗑️  Clearing all questions...');
  await axios.post(
    PRODUCTION_URL + '/api/questions/truncate',
    {},
    {
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      timeout: 30000,
    }
  );
  console.log('✅ Cleared');
  console.log('');

  // Import via SQL (one by one for simplicity)
  console.log('📤 Importing via SQL insert...');
  let success = 0;
  let errors = 0;

  for (const r of enRecords) {
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
      process.stdout.write('\r✅ ' + success + '/' + enRecords.length + '  ');
      
      // Small delay
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      errors++;
    }
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Import completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);
  console.log('═══════════════════════════════════════');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

importViaSql().catch(error => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
