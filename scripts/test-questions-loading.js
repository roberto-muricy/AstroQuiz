const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

async function testQuestionsLoading() {
  try {
    console.log("🔍 Testando carregamento de perguntas...");
    
    // Testar carregamento de perguntas
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total de perguntas encontradas: ${snapshot.docs.length}`);
    
    if (snapshot.docs.length > 0) {
      const firstQuestion = snapshot.docs[0].data();
      console.log("📝 Primeira pergunta:");
      console.log("- ID:", snapshot.docs[0].id);
      console.log("- Pergunta:", firstQuestion.question);
      console.log("- Tema:", firstQuestion.theme);
      console.log("- Nível:", firstQuestion.level);
      console.log("- Opções:", firstQuestion.options);
      console.log("- Resposta correta:", firstQuestion.correctAnswer);
    }
    
    // Testar carregamento de temas
    console.log("\n🔍 Testando carregamento de temas...");
    const themesSnapshot = await getDocs(collection(db, 'themes'));
    console.log(`📊 Total de temas encontrados: ${themesSnapshot.docs.length}`);
    
    if (themesSnapshot.docs.length > 0) {
      const firstTheme = themesSnapshot.docs[0].data();
      console.log("📝 Primeiro tema:");
      console.log("- ID:", themesSnapshot.docs[0].id);
      console.log("- Nome:", firstTheme.name);
      console.log("- Ícone:", firstTheme.icon);
    }
    
    // Testar carregamento de níveis
    console.log("\n🔍 Testando carregamento de níveis...");
    const levelsSnapshot = await getDocs(collection(db, 'levels'));
    console.log(`📊 Total de níveis encontrados: ${levelsSnapshot.docs.length}`);
    
    if (levelsSnapshot.docs.length > 0) {
      const firstLevel = levelsSnapshot.docs[0].data();
      console.log("📝 Primeiro nível:");
      console.log("- ID:", levelsSnapshot.docs[0].id);
      console.log("- Nome:", firstLevel.name);
      console.log("- Ícone:", firstLevel.icon);
    }
    
    console.log("\n✅ Teste concluído com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  }
}

testQuestionsLoading().catch(console.error);
