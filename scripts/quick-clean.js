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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function quickClean() {
  console.log('🧹 Iniciando limpeza rápida de duplicações...\n');
  
  try {
    // Buscar todas as perguntas
    console.log('📊 Buscando perguntas...');
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma pergunta encontrada');
      return;
    }
    
    console.log(`📋 Encontradas ${snapshot.docs.length} perguntas no total`);
    
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
        language: language,
        question: questionText
      });
    });
    
    // Relatório inicial por idioma
    console.log('\n📊 ESTATÍSTICAS INICIAIS:');
    console.log('='.repeat(40));
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      const totalQuestions = Object.values(questionsByText).reduce((sum, questions) => sum + questions.length, 0);
      console.log(`🌍 ${language.toUpperCase()}: ${totalQuestions} perguntas`);
    });
    
    // Identificar duplicações
    console.log('\n🔍 Analisando duplicações...');
    Object.entries(questionsByLanguage).forEach(([language, questionsByText]) => {
      Object.entries(questionsByText).forEach(([questionText, questions]) => {
        if (questions.length > 1) {
          // Ordenar por data de criação (mais antiga primeiro)
          questions.sort((a, b) => a.createdAt - b.createdAt);
          
          // Manter a primeira (mais antiga) e marcar as outras para remoção
          const toRemove = questions.slice(1);
          duplicatesToRemove.push(...toRemove);
          
          console.log(`   ${language}: "${questionText.substring(0, 50)}..." (${questions.length} versões)`);
        }
      });
    });
    
    if (duplicatesToRemove.length === 0) {
      console.log('\n✅ Nenhuma duplicação encontrada!');
      return;
    }
    
    console.log(`\n🚨 Encontradas ${duplicatesToRemove.length} duplicações para remover`);
    
    // Confirmar antes de remover
    console.log('\n⚠️  ATENÇÃO: Esta operação é irreversível!');
    console.log('Para continuar, digite "SIM" e pressione Enter:');
    
    // Em produção, você pode querer adicionar uma confirmação interativa
    // Por enquanto, vamos apenas simular a remoção
    
    console.log('\n📋 RESUMO DA LIMPEZA:');
    console.log('='.repeat(40));
    
    // Agrupar por idioma para o relatório
    const removedByLanguage = {};
    duplicatesToRemove.forEach(q => {
      const lang = q.language || 'unknown';
      if (!removedByLanguage[lang]) {
        removedByLanguage[lang] = 0;
      }
      removedByLanguage[lang]++;
    });
    
    Object.entries(removedByLanguage).forEach(([language, count]) => {
      console.log(`🌍 ${language.toUpperCase()}: ${count} duplicações serão removidas`);
    });
    
    console.log(`\n📊 TOTAL: ${duplicatesToRemove.length} perguntas duplicadas`);
    
    // Para executar a remoção real, descomente o código abaixo:
    /*
    console.log('\n🗑️  Executando remoção...');
    const batch = writeBatch(db);
    
    duplicatesToRemove.forEach(question => {
      const questionRef = doc(db, 'questions', question.id);
      batch.delete(questionRef);
    });
    
    await batch.commit();
    console.log('✅ Limpeza concluída com sucesso!');
    */
    
    console.log('\n💡 Para executar a remoção real:');
    console.log('1. Edite este arquivo (scripts/quick-clean.js)');
    console.log('2. Descomente as linhas de remoção (linhas 95-103)');
    console.log('3. Execute novamente: node scripts/quick-clean.js');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar limpeza
quickClean();
