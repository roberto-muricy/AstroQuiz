const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where } = require('firebase/firestore');

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

// Estrutura de dados base
const baseThemes = [
  {
    id: "planets",
    name: "Planetas",
    description: "Conheça os planetas do Sistema Solar e suas características únicas",
    icon: "🪐",
    color: "#4CAF50",
    gradientStart: "#4CAF50",
    gradientEnd: "#45a049",
    topics: ["Mercúrio", "Vênus", "Terra", "Marte", "Júpiter", "Saturno", "Urano", "Netuno"],
    difficultyRange: [1, 5],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "stars",
    name: "Estrelas",
    description: "Explore o universo das estrelas, desde o nosso Sol até as gigantes vermelhas",
    icon: "⭐",
    color: "#FF9800",
    gradientStart: "#FF9800",
    gradientEnd: "#F57C00",
    topics: ["Sol", "Anãs Brancas", "Gigantes Vermelhas", "Supernovas", "Nebulosas"],
    difficultyRange: [1, 5],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "galaxies",
    name: "Galáxias",
    description: "Descubra as diferentes galáxias do universo e suas estruturas",
    icon: "🌌",
    color: "#9C27B0",
    gradientStart: "#9C27B0",
    gradientEnd: "#7B1FA2",
    topics: ["Via Láctea", "Andrômeda", "Galáxias Espirais", "Galáxias Elípticas", "Quasares"],
    difficultyRange: [2, 5],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "space-exploration",
    name: "Exploração Espacial",
    description: "A história da exploração espacial e as missões mais importantes",
    icon: "🚀",
    color: "#2196F3",
    gradientStart: "#2196F3",
    gradientEnd: "#1976D2",
    topics: ["Apollo", "ISS", "Mars Rovers", "Telescópios", "Satélites"],
    difficultyRange: [1, 4],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "cosmology",
    name: "Cosmologia",
    description: "Os grandes mistérios do universo e sua origem",
    icon: "🌍",
    color: "#607D8B",
    gradientStart: "#607D8B",
    gradientEnd: "#455A64",
    topics: ["Big Bang", "Matéria Escura", "Energia Escura", "Expansão do Universo", "Buracos Negros"],
    difficultyRange: [3, 5],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  }
];

