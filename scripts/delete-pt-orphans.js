const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function deletePtOrphans() {
  console.log('🔍 Fetching PT questions...');
  
  const questions = [];
  let start = 0;

  while (true) {
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: { locale: 'pt', limit: 100, start: start },
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    });

    const data = response.data.data;
    if (!data || data.length === 0) break;

    questions.push(...data);
    if (data.length < 100) break;
    start += 100;
  }

  console.log('✅ Found ' + questions.length + ' PT questions');
  console.log('');
  console.log('🗑️  Deleting...');

  let deleted = 0;
  for (let i = 0; i < questions.length; i++) {
    try {
      await axios.delete(
        PRODUCTION_URL + '/api/questions/' + questions[i].id,
        {
          headers: { 'Authorization': 'Bearer ' + API_TOKEN },
          timeout: 10000,
        }
      );
      deleted++;
      process.stdout.write('\r✅ Deleted: ' + deleted + '/' + questions.length + '  ');
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.log('\n❌ Failed to delete:', questions[i].id);
    }
  }

  console.log('');
  console.log('');
  console.log('🎉 Deleted ' + deleted + ' PT questions');
  console.log('   EN questions remain intact (522)');
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

deletePtOrphans().catch(error => {
  console.error('\nError:', error.message);
});
