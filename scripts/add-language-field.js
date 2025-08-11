const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

// Palavras-chave para identificar idiomas
const portugueseKeywords = [
  'qual', 'como', 'onde', 'quando', 'por que', 'o que', 'quem',
  'estrela', 'planeta', 'galáxia', 'sistema', 'solar', 'terra',
  'lua', 'sol', 'via', 'láctea', 'buracos', 'negros', 'foguetes',
  'missões', 'espaciais', 'observatórios', 'cientistas', 'relatividade',
  'curiosidades', 'estrelas', 'planetas', 'galáxias', 'foguetes'
];

const englishKeywords = [
  'what', 'how', 'where', 'when', 'why', 'which', 'who',
  'star', 'planet', 'galaxy', 'system', 'solar', 'earth',
  'moon', 'sun', 'milky', 'way', 'black', 'holes', 'rockets',
  'space', 'missions', 'observatories', 'scientists', 'relativity',
  'curiosities', 'stars', 'planets', 'galaxies', 'rockets'
];

function detectLanguage(text) {
  if (!text) return 'unknown';
  
  const lowerText = text.toLowerCase();
  
  // Contar palavras em português
  const portugueseCount = portugueseKeywords.reduce((count, keyword) => {
    return count + (lowerText.includes(keyword) ? 1 : 0);
  }, 0);
  
  // Contar palavras em inglês
  const englishCount = englishKeywords.reduce((count, keyword) => {
    return count + (lowerText.includes(keyword) ? 1 : 0);
  }, 0);
  
  // Verificar caracteres específicos
  const hasPortugueseChars = /[àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/.test(text);
  const hasEnglishOnly = /^[a-zA-Z0-9\s.,!?;:'"()-]+$/.test(text);
  
  // Lógica de decisão
  if (portugueseCount > englishCount || hasPortugueseChars) {
    return 'pt';
  } else if (englishCount > portugueseCount || hasEnglishOnly) {
    return 'en';
  } else {
    // Se não conseguir detectar, usar português como padrão
    return 'pt';
  }
}

async function addLanguageField() {
  try {
    console.log("🌍 Iniciando adição de campo de idioma...");
    
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    console.log(`📊 Total de perguntas encontradas: ${snapshot.docs.length}`);
    
    let updatedCount = 0;
    let portugueseCount = 0;
    let englishCount = 0;
    let unknownCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const questionData = docSnapshot.data();
      const questionId = docSnapshot.id;
      
      // Detectar idioma da pergunta
      const detectedLanguage = detectLanguage(questionData.question);
      
      // Atualizar documento com campo de idioma
      await updateDoc(doc(db, 'questions', questionId), {
        language: detectedLanguage,
        updatedAt: new Date()
      });
      
      // Contar idiomas
      if (detectedLanguage === 'pt') portugueseCount++;
      else if (detectedLanguage === 'en') englishCount++;
      else unknownCount++;
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`✅ Atualizadas ${updatedCount} perguntas...`);
      }
    }
    
    console.log("\n✅ Processo concluído!");
    console.log(`📊 Total atualizado: ${updatedCount} perguntas`);
    console.log(`🇧🇷 Português: ${portugueseCount} perguntas`);
    console.log(`🇺🇸 Inglês: ${englishCount} perguntas`);
    console.log(`❓ Desconhecido: ${unknownCount} perguntas`);
    
  } catch (error) {
    console.error("❌ Erro durante o processo:", error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addLanguageField().catch(console.error);
}

module.exports = {
  detectLanguage,
  addLanguageField
};
