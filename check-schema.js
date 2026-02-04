const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();

  // Verificar schema da tabela
  const schema = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'questions'
    ORDER BY ordinal_position
  `);

  console.log('=== SCHEMA DA TABELA QUESTIONS ===\n');
  if (schema.rows.length > 0) {
    schema.rows.forEach(r => {
      console.log(`  ${r.column_name.padEnd(25)} ${r.data_type.padEnd(20)} ${r.is_nullable}`);
    });
  } else {
    console.log('  Tabela questions não encontrada');
  }

  // Verificar total de perguntas
  const count = await client.query('SELECT COUNT(*) FROM questions');
  console.log(`\n  Total de perguntas: ${count.rows[0].count}`);

  await client.end();
})();
