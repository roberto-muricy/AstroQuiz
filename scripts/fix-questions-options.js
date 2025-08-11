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

// Opções falsas baseadas no tópico
const fakeOptionsByTopic = {
  "Black Holes": [
    "Nothing happens, you can pass through safely",
    "You get compressed into a tiny point",
    "You can never return to the outside universe",
    "You travel faster than light"
  ],
  "Stars": [
    "A ball of burning gas",
    "A planet that reflects light",
    "A satellite in orbit",
    "A comet passing by"
  ],
  "Planets": [
    "A star that orbits Earth",
    "A large object that orbits a star",
    "A moon that orbits a planet",
    "An asteroid in space"
  ],
  "Galaxies": [
    "A group of planets",
    "A collection of stars, gas, and dust",
    "A single large star",
    "A cluster of asteroids"
  ],
  "Solar System": [
    "Just the Sun and Earth",
    "The Sun and all objects orbiting it",
    "All stars in the universe",
    "Only the planets"
  ],
  "Space Exploration": [
    "Studying Earth from space",
    "Sending spacecraft to explore space",
    "Looking at stars with telescopes",
    "Building rockets on Earth"
  ],
  "Cosmology": [
    "The study of Earth's atmosphere",
    "The study of the universe as a whole",
    "The study of individual stars",
    "The study of planets only"
  ],
  "Astronomy": [
    "The study of Earth's weather",
    "The study of celestial objects and phenomena",
    "The study of ocean life",
    "The study of rocks and minerals"
  ]
};

// Opções falsas genéricas para qualquer tópico
const genericFakeOptions = [
  "This is not correct",
  "This option is wrong",
  "This is incorrect",
  "This is not the right answer"
];

// Função para gerar opções baseadas na pergunta e resposta correta
function generateOptions(question, correctAnswer, topic) {
  // Se já temos opções válidas, não alterar
  if (question.options && question.options.length === 4 && 
      question.options.every(opt => opt && opt.trim() !== '' && !opt.startsWith('Opção'))) {
    return question.options;
  }

  // Pegar opções falsas baseadas no tópico
  let fakeOptions = fakeOptionsByTopic[topic] || genericFakeOptions;
  
  // Se não temos opções suficientes, duplicar ou usar genéricas
  while (fakeOptions.length < 3) {
    fakeOptions = fakeOptions.concat(genericFakeOptions);
  }
  
  // Pegar 3 opções falsas únicas
  const shuffledFakes = fakeOptions.sort(() => Math.random() - 0.5).slice(0, 3);
  
  // Criar array de opções com a resposta correta em posição aleatória
  const allOptions = [...shuffledFakes, correctAnswer];
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
  
  // Encontrar o novo índice da resposta correta
  const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
  
  return {
    options: shuffledOptions,
    correctAnswer: newCorrectIndex
  };
}

// Função para corrigir todas as perguntas
async function fixQuestionsOptions() {
  console.log('🔧 Iniciando correção das opções das perguntas...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const doc of snapshot.docs) {
      const question = doc.data();
      
      // Verificar se precisa de correção
      const needsFix = !question.options || 
                      question.options.length !== 4 ||
                      question.options.some(opt => !opt || opt.trim() === '' || opt.startsWith('Opção'));
      
      if (needsFix) {
        console.log(`🔧 Corrigindo pergunta: ${question.question.substring(0, 50)}...`);
        
        // Extrair resposta correta da explicação ou usar uma genérica
        let correctAnswer = "The correct answer";
        if (question.explanation && question.explanation.length > 10) {
          // Tentar extrair uma resposta da explicação
          const explanation = question.explanation.toLowerCase();
          if (explanation.includes('black hole')) correctAnswer = "A black hole";
          else if (explanation.includes('star')) correctAnswer = "A star";
          else if (explanation.includes('planet')) correctAnswer = "A planet";
          else if (explanation.includes('galaxy')) correctAnswer = "A galaxy";
          else if (explanation.includes('sun')) correctAnswer = "The Sun";
          else if (explanation.includes('earth')) correctAnswer = "Earth";
          else if (explanation.includes('moon')) correctAnswer = "The Moon";
          else if (explanation.includes('light')) correctAnswer = "Light";
          else if (explanation.includes('gravity')) correctAnswer = "Gravity";
          else if (explanation.includes('space')) correctAnswer = "Space";
          else correctAnswer = "The correct answer";
        }
        
        // Determinar tópico
        const topic = question.topics?.[0] || question.theme || 'Astronomy';
        
        // Gerar novas opções
        const { options, correctAnswer: newCorrectIndex } = generateOptions(question, correctAnswer, topic);
        
        // Atualizar a pergunta
        await updateDoc(doc.ref, {
          options: options,
          correctAnswer: newCorrectIndex,
          updatedAt: new Date()
        });
        
        fixedCount++;
        console.log(`✅ Corrigida: ${question.question.substring(0, 50)}...`);
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Resultado da correção:`);
    console.log(`   - Perguntas corrigidas: ${fixedCount}`);
    console.log(`   - Perguntas já corretas: ${skippedCount}`);
    console.log(`   - Total processadas: ${snapshot.docs.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir perguntas:', error);
  }
}

// Função para mostrar exemplo de perguntas
async function showQuestionExamples() {
  console.log('📋 Exemplos de perguntas atuais:');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    let count = 0;
    for (const doc of snapshot.docs) {
      if (count >= 3) break;
      
      const question = doc.data();
      console.log(`\n--- Pergunta ${count + 1} ---`);
      console.log(`Pergunta: ${question.question}`);
      console.log(`Opções: ${JSON.stringify(question.options)}`);
      console.log(`Resposta correta: ${question.correctAnswer}`);
      console.log(`Tópico: ${question.topics?.[0] || question.theme}`);
      
      count++;
    }
    
  } catch (error) {
    console.error('❌ Erro ao mostrar exemplos:', error);
  }
}

// Função principal
async function main() {
  console.log('🌟 AstroQuiz - Corretor de Opções de Perguntas');
  console.log('=============================================');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--show-examples')) {
    await showQuestionExamples();
  } else {
    await fixQuestionsOptions();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fixQuestionsOptions,
  showQuestionExamples,
  generateOptions
};
