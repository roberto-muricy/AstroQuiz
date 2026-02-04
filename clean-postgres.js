const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();

  console.log('🧹 Limpando perguntas antigas do PostgreSQL...\n');

  const result = await client.query('DELETE FROM questions');
  console.log(`   ✓ ${result.rowCount} perguntas deletadas\n`);

  const verify = await client.query('SELECT COUNT(*) FROM questions');
  console.log(`   Verificação: ${verify.rows[0].count} perguntas restantes`);

  await client.end();
})();
