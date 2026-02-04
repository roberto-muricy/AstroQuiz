const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function testStrapiI18n() {
  console.log('🔍 Testing if Strapi sees PT/FR as localizations...');
  console.log('');
  
  try {
    // Try to use Strapi's default REST API (uses Entity Service)
    const response = await axios.get(PRODUCTION_URL + '/api/questions', {
      params: {
        'locale': 'all',
        'pagination[pageSize]': 5,
      },
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    });
    
    console.log('Strapi REST API response:');
    console.log('  Total:', response.data.meta?.pagination?.total);
    console.log('');
    
    if (response.data.data && response.data.data.length > 0) {
      const first = response.data.data[0];
      console.log('First question:');
      console.log('  id:', first.id);
      console.log('  locale:', first.attributes?.locale);
      console.log('  localizations:', first.attributes?.localizations);
      console.log('');
      
      if (first.attributes?.localizations) {
        console.log('✅ Strapi sees localizations! i18n is working');
      } else {
        console.log('❌ No localizations found. Questions are separate entries');
      }
    }
  } catch (error) {
    console.log('❌ Strapi default REST API failed:', error.response?.status);
    console.log('   Error:', error.response?.data?.error?.message);
    console.log('');
    console.log('This means Strapi Entity Service cannot see the questions,');
    console.log('which is why Content Manager shows 0 entries.');
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

testStrapiI18n().catch(error => {
  console.error('Error:', error.message);
});
