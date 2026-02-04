const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function freshImport() {
  console.log('📖 Reading EN questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  // Filter only EN
  const enRecords = records.filter(r => r.locale === 'en');
  console.log('✅ Found ' + enRecords.length + ' EN questions');
  console.log('');

  // Step 1: Truncate
  console.log('🗑️  Step 1: Clearing all questions...');
  await axios.post(
    PRODUCTION_URL + '/api/questions/truncate',
    {},
    {
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      timeout: 30000,
    }
  );
  console.log('✅ All questions deleted');
  console.log('');

  // Step 2: Import EN only
  console.log('📤 Step 2: Importing ' + enRecords.length + ' EN questions...');
  
  const batch = enRecords.map(r => ({
    baseId: r.base_id,
    locales: {
      en: {
        question: r.question,
        optionA: r.option_a,
        optionB: r.option_b,
        optionC: r.option_c,
        optionD: r.option_d,
        correctOption: r.correct_option,
        explanation: r.explanation || '',
        topic: r.topic || 'Geral',
        level: parseInt(r.level) || 1,
        questionType: 'text',
      },
    },
  }));

  // Import in chunks of 50
  let imported = 0;
  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50);
    
    try {
      const response = await axios.post(
        PRODUCTION_URL + '/api/questions/import-v2',
        { questions: chunk },
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
      
      imported += response.data.data.imported;
      process.stdout.write('\r✅ Imported: ' + imported + '/' + enRecords.length + '  ');
    } catch (error) {
      console.error('\n❌ Chunk failed:', error.message);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Fresh import completed!');
  console.log('   EN questions imported: ' + imported);
  console.log('');
  console.log('Next step: Translate to PT');
  console.log('  API_TOKEN="..." DEEPL_API_KEY="..." node scripts/translate-locally.js');
  console.log('═══════════════════════════════════════');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

freshImport().catch(error => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
