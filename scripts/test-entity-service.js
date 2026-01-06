#!/usr/bin/env node
/**
 * Script para testar o entityService do Strapi diretamente
 */

const strapi = require('@strapi/strapi');

async function testEntityService() {
  try {
    const app = await strapi().load();
    
    console.log('\n📊 Testando entityService...\n');
    
    // Test 1: Find all en questions
    const enQuestions = await app.entityService.findMany('api::question.question', {
      filters: {},
      locale: 'en',
      limit: 10,
    });
    
    console.log(`✓ EntityService EN: ${enQuestions.length} perguntas`);
    
    // Test 2: Count
    const count = await app.db.query('api::question.question').count({
      where: { locale: 'en' },
    });
    
    console.log(`✓ Query count EN: ${count} perguntas`);
    
    // Test 3: Find with pagination
    const paginated = await app.entityService.findPage('api::question.question', {
      filters: {},
      locale: 'en',
      page: 1,
      pageSize: 10,
    });
    
    console.log(`✓ EntityService paginated: ${paginated.results.length} perguntas, total: ${paginated.pagination.total}`);
    
    await app.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testEntityService();
