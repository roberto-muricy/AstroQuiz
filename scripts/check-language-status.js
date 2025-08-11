const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function checkLanguageStatus() {
  try {
    console.log("🌍 Verificando status dos idiomas...");
    
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    console.log(`📊 Total de perguntas: ${snapshot.docs.length}`);
    
    let portugueseCount = 0;
    let englishCount = 0;
    let noLanguageCount = 0;
    
    const portugueseQuestions = [];
    const englishQuestions = [];
    
    for (const docSnapshot of snapshot.docs) {
      const questionData = docSnapshot.data();
      const questionId = docSnapshot.id;
      
      if (questionData.language === 'pt') {
        portugueseCount++;
        if (portugueseQuestions.length < 3) {
          portugueseQuestions.push({
            id: questionId,
            question: questionData.question.substring(0, 50) + '...'
          });
        }
      } else if (questionData.language === 'en') {
        englishCount++;
        if (englishQuestions.length < 3) {
          englishQuestions.push({
            id: questionId,
            question: questionData.question.substring(0, 50) + '...'
          });
        }
      } else {
        noLanguageCount++;
      }
    }
    
    console.log("\n📈 Estatísticas de Idioma:");
    console.log(`🇧🇷 Português: ${portugueseCount} perguntas`);
    console.log(`🇺🇸 Inglês: ${englishCount} perguntas`);
    console.log(`❓ Sem idioma: ${noLanguageCount} perguntas`);
    
    if (portugueseQuestions.length > 0) {
      console.log("\n🇧🇷 Exemplos de perguntas em Português:");
      portugueseQuestions.forEach((q, index) => {
        console.log(`  ${index + 1}. ${q.question}`);
      });
    }
    
    if (englishQuestions.length > 0) {
      console.log("\n🇺🇸 Exemplos de perguntas em Inglês:");
      englishQuestions.forEach((q, index) => {
        console.log(`  ${index + 1}. ${q.question}`);
      });
    }
    
    console.log("\n✅ Verificação concluída!");
    
  } catch (error) {
    console.error("❌ Erro durante a verificação:", error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkLanguageStatus().catch(console.error);
}

module.exports = {
  checkLanguageStatus
};
