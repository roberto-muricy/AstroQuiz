// Script para validar duplicações - Execute no console do navegador (F12)
// Cole este código no console do painel admin

console.log('🔍 INICIANDO VALIDAÇÃO DE DUPLICAÇÕES...\n');

async function validateDuplicates() {
  try {
    // Verificar se o Firebase está disponível
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase não está disponível no console');
      return;
    }

    console.log('📊 Analisando perguntas no banco...\n');
    
    const questionsRef = firebase.firestore().collection('questions');
    const snapshot = await questionsRef.get();
    
    // Contar por idioma
    const countByLanguage = {};
    const questionsByLanguage = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const language = data.language || 'unknown';
      const questionText = data.question || '';
      const createdAt = data.createdAt || new Date(0);
      
      // Contar total por idioma
      countByLanguage[language] = (countByLanguage[language] || 0) + 1;
      
      // Agrupar por texto para encontrar duplicações
      if (!questionsByLanguage[language]) {
        questionsByLanguage[language] = {};
      }
      
      if (!questionsByLanguage[language][questionText]) {
        questionsByLanguage[language][questionText] = [];
      }
      
      questionsByLanguage[language][questionText].push({
        id: doc.id,
        createdAt: createdAt,
        question: questionText,
        language: language
      });
    });
    
    // Mostrar contagem por idioma
    console.log('📊 CONTAGEM POR IDIOMA:');
    Object.entries(countByLanguage).forEach(([lang, count]) => {
      console.log(`  ${lang.toUpperCase()}: ${count} perguntas`);
    });
    
    console.log('\n🔍 ANÁLISE DE DUPLICAÇÕES:');
    
    // Analisar duplicações por idioma
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      const duplicates = [];
      
      Object.entries(questionsByText).forEach(([questionText, questions]) => {
        if (questions.length > 1) {
          duplicates.push({
            text: questionText.substring(0, 50) + '...',
            count: questions.length,
            ids: questions.map(q => q.id)
          });
        }
      });
      
      if (duplicates.length > 0) {
        console.log(`\n  🚨 ${language.toUpperCase()}: ${duplicates.length} perguntas duplicadas`);
        duplicates.forEach(dup => {
          console.log(`    - "${dup.text}" (${dup.count} cópias)`);
        });
      } else {
        console.log(`\n  ✅ ${language.toUpperCase()}: Nenhuma duplicação encontrada`);
      }
    });
    
    // Verificar se todos os idiomas têm o mesmo número de perguntas únicas
    const uniqueCountByLanguage = {};
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      uniqueCountByLanguage[language] = Object.keys(questionsByText).length;
    });
    
    console.log('\n📈 PERGUNTAS ÚNICAS POR IDIOMA:');
    Object.entries(uniqueCountByLanguage).forEach(([lang, count]) => {
      console.log(`  ${lang.toUpperCase()}: ${count} perguntas únicas`);
    });
    
    // Verificar se estão balanceados
    const counts = Object.values(uniqueCountByLanguage);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    if (minCount === maxCount) {
      console.log('\n✅ PERFEITO! Todos os idiomas têm o mesmo número de perguntas únicas.');
    } else {
      console.log(`\n⚠️ DESBALANCEADO! Diferença de ${maxCount - minCount} perguntas entre idiomas.`);
      console.log('   Isso pode indicar:');
      console.log('   - Perguntas faltando em alguns idiomas');
      console.log('   - Duplicações não removidas');
      console.log('   - Problemas na importação');
    }
    
    // Simular limpeza (sem executar)
    console.log('\n🧪 SIMULAÇÃO DE LIMPEZA:');
    
    const duplicatesToRemove = [];
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      Object.entries(questionsByText).forEach(([questionText, questions]) => {
        if (questions.length > 1) {
          // Ordenar por data de criação (mais antiga primeiro)
          questions.sort((a, b) => a.createdAt - b.createdAt);
          
          // Manter a primeira (mais antiga) e marcar as outras para remoção
          const toRemove = questions.slice(1);
          duplicatesToRemove.push(...toRemove);
        }
      });
    });
    
    if (duplicatesToRemove.length > 0) {
      const removedByLanguage = {};
      duplicatesToRemove.forEach(q => {
        const lang = q.language || 'unknown';
        if (!removedByLanguage[lang]) {
          removedByLanguage[lang] = 0;
        }
        removedByLanguage[lang]++;
      });
      
      console.log(`\n📊 SERIAM REMOVIDAS ${duplicatesToRemove.length} duplicações:`);
      Object.entries(removedByLanguage).forEach(([lang, count]) => {
        console.log(`  ${lang.toUpperCase()}: ${count} duplicações`);
      });
      
      console.log('\n💡 Para limpar realmente, use o botão "🧹 LIMPAR DUPLICATAS" no painel.');
    } else {
      console.log('\n✅ Nenhuma duplicação seria removida.');
    }
    
  } catch (error) {
    console.error('❌ Erro na validação:', error);
  }
}

// Executar validação
validateDuplicates();
