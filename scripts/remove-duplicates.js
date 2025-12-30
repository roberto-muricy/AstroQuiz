const axios = require('axios');

const API_URL = 'http://localhost:1337';

async function findDuplicates() {
  try {
    console.log('🔍 Buscando todas as perguntas em português...');
    
    // Get all Portuguese questions
    const response = await axios.get(`${API_URL}/api/questions?locale=pt&pagination[limit]=1000`);
    const questions = response.data.data;
    
    console.log(`📊 Total de perguntas encontradas: ${questions.length}`);
    
    // Group by question text
    const groups = {};
    for (const q of questions) {
      const text = q.attributes.questionText.trim().toLowerCase();
      if (!groups[text]) groups[text] = [];
      groups[text].push(q);
    }
    
    // Find duplicates
    const duplicates = [];
    for (const [text, items] of Object.entries(groups)) {
      if (items.length > 1) {
        duplicates.push({ text, count: items.length, ids: items.map(i => i.id) });
      }
    }
    
    console.log(`\n🔴 Encontradas ${duplicates.length} perguntas duplicadas:\n`);
    
    for (const dup of duplicates) {
      console.log(`"${dup.text.substring(0, 60)}..." (${dup.count} cópias)`);
      console.log(`   IDs: ${dup.ids.join(', ')}`);
    }
    
    // Count total duplicates to remove (keep 1 of each)
    const toRemove = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);
    console.log(`\n📊 Total de duplicatas a remover: ${toRemove}`);
    console.log(`✅ Perguntas únicas: ${questions.length - toRemove}`);
    
    // Ask for confirmation and remove
    if (!process.argv.includes('--confirm')) {
      console.log('\n⚠️  Para remover as duplicatas, rode:');
      console.log('node scripts/remove-duplicates.js --confirm');
      return;
    }
    
    console.log('\n🗑️  Removendo duplicatas...');
    let removed = 0;
    
    for (const dup of duplicates) {
      // Keep first, remove others
      const toDelete = dup.ids.slice(1);
      for (const id of toDelete) {
        try {
          await axios.delete(`${API_URL}/api/questions/${id}`);
          removed++;
          console.log(`   ✓ Removida pergunta ID ${id}`);
        } catch (err) {
          console.log(`   ✗ Erro ao remover ID ${id}:`, err.message);
        }
      }
    }
    
    console.log(`\n✅ ${removed} perguntas duplicadas removidas!`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

findDuplicates();
