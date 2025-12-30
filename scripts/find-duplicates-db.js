/**
 * Script para encontrar e remover perguntas duplicadas
 * Rode com: npm run strapi console
 * Depois cole este código no console
 */

module.exports = async ({ strapi }) => {
  console.log('🔍 Buscando todas as perguntas em português...');
  
  try {
    // Get all Portuguese questions directly from DB
    const questions = await strapi.db.query('api::question.question').findMany({
      where: { locale: 'pt' },
      limit: 1000,
    });
    
    console.log(`📊 Total de perguntas encontradas: ${questions.length}`);
    
    // Group by question text
    const groups = {};
    for (const q of questions) {
      const text = (q.questionText || '').trim().toLowerCase();
      if (!text) continue;
      if (!groups[text]) groups[text] = [];
      groups[text].push(q);
    }
    
    // Find duplicates
    const duplicates = [];
    for (const [text, items] of Object.entries(groups)) {
      if (items.length > 1) {
        duplicates.push({ 
          text, 
          count: items.length, 
          ids: items.map(i => i.id),
          levels: items.map(i => i.level),
        });
      }
    }
    
    console.log(`\n🔴 Encontradas ${duplicates.length} perguntas duplicadas:\n`);
    
    for (const dup of duplicates.slice(0, 10)) { // Show first 10
      console.log(`"${dup.text.substring(0, 60)}..." (${dup.count} cópias)`);
      console.log(`   IDs: ${dup.ids.join(', ')} | Levels: ${dup.levels.join(', ')}`);
    }
    
    if (duplicates.length > 10) {
      console.log(`\n... e mais ${duplicates.length - 10} duplicatas`);
    }
    
    // Count total duplicates to remove (keep 1 of each)
    const toRemove = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);
    console.log(`\n📊 Total de duplicatas a remover: ${toRemove}`);
    console.log(`✅ Perguntas únicas: ${questions.length - toRemove}`);
    
    // Remove duplicates (keep first of each group)
    if (process.argv.includes('--remove')) {
      console.log('\n🗑️  Removendo duplicatas...');
      let removed = 0;
      
      for (const dup of duplicates) {
        // Keep first, remove others
        const toDelete = dup.ids.slice(1);
        for (const id of toDelete) {
          try {
            await strapi.db.query('api::question.question').delete({ where: { id } });
            removed++;
            process.stdout.write(`\r   ✓ Removidas: ${removed}/${toRemove}`);
          } catch (err) {
            console.log(`\n   ✗ Erro ao remover ID ${id}:`, err.message);
          }
        }
      }
      
      console.log(`\n\n✅ ${removed} perguntas duplicadas removidas!`);
    } else {
      console.log('\n⚠️  Para remover as duplicatas, adicione --remove ao comando');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
};
