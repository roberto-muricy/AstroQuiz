/**
 * Verifica diretamente no banco PostgreSQL de produção
 */

async function checkRawDB() {
  const strapi = require('../dist/src/index.js');

  console.log('🔍 Connecting to production database...\n');

  // This won't work directly - we need to use an API call
  // Let's create a temporary endpoint to check raw DB

  console.log('❌ Cannot check raw DB from script');
  console.log('   Need to check via Railway PostgreSQL console or create temp endpoint');
}

checkRawDB();