const baseLevels = [
  {
    id: "1-basic",
    number: 1,
    name: "Básico",
    description: "Conceitos fundamentais de astronomia para iniciantes",
    difficulty: "easy",
    requiredScore: 0,
    maxQuestions: 10,
    timeLimit: 15,
    color: "#4CAF50",
    emoji: "🌍",
    isUnlocked: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "2-intermediate",
    number: 2,
    name: "Intermediário",
    description: "Conhecimentos intermediários sobre astronomia",
    difficulty: "medium",
    requiredScore: 100,
    maxQuestions: 12,
    timeLimit: 12,
    color: "#FF9800",
    emoji: "🌙",
    isUnlocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "3-advanced",
    number: 3,
    name: "Avançado",
    description: "Conceitos avançados e detalhados de astronomia",
    difficulty: "hard",
    requiredScore: 250,
    maxQuestions: 15,
    timeLimit: 10,
    color: "#F44336",
    emoji: "⭐",
    isUnlocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "4-expert",
    number: 4,
    name: "Especialista",
    description: "Nível para especialistas em astronomia",
    difficulty: "expert",
    requiredScore: 500,
    maxQuestions: 20,
    timeLimit: 8,
    color: "#9C27B0",
    emoji: "🌌",
    isUnlocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "5-master",
    number: 5,
    name: "Mestre",
    description: "O nível mais alto de conhecimento astronômico",
    difficulty: "master",
    requiredScore: 1000,
    maxQuestions: 25,
    timeLimit: 6,
    color: "#000000",
    emoji: "👑",
    isUnlocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const baseQuestions = [
  {
    id: "q_001",
    question: "Qual é o planeta mais próximo do Sol?",
    options: ["Mercúrio", "Vênus", "Terra", "Marte"],
    correctAnswer: 0,
    explanation: "Mercúrio é o planeta mais próximo do Sol, localizado a aproximadamente 57,9 milhões de km.",
    level: 1,
    themes: ["planets", "space-exploration"],
    categories: ["basic-astronomy"],
    difficulty: "easy",
    tags: ["planets", "solar-system", "mercury"],
    metadata: {
      source: "NASA",
      verified: true,
      lastReviewed: new Date(),
      reviewCount: 0
    },
    stats: {
      timesAsked: 0,
      correctAnswers: 0,
      averageTime: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "q_002",
    question: "Qual é o maior planeta do Sistema Solar?",
    options: ["Terra", "Marte", "Júpiter", "Saturno"],
    correctAnswer: 2,
    explanation: "Júpiter é o maior planeta do Sistema Solar, com uma massa 318 vezes maior que a da Terra.",
    level: 1,
    themes: ["planets"],
    categories: ["basic-astronomy"],
    difficulty: "easy",
    tags: ["planets", "solar-system", "jupiter"],
    metadata: {
      source: "NASA",
      verified: true,
      lastReviewed: new Date(),
      reviewCount: 0
    },
    stats: {
      timesAsked: 0,
      correctAnswers: 0,
      averageTime: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "q_003",
    question: "Qual é a estrela mais próxima da Terra?",
    options: ["Alpha Centauri", "Sol", "Sirius", "Proxima Centauri"],
    correctAnswer: 1,
    explanation: "O Sol é a estrela mais próxima da Terra, localizada a aproximadamente 150 milhões de km.",
    level: 1,
    themes: ["stars"],
    categories: ["basic-astronomy"],
    difficulty: "easy",
    tags: ["stars", "sun", "solar-system"],
    metadata: {
      source: "NASA",
      verified: true,
      lastReviewed: new Date(),
      reviewCount: 0
    },
    stats: {
      timesAsked: 0,
      correctAnswers: 0,
      averageTime: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "q_004",
    question: "Em que galáxia vivemos?",
    options: ["Andrômeda", "Via Láctea", "Triângulo", "Pequena Nuvem de Magalhães"],
    correctAnswer: 1,
    explanation: "Vivemos na galáxia Via Láctea, uma galáxia espiral que contém bilhões de estrelas.",
    level: 1,
    themes: ["galaxies"],
    categories: ["basic-astronomy"],
    difficulty: "easy",
    tags: ["galaxies", "milky-way"],
    metadata: {
      source: "NASA",
      verified: true,
      lastReviewed: new Date(),
      reviewCount: 0
    },
    stats: {
      timesAsked: 0,
      correctAnswers: 0,
      averageTime: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  {
    id: "q_005",
    question: "Qual foi a primeira missão tripulada a pousar na Lua?",
    options: ["Apollo 11", "Apollo 10", "Apollo 12", "Apollo 13"],
    correctAnswer: 0,
    explanation: "A Apollo 11 foi a primeira missão tripulada a pousar na Lua, em 20 de julho de 1969.",
    level: 1,
    themes: ["space-exploration"],
    categories: ["space-history"],
    difficulty: "easy",
    tags: ["apollo", "moon", "space-exploration"],
    metadata: {
      source: "NASA",
      verified: true,
      lastReviewed: new Date(),
      reviewCount: 0
    },
    stats: {
      timesAsked: 0,
      correctAnswers: 0,
      averageTime: 0
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  }
];

const baseQuestionSets = [
  {
    id: "planets_level1",
    name: "Planetas - Nível Básico",
    description: "Conjunto de perguntas sobre planetas para iniciantes",
    theme: "planets",
    level: 1,
    questions: ["q_001", "q_002"],
    questionCount: 2,
    timeLimit: 15,
    difficulty: "easy",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "stars_level1",
    name: "Estrelas - Nível Básico",
    description: "Conjunto de perguntas sobre estrelas para iniciantes",
    theme: "stars",
    level: 1,
    questions: ["q_003"],
    questionCount: 1,
    timeLimit: 15,
    difficulty: "easy",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "galaxies_level1",
    name: "Galáxias - Nível Básico",
    description: "Conjunto de perguntas sobre galáxias para iniciantes",
    theme: "galaxies",
    level: 1,
    questions: ["q_004"],
    questionCount: 1,
    timeLimit: 15,
    difficulty: "easy",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "space-exploration_level1",
    name: "Exploração Espacial - Nível Básico",
    description: "Conjunto de perguntas sobre exploração espacial para iniciantes",
    theme: "space-exploration",
    level: 1,
    questions: ["q_005"],
    questionCount: 1,
    timeLimit: 15,
    difficulty: "easy",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Função para criar dados base
async function createBaseData() {
  console.log('🚀 Iniciando criação da estrutura do banco de dados...');
  
  try {
    // 1. Criar temas
    console.log('📁 Criando temas...');
    for (const theme of baseThemes) {
      await setDoc(doc(db, 'themes', theme.id), theme);
      console.log(`✅ Tema criado: ${theme.name}`);
    }
    
    // 2. Criar níveis
    console.log('📊 Criando níveis...');
    for (const level of baseLevels) {
      await setDoc(doc(db, 'levels', level.id), level);
      console.log(`✅ Nível criado: ${level.name}`);
    }
    
    // 3. Criar perguntas
    console.log('❓ Criando perguntas...');
    for (const question of baseQuestions) {
      await setDoc(doc(db, 'questions', question.id), question);
      console.log(`✅ Pergunta criada: ${question.question.substring(0, 30)}...`);
    }
    
    // 4. Criar conjuntos de perguntas
    console.log('📚 Criando conjuntos de perguntas...');
    for (const set of baseQuestionSets) {
      await setDoc(doc(db, 'question_sets', set.id), set);
      console.log(`✅ Conjunto criado: ${set.name}`);
    }
    
    console.log('🎉 Estrutura do banco de dados criada com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${baseThemes.length} temas criados`);
    console.log(`   - ${baseLevels.length} níveis criados`);
    console.log(`   - ${baseQuestions.length} perguntas criadas`);
    console.log(`   - ${baseQuestionSets.length} conjuntos criados`);
    
  } catch (error) {
    console.error('❌ Erro ao criar estrutura:', error);
  }
}

// Função para verificar se já existe dados
async function checkExistingData() {
  console.log('🔍 Verificando dados existentes...');
  
  try {
    const themesSnapshot = await getDocs(collection(db, 'themes'));
    const levelsSnapshot = await getDocs(collection(db, 'levels'));
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    const setsSnapshot = await getDocs(collection(db, 'question_sets'));
    
    console.log(`📊 Dados existentes:`);
    console.log(`   - Temas: ${themesSnapshot.size}`);
    console.log(`   - Níveis: ${levelsSnapshot.size}`);
    console.log(`   - Perguntas: ${questionsSnapshot.size}`);
    console.log(`   - Conjuntos: ${setsSnapshot.size}`);
    
    if (themesSnapshot.size > 0 || levelsSnapshot.size > 0 || 
        questionsSnapshot.size > 0 || setsSnapshot.size > 0) {
      console.log('⚠️  Já existem dados no banco. Deseja continuar mesmo assim? (y/n)');
      // Em um ambiente real, você poderia usar readline para interação
      return true; // Continuar mesmo assim
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return false;
  }
}

// Executar script
async function main() {
  console.log('🌟 AstroQuiz - Criador de Estrutura de Banco de Dados');
  console.log('==================================================');
  
  const hasData = await checkExistingData();
  
  if (hasData) {
    console.log('🔄 Continuando com a criação de dados...');
  }
  
  await createBaseData();
  
  console.log('✅ Script concluído!');
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createBaseData, checkExistingData };
