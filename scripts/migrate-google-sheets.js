const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-8c8c8.firebaseapp.com",
  projectId: "astroquiz-8c8c8",
  storageBucket: "astroquiz-8c8c8.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dados simulados do Google Sheets (substitua pelos dados reais)
const googleSheetsData = [
  {
    question: "Qual é o planeta mais próximo do Sol?",
    optionA: "Mercúrio",
    optionB: "Vênus", 
    optionC: "Terra",
    optionD: "Marte",
    correctAnswer: "A",
    explanation: "Mercúrio é o planeta mais próximo do Sol, localizado a aproximadamente 57,9 milhões de km.",
    level: 1,
    category: "Planetas"
  },
  {
    question: "Qual é o maior planeta do Sistema Solar?",
    optionA: "Terra",
    optionB: "Marte",
    optionC: "Júpiter",
    optionD: "Saturno",
    correctAnswer: "C",
    explanation: "Júpiter é o maior planeta do Sistema Solar, com uma massa 318 vezes maior que a da Terra.",
    level: 1,
    category: "Planetas"
  },
  {
    question: "Qual é a estrela mais próxima da Terra?",
    optionA: "Alpha Centauri",
    optionB: "Sol",
    optionC: "Sirius",
    optionD: "Proxima Centauri",
    correctAnswer: "B",
    explanation: "O Sol é a estrela mais próxima da Terra, localizada a aproximadamente 150 milhões de km.",
    level: 1,
    category: "Estrelas"
  },
  {
    question: "Em que galáxia vivemos?",
    optionA: "Andrômeda",
    optionB: "Via Láctea",
    optionC: "Triângulo",
    optionD: "Pequena Nuvem de Magalhães",
    correctAnswer: "B",
    explanation: "Vivemos na galáxia Via Láctea, uma galáxia espiral que contém bilhões de estrelas.",
    level: 1,
    category: "Galáxias"
  },
  {
    question: "Qual foi a primeira missão tripulada a pousar na Lua?",
    optionA: "Apollo 11",
    optionB: "Apollo 10",
    optionC: "Apollo 12",
    optionD: "Apollo 13",
    correctAnswer: "A",
    explanation: "A Apollo 11 foi a primeira missão tripulada a pousar na Lua, em 20 de julho de 1969.",
    level: 1,
    category: "Exploração Espacial"
  }
];

// Mapeamento de categorias para temas
const categoryToThemeMap = {
  "Planetas": "planets",
  "Estrelas": "stars", 
  "Galáxias": "galaxies",
  "Exploração Espacial": "space-exploration",
  "Cosmologia": "cosmology"
};

