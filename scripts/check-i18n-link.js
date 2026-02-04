const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN || '';

async function checkI18nLink() {
  console.log('🔍 Checking i18n links...');
  
  // Get first EN question
  const enResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'en', limit: 1, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  const enQuestion = enResponse.data.data[0];
  console.log('EN Question:');
  console.log('  documentId:', enQuestion.documentId);
  console.log('  baseId:', enQuestion.baseId);
  console.log('  question:', enQuestion.question?.substring(0, 50));
  console.log('');

  // Try to get PT version with same documentId
  const ptResponse = await axios.get(PRODUCTION_URL + '/api/questions', {
    params: { locale: 'pt', limit: 100, start: 0 },
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
  });

  const ptQuestions = ptResponse.data.data;
  const ptMatch = ptQuestions.find(q => q.documentId === enQuestion.documentId);

  if (ptMatch) {
    console.log('✅ Found matching PT version:');
    console.log('  documentId:', ptMatch.documentId);
    console.log('  baseId:', ptMatch.baseId);
    console.log('  question:', ptMatch.question?.substring(0, 50));
    console.log('');
    console.log('🎉 i18n linking is working correctly!');
  } else {
    console.log('❌ No PT version found with same documentId');
    console.log('   This means translations are NOT linked to EN questions');
    console.log('');
    console.log('First PT question has documentId:', ptQuestions[0]?.documentId);
  }
}

if (!API_TOKEN) {
  console.error('❌ API_TOKEN required');
  process.exit(1);
}

checkI18nLink().catch(error => {
  console.error('Error:', error.message);
});
