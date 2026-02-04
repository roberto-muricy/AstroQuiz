const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const BATCH_SIZE = 100;

// Read CSV from scratchpad
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function importQuestions() {
  console.log('📖 Reading questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`✅ Found ${records.length} question records`);

  // Group questions by base_id
  const questionGroups = {};
  for (const record of records) {
    const baseId = record.base_id;
    if (!questionGroups[baseId]) {
      questionGroups[baseId] = {
        baseId,
        locales: {},
      };
    }

    const locale = record.locale;
    questionGroups[baseId].locales[locale] = {
      question: record.question,
      optionA: record.option_a,
      optionB: record.option_b,
      optionC: record.option_c,
      optionD: record.option_d,
      correctOption: record.correct_option,
      explanation: record.explanation || '',
      topic: record.topic || 'Geral',
      level: parseInt(record.level) || 1,
      questionType: 'text',
    };
  }

  const groups = Object.values(questionGroups);
  console.log(`📦 Grouped into ${groups.length} question groups`);

  // Split into batches
  const batches = [];
  for (let i = 0; i < groups.length; i += BATCH_SIZE) {
    batches.push(groups.slice(i, i + BATCH_SIZE));
  }

  console.log(`🚀 Importing ${batches.length} batches to production...`);
  console.log(`   URL: ${PRODUCTION_URL}/api/questions/import-v2`);
  console.log('');

  let totalImported = 0;
  let totalErrors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📤 Batch ${i + 1}/${batches.length} (${batch.length} groups)...`);

    try {
      const response = await axios.post(
        `${PRODUCTION_URL}/api/questions/import-v2`,
        { questions: batch },
        {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const { imported, errors, total } = response.data.data;
      totalImported += imported;
      totalErrors += errors;

      console.log(`   ✅ Imported: ${imported} questions`);
      if (errors > 0) {
        console.log(`   ⚠️  Errors: ${errors}`);
        if (response.data.data.errorDetails) {
          console.log('   Error details:', JSON.stringify(response.data.data.errorDetails, null, 2));
        }
      }
    } catch (error) {
      console.error(`   ❌ Batch ${i + 1} failed:`, error.message);
      if (error.response?.data) {
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Wait a bit between batches to avoid overwhelming the server
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Import completed!');
  console.log(`   Total imported: ${totalImported} questions`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Expected: ${records.length} (${groups.length} groups × 4 locales)`);
  console.log('═══════════════════════════════════════');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Get it from Railway dashboard > Environment Variables');
  process.exit(1);
}

importQuestions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
