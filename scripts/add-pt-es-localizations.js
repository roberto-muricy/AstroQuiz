const fs = require('fs');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const BATCH_DELAY = 300; // 300ms between requests

// Read CSV from scratchpad
const csvPath = '/private/tmp/claude/-Users-robertomuricy-Documents-Projetos-AstroQuiz-astroquiz-backend/2798067d-8eca-4a9b-b782-ef5d926952dc/scratchpad/questions-export-full.csv';

async function addLocalizations() {
  console.log('📖 Reading questions from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Group by base_id
  const questionGroups = {};
  for (const record of records) {
    const baseId = record.base_id;
    if (!questionGroups[baseId]) {
      questionGroups[baseId] = {};
    }
    questionGroups[baseId][record.locale] = record;
  }

  console.log(`✅ Found ${Object.keys(questionGroups).length} question groups`);
  console.log('');

  // Get all EN questions from production
  console.log('🔍 Fetching existing EN questions from production...');
  const enQuestions = await fetchAllQuestions('en');
  console.log(`✅ Found ${enQuestions.length} EN questions in production`);
  console.log('');

  // Create a map of base_id -> question data
  const baseIdToQuestion = {};
  for (const q of enQuestions) {
    if (q.base_id) {
      baseIdToQuestion[q.base_id] = q;
    }
  }

  console.log('🚀 Adding PT and ES localizations...');
  let successPt = 0;
  let successEs = 0;
  let errors = 0;
  const errorLog = [];

  const baseIds = Object.keys(questionGroups);
  for (let i = 0; i < baseIds.length; i++) {
    const baseId = baseIds[i];
    const locales = questionGroups[baseId];
    const enQuestion = baseIdToQuestion[baseId];

    if (!enQuestion) {
      errors++;
      errorLog.push({ baseId, error: 'EN question not found in production' });
      continue;
    }

    // Add PT localization
    if (locales.pt) {
      try {
        await createLocalizationViaSql(enQuestion.documentId, 'pt', locales.pt);
        successPt++;
      } catch (error) {
        errors++;
        errorLog.push({ baseId, locale: 'pt', error: error.message });
      }
      await sleep(BATCH_DELAY);
    }

    // Add ES localization
    if (locales.es) {
      try {
        await createLocalizationViaSql(enQuestion.documentId, 'es', locales.es);
        successEs++;
      } catch (error) {
        errors++;
        errorLog.push({ baseId, locale: 'es', error: error.message });
      }
      await sleep(BATCH_DELAY);
    }

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === baseIds.length - 1) {
      process.stdout.write(`\r✅ Progress: ${i + 1}/${baseIds.length} | PT: ${successPt} | ES: ${successEs} | Errors: ${errors}  `);
    }
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Localization completed!');
  console.log(`   PT localizations added: ${successPt}`);
  console.log(`   ES localizations added: ${successEs}`);
  console.log(`   Errors: ${errors}`);

  if (errorLog.length > 0) {
    console.log('');
    console.log('First 10 errors:');
    errorLog.slice(0, 10).forEach(err => {
      console.log(`   - ${err.baseId} (${err.locale || 'all'}): ${err.error}`);
    });
  }
  console.log('═══════════════════════════════════════');
}

async function fetchAllQuestions(locale) {
  const questions = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(`${PRODUCTION_URL}/api/questions`, {
        params: {
          locale,
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
        },
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      questions.push(...data);

      if (data.length < pageSize) break;
      page++;
    } catch (error) {
      console.error(`\nFailed to fetch page ${page}:`, error.message);
      break;
    }
  }

  return questions;
}

async function createLocalizationViaSql(documentId, locale, questionData) {
  // Use the custom SQL insert endpoint
  const payload = {
    documentId: documentId,
    locale: locale,
    question: questionData.question,
    optionA: questionData.option_a,
    optionB: questionData.option_b,
    optionC: questionData.option_c,
    optionD: questionData.option_d,
    correctOption: questionData.correct_option,
    explanation: questionData.explanation || '',
    topic: questionData.topic || 'Geral',
    level: parseInt(questionData.level) || 1,
    baseId: questionData.base_id,
    questionType: 'text',
  };

  const response = await axios.post(
    `${PRODUCTION_URL}/api/questions/add-localization`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  return response.data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="your-token" node scripts/add-pt-es-localizations.js');
  process.exit(1);
}

addLocalizations().catch(error => {
  console.error('\n\nFatal error:', error);
  process.exit(1);
});
