const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkImageQuestions() {
  console.log('🔍 Checking for questions with images...\n');

  const locales = ['en', 'pt', 'fr', 'es'];

  for (const locale of locales) {
    console.log(`\n--- ${locale.toUpperCase()} ---`);

    try {
      const response = await axios.get(PRODUCTION_URL + '/api/questions', {
        params: {
          locale: locale,
          limit: 100,
          start: 0,
          populate: 'image',
        },
        headers: {
          'Authorization': 'Bearer ' + API_TOKEN,
        },
      });

      const questions = response.data.data;
      const withImageType = questions.filter(q => q.questionType === 'image');
      const withImageField = questions.filter(q => q.image && q.image.id);

      console.log('Total questions:', questions.length);
      console.log('questionType="image":', withImageType.length);
      console.log('With image field populated:', withImageField.length);

      if (withImageType.length > 0) {
        console.log('\nFirst 3 with questionType="image":');
        withImageType.slice(0, 3).forEach(q => {
          console.log(`  - ID: ${q.id} | documentId: ${q.documentId}`);
          console.log(`    Question: ${q.question.substring(0, 60)}...`);
          console.log(`    Image: ${q.image ? 'YES' : 'NO'}`);
        });
      }

      if (withImageField.length > 0) {
        console.log('\nFirst 3 with image field:');
        withImageField.slice(0, 3).forEach(q => {
          console.log(`  - ID: ${q.id} | documentId: ${q.documentId}`);
          console.log(`    Question: ${q.question.substring(0, 60)}...`);
          console.log(`    Image URL: ${q.image?.url || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching', locale, ':', error.message);
    }
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  console.error('   Usage: API_TOKEN="token" node scripts/check-image-questions.js');
  process.exit(1);
}

checkImageQuestions().catch(error => {
  console.error('\n\nFatal error:', error.message);
  process.exit(1);
});
