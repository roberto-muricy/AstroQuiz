const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const DELAY = 600; // 600ms between requests

async function translateLocally() {
  if (!DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY required');
    console.error('   Usage: API_TOKEN="token" DEEPL_API_KEY="key" node scripts/translate-locally.js');
    process.exit(1);
  }

  console.log('🔍 Fetching EN questions from production...');
  
  // Fetch EN questions
  const enQuestions = await fetchAllQuestions('en');
  console.log('✅ Found ' + enQuestions.length + ' EN questions');
  
  // Check existing PT
  const ptQuestions = await fetchAllQuestions('pt');
  const ptDocIds = new Set(ptQuestions.map(q => q.documentId));
  
  const toTranslate = enQuestions.filter(q => !ptDocIds.has(q.documentId));
  console.log('✅ Already translated: ' + ptQuestions.length);
  console.log('📝 Need to translate: ' + toTranslate.length);
  console.log('');

  if (toTranslate.length === 0) {
    console.log('🎉 All done!');
    return;
  }

  // Detect key type
  const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
  const DEEPL_URL = isFreeKey ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';
  console.log('🌍 DeepL: ' + (isFreeKey ? 'Free' : 'Pro'));
  console.log('');

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const q = toTranslate[i];
    
    try {
      // Translate
      const texts = [
        q.question,
        q.optionA || '',
        q.optionB || '',
        q.optionC || '',
        q.optionD || '',
        q.explanation || '',
        q.topic || '',
      ];

      const response = await axios.post(DEEPL_URL + '/translate', {
        text: texts,
        source_lang: 'EN',
        target_lang: 'PT',
      }, {
        headers: {
          'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const translations = response.data.translations.map(t => t.text);

      // Send to production
      await axios.post(
        PRODUCTION_URL + '/api/questions/add-localization',
        {
          documentId: q.documentId,
          locale: 'pt',
          question: translations[0],
          optionA: translations[1],
          optionB: translations[2],
          optionC: translations[3],
          optionD: translations[4],
          correctOption: q.correctOption,
          explanation: translations[5],
          topic: translations[6],
          level: q.level,
          baseId: q.base_id,
          questionType: q.questionType || 'text',
        },
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      success++;
      process.stdout.write('\r✅ ' + (i + 1) + '/' + toTranslate.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');

      await sleep(DELAY);
    } catch (error) {
      errors++;
      process.stdout.write('\r❌ ' + (i + 1) + '/' + toTranslate.length + ' | Success: ' + success + ' | Errors: ' + errors + '  ');
    }
  }

  console.log('');
  console.log('');
  console.log('🎉 Translation completed!');
  console.log('   Success: ' + success);
  console.log('   Errors: ' + errors);
}

async function fetchAllQuestions(locale) {
  const questions = [];
  let start = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: locale,
          limit: limit,
          start: start,
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      questions.push(...data);
      if (questions.length >= 10000 || data.length < limit) break;
      start += limit;

      if (start % 1000 === 0) await sleep(1000);
    } catch (error) {
      if (error.response?.status === 429) {
        await sleep(5000);
        continue;
      }
      break;
    }
  }

  return questions;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

translateLocally().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
