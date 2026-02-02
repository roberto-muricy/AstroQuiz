#!/usr/bin/env node
/**
 * TRUNCATE questions table in production via API
 */

require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;

async function truncate() {
  console.log('🗑️  Limpando tabela questions via SQL...\n');

  // Create a simple endpoint call
  const response = await fetch(`${PRODUCTION_URL}/api/questions/truncate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${writeToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Erro:', result);
    process.exit(1);
  }

  console.log('✅ Tabela limpa!');
  console.log(JSON.stringify(result, null, 2));
}

truncate().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
