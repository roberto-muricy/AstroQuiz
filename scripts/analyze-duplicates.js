const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeDuplicates() {
  console.log('🔍 Analisando duplicações de perguntas...\n');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma pergunta encontrada');
      return;
    }
    
    // Agrupar por idioma
    const questionsByLanguage = {};
    const questionsByBaseId = {};
    const duplicates = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const language = data.language || 'unknown';
      const baseId = data.baseId || 'no-base-id';
      const questionText = data.question || '';
      
      // Agrupar por idioma
      if (!questionsByLanguage[language]) {
        questionsByLanguage[language] = [];
      }
      questionsByLanguage[language].push({
        id: doc.id,
        ...data
      });
      
      // Agrupar por baseId
      if (!questionsByBaseId[baseId]) {
        questionsByBaseId[baseId] = [];
      }
      questionsByBaseId[baseId].push({
        id: doc.id,
        language: language,
        question: questionText,
        ...data
      });
      
      // Verificar duplicações por texto da pergunta
      const existingQuestion = questionsByLanguage[language].find(q => 
        q.id !== doc.id && 
        q.question === questionText
      );
      
      if (existingQuestion) {
        duplicates.push({
          original: existingQuestion,
          duplicate: {
            id: doc.id,
            question: questionText,
            language: language
          }
        });
      }
    });
    
    // Relatório por idioma
    console.log('📊 ESTATÍSTICAS POR IDIOMA:');
    console.log('='.repeat(50));
    
    Object.entries(questionsByLanguage).forEach(([language, questions]) => {
      console.log(`🌍 ${language.toUpperCase()}: ${questions.length} perguntas`);
    });
    
    console.log('\n📈 TOTAL GERAL:', Object.values(questionsByLanguage).reduce((sum, q) => sum + q.length, 0));
    
    // Análise de baseId
    console.log('\n🔗 ANÁLISE DE BASE_ID:');
    console.log('='.repeat(50));
    
    Object.entries(questionsByBaseId).forEach(([baseId, questions]) => {
      if (questions.length > 4) {
        console.log(`⚠️  ${baseId}: ${questions.length} versões (deveria ser ≤4)`);
        questions.forEach(q => {
          console.log(`   - ${q.language}: "${q.question.substring(0, 50)}..."`);
        });
      }
    });
    
    // Duplicações por texto
    if (duplicates.length > 0) {
      console.log('\n🚨 DUPLICAÇÕES ENCONTRADAS:');
      console.log('='.repeat(50));
      
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Idioma: ${dup.duplicate.language}`);
        console.log(`   Original: ${dup.original.id}`);
        console.log(`   Duplicata: ${dup.duplicate.id}`);
        console.log(`   Pergunta: "${dup.duplicate.question.substring(0, 80)}..."`);
        console.log('');
      });
    } else {
      console.log('\n✅ Nenhuma duplicação por texto encontrada');
    }
    
    // Sugestões de limpeza
    console.log('\n🧹 SUGESTÕES DE LIMPEZA:');
    console.log('='.repeat(50));
    
    if (duplicates.length > 0) {
      console.log('1. Remover duplicatas por texto da pergunta');
      console.log('2. Manter apenas a versão mais recente');
    }
    
    const baseIdIssues = Object.entries(questionsByBaseId).filter(([baseId, questions]) => questions.length > 4);
    if (baseIdIssues.length > 0) {
      console.log('3. Verificar baseIds com mais de 4 versões');
    }
    
    console.log('\n💡 Para limpar duplicatas, execute: node scripts/clean-duplicates.js');
    
  } catch (error) {
    console.error('❌ Erro ao analisar duplicações:', error);
  }
}

// Executar análise
analyzeDuplicates();
