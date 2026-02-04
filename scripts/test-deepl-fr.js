const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';

async function test() {
  console.log('Testing DeepL FR translation...\n');

  // Fetch first EN question
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  const question = response.data.data[0];
  console.log('Testing with question:', question.documentId);
  console.log('Question text:', question.question);
  console.log('');

  // Test DeepL translation
  const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
  const DEEPL_URL = isFreeKey ? 'https://api-free.deepl.com/v2' : 'https://api.deepl.com/v2';

  console.log('Using DeepL URL:', DEEPL_URL);
  console.log('Using Free key:', isFreeKey);
  console.log('');

  try {
    const deeplResponse = await axios.post(DEEPL_URL + '/translate', {
      text: ['Test question'],
      source_lang: 'EN',
      target_lang: 'FR',
    }, {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('✅ DeepL translation successful!');
    console.log('Translation:', deeplResponse.data.translations[0].text);
    console.log('');
  } catch (error) {
    console.log('❌ DeepL translation failed!');
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
    console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
    console.log('Request headers:', error.config?.headers);
    console.log('');
  }

  // Test add-localization endpoint
  try {
    const addResponse = await axios.post(
      PRODUCTION_URL + '/api/questions/add-localization',
      {
        documentId: question.documentId,
        locale: 'fr',
        question: 'Question de test',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        correctOption: question.correctOption,
        explanation: 'Explication',
        topic: question.topic,
        level: question.level,
        baseId: question.base_id,
        questionType: question.questionType || 'text',
      },
      {
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ add-localization successful!');
    console.log('Response:', addResponse.data);
  } catch (error) {
    console.log('❌ add-localization failed!');
    console.log('Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

test().catch(error => {
  console.error('Fatal error:', error.message);
});