// Função para converter dados do Google Sheets para a nova estrutura
function convertSheetDataToNewStructure(sheetData) {
  return sheetData.map((row, index) => {
    const questionId = `q_${String(index + 1).padStart(3, '0')}`;
    const theme = categoryToThemeMap[row.category] || "general";
    
    // Converter resposta correta de letra para índice
    const correctAnswerMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
    const correctAnswer = correctAnswerMap[row.correctAnswer] || 0;
    
    return {
      id: questionId,
      question: row.question,
      options: [row.optionA, row.optionB, row.optionC, row.optionD],
      correctAnswer: correctAnswer,
      explanation: row.explanation,
      level: parseInt(row.level) || 1,
      themes: [theme],
      categories: [row.category.toLowerCase().replace(/\s+/g, '-')],
      difficulty: row.level <= 2 ? "easy" : row.level <= 4 ? "medium" : "hard",
      tags: [theme, row.category.toLowerCase().replace(/\s+/g, '-')],
      metadata: {
        source: "Google Sheets Migration",
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
    };
  });
}

// Função para criar conjuntos de perguntas automaticamente
function createQuestionSets(questions) {
  const sets = {};
  
  questions.forEach(question => {
    const theme = question.themes[0];
    const level = question.level;
    const setId = `${theme}_level${level}`;
    
    if (!sets[setId]) {
      sets[setId] = {
        id: setId,
        name: `${question.categories[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Nível ${level}`,
        description: `Conjunto de perguntas sobre ${question.categories[0].replace(/-/g, ' ')} para nível ${level}`,
        theme: theme,
        level: level,
        questions: [],
        questionCount: 0,
        timeLimit: level <= 2 ? 15 : level <= 4 ? 12 : 10,
        difficulty: question.difficulty,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    sets[setId].questions.push(question.id);
    sets[setId].questionCount++;
  });
  
  return Object.values(sets);
}

// Função principal de migração
async function migrateFromGoogleSheets() {
  console.log('🚀 Iniciando migração do Google Sheets...');
  
  try {
    // 1. Converter dados do Google Sheets
    console.log('📝 Convertendo dados do Google Sheets...');
    const convertedQuestions = convertSheetDataToNewStructure(googleSheetsData);
    console.log(`✅ ${convertedQuestions.length} perguntas convertidas`);
    
    // 2. Criar conjuntos de perguntas
    console.log('📚 Criando conjuntos de perguntas...');
    const questionSets = createQuestionSets(convertedQuestions);
    console.log(`✅ ${questionSets.length} conjuntos criados`);
    
    // 3. Salvar perguntas no Firestore
    console.log('💾 Salvando perguntas no Firestore...');
    for (const question of convertedQuestions) {
      await setDoc(doc(db, 'questions', question.id), question);
      console.log(`✅ Pergunta salva: ${question.question.substring(0, 30)}...`);
    }
    
    // 4. Salvar conjuntos no Firestore
    console.log('💾 Salvando conjuntos no Firestore...');
    for (const set of questionSets) {
      await setDoc(doc(db, 'question_sets', set.id), set);
      console.log(`✅ Conjunto salvo: ${set.name}`);
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log(`📊 Resumo da migração:`);
    console.log(`   - ${convertedQuestions.length} perguntas migradas`);
    console.log(`   - ${questionSets.length} conjuntos criados`);
    console.log(`   - ${Object.keys(categoryToThemeMap).length} categorias mapeadas`);
    
    return {
      questions: convertedQuestions,
      sets: questionSets
    };
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// Função para verificar dados existentes
async function checkExistingQuestions() {
  try {
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    const setsSnapshot = await getDocs(collection(db, 'question_sets'));
    
    console.log(`📊 Dados existentes:`);
    console.log(`   - Perguntas: ${questionsSnapshot.size}`);
    console.log(`   - Conjuntos: ${setsSnapshot.size}`);
    
    return {
      questions: questionsSnapshot.size,
      sets: setsSnapshot.size
    };
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    return { questions: 0, sets: 0 };
  }
}

// Função para limpar perguntas migradas (para testes)
async function clearMigratedData() {
  try {
    console.log('🗑️ Removendo dados migrados...');
    
    // Remover perguntas
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    for (const doc of questionsSnapshot.docs) {
      if (doc.data().metadata?.source === 'Google Sheets Migration') {
        await deleteDoc(doc.ref);
        console.log(`🗑️ Pergunta removida: ${doc.id}`);
      }
    }
    
    // Remover conjuntos relacionados
    const setsSnapshot = await getDocs(collection(db, 'question_sets'));
    for (const doc of setsSnapshot.docs) {
      const setData = doc.data();
      if (setData.questions && setData.questions.length > 0) {
        // Verificar se todas as perguntas do conjunto foram removidas
        const questionsSnapshot = await getDocs(collection(db, 'questions'));
        const existingQuestionIds = questionsSnapshot.docs.map(d => d.id);
        const allQuestionsRemoved = setData.questions.every(qId => !existingQuestionIds.includes(qId));
        
        if (allQuestionsRemoved) {
          await deleteDoc(doc.ref);
          console.log(`🗑️ Conjunto removido: ${doc.id}`);
        }
      }
    }
    
    console.log('✅ Dados migrados removidos!');
  } catch (error) {
    console.error('❌ Erro ao remover dados:', error);
  }
}

// Executar script
async function main() {
  console.log('🌟 AstroQuiz - Migração do Google Sheets');
  console.log('========================================');
  
  const existingData = await checkExistingQuestions();
  
  if (existingData.questions > 0) {
    console.log('⚠️  Já existem perguntas no banco. Deseja continuar mesmo assim? (y/n)');
    // Em um ambiente real, você poderia usar readline para interação
    console.log('🔄 Continuando com a migração...');
  }
  
  const result = await migrateFromGoogleSheets();
  
  console.log('✅ Script de migração concluído!');
  console.log('💡 Para usar com dados reais do Google Sheets:');
  console.log('   1. Substitua googleSheetsData pelos dados reais');
  console.log('   2. Ajuste categoryToThemeMap conforme necessário');
  console.log('   3. Execute novamente o script');
  
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  migrateFromGoogleSheets, 
  checkExistingQuestions, 
  clearMigratedData,
  convertSheetDataToNewStructure,
  createQuestionSets
};
