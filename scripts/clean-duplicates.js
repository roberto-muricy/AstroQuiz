const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } = require('firebase/firestore');

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

async function cleanDuplicates() {
  console.log('🧹 Iniciando limpeza de duplicações...\n');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma pergunta encontrada');
      return;
    }
    
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
          
          console.log(`🔍 ${language}: "${questionText.substring(0, 50)}..."`);
          console.log(`   Manter: ${questions[0].id} (${questions[0].createdAt})`);
          toRemove.forEach(q => {
            console.log(`   Remover: ${q.id} (${q.createdAt})`);
          });
          console.log('');
        }
      });
    });
    
    if (duplicatesToRemove.length === 0) {
      console.log('✅ Nenhuma duplicação encontrada para remoção');
      return;
    }
    
    console.log(`🚨 Encontradas ${duplicatesToRemove.length} duplicações para remover`);
    console.log('\n⚠️  ATENÇÃO: Esta operação é irreversível!');
    console.log('Deseja continuar? (Digite "SIM" para confirmar)');
    
    // Em produção, você pode querer adicionar uma confirmação interativa
    // Por enquanto, vamos apenas simular a remoção
    
    console.log('\n📋 RESUMO DA LIMPEZA:');
    console.log('='.repeat(50));
    
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
      console.log(`🌍 ${language.toUpperCase()}: ${count} duplicações removidas`);
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
    
    console.log('\n💡 Para executar a remoção real, edite este script e descomente o código de remoção');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar limpeza
cleanDuplicates();
