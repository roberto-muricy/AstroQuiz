#!/usr/bin/env node
/**
 * Test import of a single question to debug duplication issue
 */

require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const IMPORT_V2_ENDPOINT = `${PRODUCTION_URL}/api/questions/import-v2`;
const writeToken = process.env.STRAPI_WRITE_TOKEN;

const testQuestion = {
  baseId: 'test_single_001',
  locales: {
    en: {
      question: 'Test question in English?',
      optionA: 'Option A en',
      optionB: 'Option B en',
      optionC: 'Option C en',
      optionD: 'Option D en',
      correctOption: 'A',
      explanation: 'Explanation en',
      topic: 'Test Topic',
      topicKey: 'General Curiosities',
      level: 1,
      questionType: 'text',
    },
    pt: {
      question: 'Pergunta teste em Português?',
      optionA: 'Opção A pt',
      optionB: 'Opção B pt',
      optionC: 'Opção C pt',
      optionD: 'Opção D pt',
      correctOption: 'A',
      explanation: 'Explicação pt',
      topic: 'Tópico Teste',
      topicKey: 'General Curiosities',
      level: 1,
      questionType: 'text',
    },
  },
};

async function testImport() {
  console.log('🧪 Testando importação de 1 pergunta com 2 locales...\n');

  const response = await fetch(IMPORT_V2_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${writeToken}`,
    },
    body: JSON.stringify({ questions: [testQuestion] }),
  });

  const result = await response.json();

  console.log('Resposta do endpoint:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  // Check what was created
  console.log('Verificando o que foi criado...\n');

  const checkResponse = await fetch(`${PRODUCTION_URL}/api/questions?baseId=test_single_001`);
  const checkResult = await checkResponse.json();

  console.log(`Total de registros: ${checkResult.data.length}`);
  console.log('');

  checkResult.data.forEach((q, i) => {
    console.log(`${i + 1}. ID: ${q.id}, DocumentID: ${q.documentId}, Locale: ${q.locale}`);
  });

  // Group by documentId
  const byDocId = {};
  checkResult.data.forEach(q => {
    if (!byDocId[q.documentId]) byDocId[q.documentId] = [];
    byDocId[q.documentId].push(q.locale);
  });

  console.log('\nPor DocumentID:');
  Object.entries(byDocId).forEach(([docId, locales]) => {
    console.log(`  ${docId}: ${locales.join(', ')}`);
  });
}

testImport().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
