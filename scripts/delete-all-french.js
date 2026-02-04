const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function deleteAllFrench() {
  console.log('🔍 Fetching all FR questions...');
  
  const frQuestions = await fetchAllQuestions('fr');
  console.log('✅ Found ' + frQuestions.length + ' FR questions');
  console.log('');
  
  if (frQuestions.length === 0) {
    console.log('No FR questions to delete');
    return;
  }
  
  console.log('🗑️  Deleting all FR questions...');
  
  let deleted = 0;
  let errors = 0;
  
  for (let i = 0; i < frQuestions.length; i++) {
    const q = frQuestions[i];
    
    try {
      await axios.delete(
        PRODUCTION_URL + '/api/questions/' + q.documentId,
        {
          params: { locale: 'fr' },
          headers: { 'Authorization': 'Bearer ' + API_TOKEN },
        }
      );
      
      deleted++;
      process.stdout.write('\r✅ ' + (i + 1) + '/' + frQuestions.length + ' | Deleted: ' + deleted + ' | Errors: ' + errors + '  ');
      
      await sleep(100);
    } catch (error) {
      errors++;
      process.stdout.write('\r❌ ' + (i + 1) + '/' + frQuestions.length + ' | Deleted: ' + deleted + ' | Errors: ' + errors + '  ');
    }
  }
  
  console.log('');
  console.log('');
  console.log('🎉 Deletion completed!');
  console.log('   Deleted: ' + deleted);
  console.log('   Errors: ' + errors);
}

async function fetchAllQuestions(locale) {
  const questions = [];
  let start = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: { locale: locale, limit: limit, start: start },
        headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      });

      const data = response.data.data;
      if (!data || data.length === 0) break;

      questions.push(...data);
      if (questions.length >= 10000 || data.length < limit) break;
      start += limit;
    } catch (error) {
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

deleteAllFrench().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
