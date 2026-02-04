require('dotenv').config();

const testData = {
  data: {
    question: "Teste: Qual é a velocidade da luz?",
    optionA: "300.000 km/s",
    optionB: "150.000 km/s",
    optionC: "450.000 km/s",
    optionD: "600.000 km/s",
    correctOption: "A",
    explanation: "A velocidade da luz no vácuo é de aproximadamente 300.000 km/s.",
    topic: "Física",
    level: 1,
    baseId: "test_001",
    questionType: "text",
    locale: "pt"
  }
};

(async () => {
  console.log('🧪 Testando criação de pergunta via API...\n');

  const response = await fetch('https://astroquiz-production.up.railway.app/api/questions?publish=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRAPI_WRITE_TOKEN}`
    },
    body: JSON.stringify(testData)
  });

  const result = await response.json();

  if (response.ok) {
    console.log('✓ Pergunta criada com sucesso!');
    console.log(`  ID: ${result.data.id}`);
    console.log(`  DocumentId: ${result.data.documentId}`);
    console.log(`  Locale: ${result.data.locale || 'N/A'}`);
  } else {
    console.log('✗ Erro ao criar pergunta:');
    console.log(JSON.stringify(result, null, 2));
  }

  // Verificar se foi salva no banco
  console.log('\n📊 Verificando no PostgreSQL...');

  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const count = await client.query('SELECT COUNT(*) FROM questions WHERE base_id = $1', ['test_001']);
  console.log(`  Perguntas com baseId=test_001 no banco: ${count.rows[0].count}`);

  if (count.rows[0].count > 0) {
    const question = await client.query('SELECT id, document_id, base_id, locale, question FROM questions WHERE base_id = $1', ['test_001']);
    console.log('  Dados salvos:', question.rows[0]);
  }

  await client.end();
})();
