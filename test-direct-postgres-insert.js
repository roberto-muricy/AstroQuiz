const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();

  console.log('🧪 Teste: Inserindo perguntas DIRETAMENTE no PostgreSQL\n');

  const now = new Date().toISOString();
  const testQuestions = [
    {
      document_id: 'test_doc_001',
      base_id: 'direct_test_001',
      locale: 'en',
      question: 'Direct PostgreSQL Test EN',
      option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
      correct_option: 'A',
      explanation: 'Test',
      topic: 'Test',
      level: 1,
      question_type: 'text',
    },
    {
      document_id: 'test_doc_001',
      base_id: 'direct_test_001',
      locale: 'pt',
      question: 'Teste Direto PostgreSQL PT',
      option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
      correct_option: 'A',
      explanation: 'Teste',
      topic: 'Teste',
      level: 1,
      question_type: 'text',
    },
  ];

  console.log('1. Inserindo perguntas de teste...');
  for (const q of testQuestions) {
    await client.query(`
      INSERT INTO questions (
        document_id, base_id, locale, question,
        option_a, option_b, option_c, option_d,
        correct_option, explanation, topic, level, question_type,
        created_at, updated_at, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      q.document_id, q.base_id, q.locale, q.question,
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.correct_option, q.explanation, q.topic, q.level, q.question_type,
      now, now, now
    ]);
    console.log(`   ✓ Inserido: ${q.locale} - ${q.question}`);
  }

  console.log('\n2. Verificando se foram salvas...');
  const result = await client.query(`
    SELECT id, document_id, base_id, locale, question
    FROM questions
    WHERE base_id = 'direct_test_001'
    ORDER BY locale
  `);

  console.log(`   Total encontrado: ${result.rows.length}`);
  result.rows.forEach(r => {
    console.log(`   - ID ${r.id} (${r.locale}): ${r.question}`);
  });

  console.log('\n3. Verificando via API...');
  const apiResponse = await fetch('https://astroquiz-production.up.railway.app/api/questions?baseId=direct_test_001&locale=en&published=all');
  const apiData = await apiResponse.json();
  console.log(`   API retornou: ${apiData.data?.length || 0} perguntas`);
  if (apiData.data?.length > 0) {
    console.log(`   ✓ Pergunta aparece na API!`);
  } else {
    console.log(`   ✗ Pergunta NÃO aparece na API (mesmo estando no banco)`);
  }

  await client.end();
})();
