#!/usr/bin/env node
require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;

async function test() {
  const testData = {
    questions: [{
      baseId: 'test_multi_locale',
      locales: {
        en: {
          question: 'Test EN?',
          optionA: 'A en',
          optionB: 'B en',
          optionC: 'C en',
          optionD: 'D en',
          correctOption: 'A',
          level: 1,
        },
        pt: {
          question: 'Teste PT?',
          optionA: 'A pt',
          optionB: 'B pt',
          optionC: 'C pt',
          optionD: 'D pt',
          correctOption: 'A',
          level: 1,
        },
        es: {
          question: 'Prueba ES?',
          optionA: 'A es',
          optionB: 'B es',
          optionC: 'C es',
          optionD: 'D es',
          correctOption: 'A',
          level: 1,
        },
      },
    }],
  };

  console.log('Testing import-v2 with 1 question, 3 locales...\n');

  const response = await fetch(`${PRODUCTION_URL}/api/questions/import-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${writeToken}`,
    },
    body: JSON.stringify(testData),
  });

  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));

  // Check what was created
  const checkResponse = await fetch(`${PRODUCTION_URL}/api/questions?baseId=test_multi_locale&published=all`);
  const checkResult = await checkResponse.json();

  console.log('\nCreated records:');
  const byLocale = {};
  checkResult.data.forEach(q => {
    if (!byLocale[q.locale]) byLocale[q.locale] = 0;
    byLocale[q.locale]++;
  });

  console.log(JSON.stringify(byLocale, null, 2));
}

test().catch(console.error);
