const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function testAdminAccess() {
  console.log('🔍 Testando acesso do painel admin...');
  
  try {
    // Testar acesso às perguntas
    console.log('📝 Testando acesso às perguntas...');
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    console.log(`✅ Perguntas: ${questionsSnapshot.docs.length} encontradas`);
    
    // Testar acesso aos temas
    console.log('🎨 Testando acesso aos temas...');
    const themesSnapshot = await getDocs(collection(db, 'themes'));
    console.log(`✅ Temas: ${themesSnapshot.docs.length} encontrados`);
    
    // Testar acesso aos níveis
    console.log('📊 Testando acesso aos níveis...');
    const levelsSnapshot = await getDocs(collection(db, 'levels'));
    console.log(`✅ Níveis: ${levelsSnapshot.docs.length} encontrados`);
    
    // Mostrar exemplo de pergunta
    if (questionsSnapshot.docs.length > 0) {
      const firstQuestion = questionsSnapshot.docs[0].data();
      console.log('\n📋 Exemplo de pergunta:');
      console.log(`   Pergunta: ${firstQuestion.question}`);
      console.log(`   Opções: ${JSON.stringify(firstQuestion.options)}`);
      console.log(`   Resposta correta: ${firstQuestion.correctAnswer}`);
      console.log(`   Idioma: ${firstQuestion.language || 'não definido'}`);
    }
    
    console.log('\n✅ Todos os testes passaram! O painel admin deve funcionar.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('   Código:', error.code);
    console.error('   Mensagem:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\n🔧 Solução: Verificar regras do Firestore');
      console.log('   As regras devem permitir leitura/escrita para desenvolvimento');
    }
  }
}

testAdminAccess().catch(console.error);
