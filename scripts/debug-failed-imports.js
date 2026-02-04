const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function debugFailed() {
  console.log('📖 Reading EN questions...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  const enRecords = records.filter(r => r.locale === 'en');

  console.log('🔍 Checking existing...');
  const existing = await fetchAll();
  const existingBaseIds = new Set(existing.map(q => q.baseId).filter(Boolean));
  
  const toImport = enRecords.filter(r => !existingBaseIds.has(r.base_id));
  console.log('✅ Found ' + toImport.length + ' to import');
  console.log('');

  // Try first failed one
  console.log('Testing first failed import:');
  const testQuestion = toImport[0];
  console.log('  base_id:', testQuestion.base_id);
  console.log('  question:', testQuestion.question?.substring(0, 60));
  console.log('  correctOption:', testQuestion.correct_option);
  console.log('  level:', testQuestion.level);
  console.log('');

  try {
    const response = await axios.post(
      PRODUCTION_URL + '/api/questions',
      {
        data: {
          question: testQuestion.question,
          optionA: testQuestion.option_a,
          optionB: testQuestion.option_b,
          optionC: testQuestion.option_c,
          optionD: testQuestion.option_d,
          correctOption: testQuestion.correct_option,
          explanation: testQuestion.explanation || '',
          topic: testQuestion.topic || 'Geral',
          level: parseInt(testQuestion.level) || 1,
          baseId: testQuestion.base_id,
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
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }
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

debugFailed().catch(error => {
  console.error('\nFatal error:', error.message);
});
