const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, onSnapshot } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

async function testFirebaseConnection() {
  try {
    console.log('🚀 Iniciando teste de conexão com Firebase...');
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase inicializado com sucesso');
    
    // Testar conexão com Firestore
    console.log('📊 Testando conexão com Firestore...');
    
    // Método 1: getDocs (leitura única)
    console.log('\n📖 Testando getDocs...');
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    console.log(`📊 Total de perguntas encontradas: ${questionsSnapshot.size}`);
    
    if (questionsSnapshot.size > 0) {
      const firstQuestion = questionsSnapshot.docs[0].data();
      console.log('🔍 Primeira pergunta:', {
        id: questionsSnapshot.docs[0].id,
        question: firstQuestion.question,
        topic: firstQuestion.topic,
        level: firstQuestion.level
      });
    }
    
    // Método 2: onSnapshot (listener em tempo real)
    console.log('\n👂 Testando onSnapshot...');
    const unsubscribe = onSnapshot(collection(db, 'questions'), (snapshot) => {
      console.log(`📊 onSnapshot - Total de perguntas: ${snapshot.size}`);
      
      if (snapshot.size > 0) {
        const questions = snapshot.docs.map(doc => ({
          id: doc.id,
          question: doc.data().question,
          topic: doc.data().topic,
          level: doc.data().level
        }));
        
        console.log('📝 Primeiras 3 perguntas:', questions.slice(0, 3));
      }
    });
    
    // Aguardar um pouco para o listener funcionar
    setTimeout(() => {
      console.log('\n⏰ Finalizando teste...');
      unsubscribe();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Erro ao conectar com Firebase:', error);
    process.exit(1);
  }
}

testFirebaseConnection();
