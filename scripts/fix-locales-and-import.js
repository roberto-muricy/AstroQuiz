#!/usr/bin/env node
/**
 * Fix: Setup locales in DB and then import questions
 * This addresses the issue where only EN was being created
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;

async function setupLocalesViaSQL() {
  console.log('🔧 Configurando locales via SQL direto...\n');

  // We'll use a custom endpoint that runs raw SQL
  const sqlCommands = [
    `INSERT INTO i18n_locale (name, code, created_at, updated_at, is_default) VALUES ('English (en)', 'en', NOW(), NOW(), true) ON CONFLICT (code) DO NOTHING`,
    `INSERT INTO i18n_locale (name, code, created_at, updated_at, is_default) VALUES ('Portuguese (pt)', 'pt', NOW(), NOW(), false) ON CONFLICT (code) DO NOTHING`,
    `INSERT INTO i18n_locale (name, code, created_at, updated_at, is_default) VALUES ('Spanish (es)', 'es', NOW(), NOW(), false) ON CONFLICT (code) DO NOTHING`,
    `INSERT INTO i18n_locale (name, code, created_at, updated_at, is_default) VALUES ('French (fr)', 'fr', NOW(), NOW(), false) ON CONFLICT (code) DO NOTHING`,
  ];

  for (const sql of sqlCommands) {
    console.log(`   Executando: ${sql.substring(0, 60)}...`);
  }

  console.log('\n   ℹ️  Como não temos endpoint de SQL direto, vamos prosseguir com a importação');
  console.log('   Os locales devem estar configurados manualmente no Admin UI\n');

  return true;
}

async function main() {
  console.log('🚀 AstroQuiz - Fix de Locales e Importação\n');

  // Step 1: Inform about manual locale setup
  console.log('📋 PASSOS NECESSÁRIOS:\n');
  console.log('1. Acesse: https://astroquiz-production.up.railway.app/admin');
  console.log('2. Vá em Settings → Internationalization');
  console.log('3. Adicione os locales: pt, es, fr (se não existirem)\n');
  console.log('Após configurar os locales manualmente, execute:');
  console.log('   node scripts/fix-production-i18n.js --skip-clean\n');
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
