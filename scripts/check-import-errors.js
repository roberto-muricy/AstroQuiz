const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function checkErrors() {
  console.log('📖 Reading EN questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const enRecords = records.filter(r => r.locale === 'en');
  const firstFailed = enRecords[246]; // First one that failed (index 246)
  
  console.log('Testing first failed question (index 246):');
  console.log('  base_id:', firstFailed.base_id);
  console.log('  question:', firstFailed.question?.substring(0, 60));
  console.log('');

  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions',
      {
        data: {
          question: firstFailed.question,
          optionA: firstFailed.option_a,
          optionB: firstFailed.option_b,
          optionC: firstFailed.option_c,
          optionD: firstFailed.option_d,
          correctOption: firstFailed.correct_option,
          explanation: firstFailed.explanation || '',
          topic: firstFailed.topic || 'Geral',
          level: parseInt(firstFailed.level) || 1,
          baseId: firstFailed.base_id,
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
    console.log('✅ Success! Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
  
  console.log('');
  console.log('Checking what was imported:');
  const check = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', 'pagination[pageSize]': 5 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('Total imported:', check.data.meta?.pagination?.total || 0);
  if (check.data.data && check.data.data.length > 0) {
    console.log('First 3:');
    check.data.data.slice(0, 3).forEach(q => {
      console.log('  -', q.base_id, '|', q.question?.substring(0, 50));
    });
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkErrors().catch(error => {
  console.error('Fatal error:', error.message);
});
