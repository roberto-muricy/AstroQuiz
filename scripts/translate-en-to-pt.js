const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const DEEPL_API_URL = 'https://api-free.deepl.com/v2';
const DELAY_BETWEEN_REQUESTS = 500; // 500ms delay

async function translateToPortuguese() {
  if (!DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY environment variable is required');
    console.error('   Get it from DeepL dashboard or Railway environment variables');
    process.exit(1);
  }

  console.log('🔍 Fetching EN questions from production...');
  const enQuestions = await fetchAllQuestions('en');
  console.log('✅ Found ' + enQuestions.length + ' EN questions');
  console.log('');

  // Check which questions already have PT
  console.log('🔍 Checking existing PT translations...');
  const ptQuestions = await fetchAllQuestions('pt');
  const ptDocIds = new Set(ptQuestions.map(q => q.documentId));
  
  const questionsToTranslate = enQuestions.filter(q => !ptDocIds.has(q.documentId));
  console.log('✅ Found ' + ptQuestions.length + ' existing PT translations');
  console.log('📝 Need to translate: ' + questionsToTranslate.length + ' questions');
  console.log('');

  if (questionsToTranslate.length === 0) {
    console.log('🎉 All questions already translated to PT!');
    return;
  }

  console.log('🌍 Starting translation with DeepL...');
  let success = 0;
  let errors = 0;
  const errorLog = [];

  for (let i = 0; i < questionsToTranslate.length; i++) {
    const enQuestion = questionsToTranslate[i];
    
    try {
      // Translate all fields
      const translations = await translateQuestion(enQuestion);
      
      // Add PT localization
      await addPtLocalization(enQuestion.documentId, enQuestion.base_id, translations);
      
      success++;
      process.stdout.write('\r✅ Progress: ' + (i + 1) + '/' + questionsToTranslate.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');
      
      // Delay to respect rate limits
      await sleep(DELAY_BETWEEN_REQUESTS);
      
    } catch (error) {
      errors++;
      errorLog.push({
        baseId: enQuestion.base_id,
        documentId: enQuestion.documentId,
        error: error.message,
      });
      process.stdout.write('\r✅ Progress: ' + (i + 1) + '/' + questionsToTranslate.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');
    }
  }

  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Translation completed!');
  console.log('   Successfully translated: ' + success);
  console.log('   Errors: ' + errors);
  console.log('');
  console.log('Check Strapi Content Manager:');
  console.log('  - Switch locale dropdown to PT');
  console.log('  - Verify translations are correct');
  console.log('═══════════════════════════════════════');

  if (errorLog.length > 0) {
    console.log('');
    console.log('First 10 errors:');
    errorLog.slice(0, 10).forEach(err => {
      console.log('   - ' + err.baseId + ': ' + err.error);
    });
  }
}

async function translateQuestion(enQuestion) {
  // Prepare texts to translate in batch
  const textsToTranslate = [
    enQuestion.question,
    enQuestion.optionA || '',
    enQuestion.optionB || '',
    enQuestion.optionC || '',
    enQuestion.optionD || '',
    enQuestion.explanation || '',
    enQuestion.topic || '',
  ];

  const translations = await batchTranslate(textsToTranslate, 'PT');

  return {
    question: translations[0],
    optionA: translations[1],
    optionB: translations[2],
    optionC: translations[3],
    optionD: translations[4],
    explanation: translations[5],
    topic: translations[6],
    level: enQuestion.level,
    correctOption: enQuestion.correctOption,
    questionType: enQuestion.questionType || 'text',
  };
}

async function batchTranslate(texts, targetLang) {
  try {
    const response = await axios.post(DEEPL_API_URL + '/translate', {
      text: texts,
      source_lang: 'EN',
      target_lang: targetLang,
    }, {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data.translations.map(t => t.text);
  } catch (error) {
    throw new Error('DeepL translation failed: ' + (error.response?.data?.message || error.message));
  }
}

async function addPtLocalization(documentId, baseId, translations) {
  const payload = {
    documentId: documentId,
    locale: 'pt',
    question: translations.question,
    optionA: translations.optionA,
    optionB: translations.optionB,
    optionC: translations.optionC,
    optionD: translations.optionD,
    correctOption: translations.correctOption,
    explanation: translations.explanation,
    topic: translations.topic,
    level: translations.level,
    baseId: baseId,
    questionType: translations.questionType,
  };

  await axios.post(
    PRODUCTION_URL + '/api/questions/add-localization',
    payload,
    {
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
}

async function fetchAllQuestions(locale) {
  const questions = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: locale,
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      questions.push(...data);

      if (questions.length >= 10000) break;
      if (data.length < pageSize) break;
      page++;

      if (page % 10 === 0) {
        await sleep(1000);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('\n⚠️  Rate limit, waiting 5 seconds...');
        await sleep(5000);
        continue;
      }
      console.error('\nFailed to fetch page ' + page + ':', error.message);
      break;
    }
  }

  return questions;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN environment variable is required');
  console.error('   Usage: API_TOKEN="token" DEEPL_API_KEY="key" node scripts/translate-en-to-pt.js');
  process.exit(1);
}

translateToPortuguese().catch(error => {
  console.error('\n\nFatal error:', error);
  process.exit(1);
});
