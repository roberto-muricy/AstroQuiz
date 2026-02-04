const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const DEEPL_URL = 'https://api.deepl.com/v2';

async function translateWithLogs() {
  console.log('🔍 Fetching first 3 EN questions...');
  
  const response = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 3, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  const enQuestions = response.data.data;
  console.log('✅ Got ' + enQuestions.length + ' questions');
  console.log('');

  for (let i = 0; i < enQuestions.length; i++) {
    const q = enQuestions[i];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Question ' + (i + 1) + ':');
    console.log('  EN documentId:', q.documentId);
    console.log('  EN baseId:', q.baseId);
    console.log('  EN question:', q.question?.substring(0, 40) + '...');
    
    // Translate
    const texts = [q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.explanation, q.topic];
    
    const deeplResponse = await axios.post(DEEPL_URL + '/translate', {
      text: texts,
      source_lang: 'EN',
      target_lang: 'PT',
    }, {
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const translations = deeplResponse.data.translations.map(t => t.text);
    console.log('  ✅ Translated to PT:', translations[0].substring(0, 40) + '...');
    
    // Add localization
    console.log('  📤 Calling add-localization with documentId:', q.documentId);
    
    try {
      const addResponse = await axios.post(
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
          baseId: q.baseId,
          questionType: q.questionType || 'text',
        },
        {
          headers: {
            'Authorization': 'Bearer ' + API_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('  ✅ Response:', addResponse.data);
    } catch (error) {
      console.log('  ❌ Error:', error.response?.status, error.response?.data);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('');
  console.log('Checking results...');
  
  // Verify
  const ptResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 5, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });
  
  console.log('PT questions found:', ptResponse.data.meta?.total || 0);
  if (ptResponse.data.data && ptResponse.data.data.length > 0) {
    ptResponse.data.data.forEach((ptQ, i) => {
      const matchingEn = enQuestions.find(en => en.documentId === ptQ.documentId);
      if (matchingEn) {
        console.log('  ✅ PT question ' + (i + 1) + ' linked to EN (documentId: ' + ptQ.documentId + ')');
      } else {
        console.log('  ❌ PT question ' + (i + 1) + ' NOT linked (documentId: ' + ptQ.documentId + ')');
      }
    });
  }
}

if (!API_TOKEN || !DEEPL_API_KEY) {
  console.error('❌ API_TOKEN and DEEPL_API_KEY required');
  process.exit(1);
}

translateWithLogs().catch(error => {
  console.error('Error:', error.message);
});
