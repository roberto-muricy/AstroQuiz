const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.firebasestorage.app",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function simpleTest() {
  try {
    console.log('🧪 Teste Simples do Firebase\n');
    
    // Testar leitura de uma coleção que sabemos que existe
    console.log('1️⃣ Testando leitura da coleção questions...');
    const questionsDoc = await getDoc(doc(db, 'questions', 'test'));
    console.log('✅ Conexão com Firebase funcionando!');
    
    if (questionsDoc.exists()) {
      console.log('   Documento encontrado');
    } else {
      console.log('   Documento não encontrado (esperado)');
    }
    
    // Testar leitura da coleção gameRules
    console.log('\n2️⃣ Testando leitura da coleção gameRules...');
    const rulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
    
    if (rulesDoc.exists()) {
      console.log('✅ Regras do jogo encontradas!');
      const data = rulesDoc.data();
      console.log(`   Versão: ${data.version || 'N/A'}`);
      console.log(`   Tempo por pergunta: ${data.timePerQuestion || 'N/A'}s`);
    } else {
      console.log('ℹ️  Nenhuma regra encontrada (será criada pelo painel admin)');
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('   O painel admin deve funcionar corretamente.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n💡 Dicas para resolver:');
    console.log('   1. Verifique se as regras do Firestore foram atualizadas');
    console.log('   2. Aguarde alguns minutos para as regras serem aplicadas');
    console.log('   3. Teste diretamente no painel admin');
  }
}

simpleTest();
