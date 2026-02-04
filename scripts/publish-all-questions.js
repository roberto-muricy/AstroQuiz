/**
 * Script para publicar todas as perguntas
 */

const { Client } = require('pg');

async function publishAllQuestions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:XfVRLiChCkBGaRTdftyYCXIJfWBDHKAr@yamabiko.proxy.rlwy.net:55170/railway'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Update all questions to have published_at set to now
    const result = await client.query(`
      UPDATE questions 
      SET published_at = NOW() 
      WHERE published_at IS NULL
    `);

    console.log(`Published ${result.rowCount} questions`);

    // Verify
    const count = await client.query(`
      SELECT COUNT(*) as total FROM questions WHERE published_at IS NOT NULL
    `);
    console.log(`Total published questions: ${count.rows[0].total}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

publishAllQuestions();
