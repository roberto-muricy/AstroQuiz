const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeQuestions() {
  console.log('🔍 Analisando perguntas no banco...\n');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
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
    
  } catch (error) {
    console.error('❌ Erro ao analisar perguntas:', error);
  }
}

async function testDuplicateCleaning() {
  console.log('🧪 TESTANDO FUNCIONALIDADE DE LIMPEZA DE DUPLICAÇÕES\n');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    // Agrupar por idioma e texto da pergunta
    const questionsByLanguage = {};
    const duplicatesToRemove = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const language = data.language || 'unknown';
      const questionText = data.question || '';
      const createdAt = data.createdAt || new Date(0);
      
      if (!questionsByLanguage[language]) {
        questionsByLanguage[language] = {};
      }
      
      if (!questionsByLanguage[language][questionText]) {
        questionsByLanguage[language][questionText] = [];
      }
      
      questionsByLanguage[language][questionText].push({
        id: doc.id,
        createdAt: createdAt,
        ...data
      });
    });
    
    // Identificar duplicações
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
    
    console.log(`🔍 Encontradas ${duplicatesToRemove.length} duplicações para remoção`);
    
    if (duplicatesToRemove.length === 0) {
      console.log('✅ Nenhuma duplicação encontrada!');
      return;
    }
    
    // Agrupar duplicações por idioma para relatório
    const removedByLanguage = {};
    duplicatesToRemove.forEach(q => {
      const lang = q.language || 'unknown';
      if (!removedByLanguage[lang]) {
        removedByLanguage[lang] = 0;
      }
      removedByLanguage[lang]++;
    });
    
    console.log('\n📊 DUPLICAÇÕES POR IDIOMA:');
    Object.entries(removedByLanguage).forEach(([lang, count]) => {
      console.log(`  ${lang.toUpperCase()}: ${count} duplicações`);
    });
    
    console.log('\n⚠️ ATENÇÃO: Este é apenas um teste. Nenhuma pergunta será removida.');
    console.log('   Para realmente limpar, use o botão no painel admin.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar análise
async function main() {
  console.log('🚀 INICIANDO ANÁLISE DE DUPLICAÇÕES\n');
  
  await analyzeQuestions();
  console.log('\n' + '='.repeat(50) + '\n');
  await testDuplicateCleaning();
  
  console.log('\n✅ Análise concluída!');
}

main().catch(console.error);
