const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where, writeBatch } = require('firebase/firestore');

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

// ============================================================================
// 📋 DADOS DO GOOGLE SHEETS - SUBSTITUA PELOS SEUS DADOS REAIS
// ============================================================================

// Estrutura esperada do Google Sheets:
// baseId | language | topic | level | question | optionA | optionB | optionC | optionD | correctOption | explanation

const GOOGLE_SHEETS_DATA = [
  // Exemplo - SUBSTITUA pelos seus dados reais do Google Sheets
  {
    baseId: "q001",
    language: "pt",
    topic: "astronomia",
    level: 1,
    question: "Qual é o planeta mais próximo do Sol?",
    optionA: "Mercúrio",
    optionB: "Vênus",
    optionC: "Terra",
    optionD: "Marte",
    correctOption: "A",
    explanation: "Mercúrio é o planeta mais próximo do Sol, localizado a aproximadamente 57,9 milhões de km."
  },
  {
    baseId: "q001",
    language: "en",
    topic: "astronomy",
    level: 1,
    question: "Which planet is closest to the Sun?",
    optionA: "Mercury",
    optionB: "Venus",
    optionC: "Earth",
    optionD: "Mars",
    correctOption: "A",
    explanation: "Mercury is the planet closest to the Sun, located approximately 57.9 million km away."
  },
  {
    baseId: "q001",
    language: "es",
    topic: "astronomía",
    level: 1,
    question: "¿Cuál es el planeta más cercano al Sol?",
    optionA: "Mercurio",
    optionB: "Venus",
    optionC: "Tierra",
    optionD: "Marte",
    correctOption: "A",
    explanation: "Mercurio es el planeta más cercano al Sol, ubicado a aproximadamente 57,9 millones de km."
  },
  {
    baseId: "q001",
    language: "fr",
    topic: "astronomie",
    level: 1,
    question: "Quelle est la planète la plus proche du Soleil?",
    optionA: "Mercure",
    optionB: "Vénus",
    optionC: "Terre",
    optionD: "Mars",
    correctOption: "A",
    explanation: "Mercure est la planète la plus proche du Soleil, située à environ 57,9 millions de km."
  },
  {
    baseId: "q002",
    language: "pt",
    topic: "astronomia",
    level: 1,
    question: "Quantos planetas existem no sistema solar?",
    optionA: "7",
    optionB: "8",
    optionC: "9",
    optionD: "10",
    correctOption: "B",
    explanation: "Existem 8 planetas no sistema solar: Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno."
  },
  {
    baseId: "q002",
    language: "en",
    topic: "astronomy",
    level: 1,
    question: "How many planets are there in the solar system?",
    optionA: "7",
    optionB: "8",
    optionC: "9",
    optionD: "10",
    correctOption: "B",
    explanation: "There are 8 planets in the solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune."
  },
  {
    baseId: "q002",
    language: "es",
    topic: "astronomía",
    level: 1,
    question: "¿Cuántos planetas hay en el sistema solar?",
    optionA: "7",
    optionB: "8",
    optionC: "9",
    optionD: "10",
    correctOption: "B",
    explanation: "Hay 8 planetas en el sistema solar: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno."
  },
  {
    baseId: "q002",
    language: "fr",
    topic: "astronomie",
    level: 1,
    question: "Combien de planètes y a-t-il dans le système solaire?",
    optionA: "7",
    optionB: "8",
    optionC: "9",
    optionD: "10",
    correctOption: "B",
    explanation: "Il y a 8 planètes dans le système solaire: Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune."
  }
];

// ============================================================================
// 🗺️ MAPEAMENTOS E CONFIGURAÇÕES
// ============================================================================

// Mapeamento de tópicos para temas
const topicToThemeMap = {
  "astronomia": "astronomy",
  "astronomy": "astronomy",
  "astronomía": "astronomy",
  "astronomie": "astronomy",
  "planetas": "planets",
  "planets": "planets",
  "estrelas": "stars",
  "stars": "stars",
  "galáxias": "galaxies",
  "galaxies": "galaxies",
  "exploração espacial": "space-exploration",
  "space exploration": "space-exploration",
  "exploración espacial": "space-exploration",
  "exploration spatiale": "space-exploration",
  "cosmologia": "cosmology",
  "cosmology": "cosmology",
  "cosmología": "cosmology",
  "cosmologie": "cosmology"
};

// Configurações de idiomas suportados
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr'];
const LANGUAGE_NAMES = {
  'pt': 'Português',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français'
};

// ============================================================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================================================

function validateQuestionData(questionData) {
  const errors = [];
  
  // Validar campos obrigatórios
  if (!questionData.baseId) errors.push('baseId é obrigatório');
  if (!questionData.language) errors.push('language é obrigatório');
  if (!questionData.question) errors.push('question é obrigatório');
  if (!questionData.optionA || !questionData.optionB || !questionData.optionC || !questionData.optionD) {
    errors.push('Todas as opções (A, B, C, D) são obrigatórias');
  }
  if (!questionData.correctOption) errors.push('correctOption é obrigatório');
  
  // Validar idioma
  if (!SUPPORTED_LANGUAGES.includes(questionData.language)) {
    errors.push(`Idioma não suportado: ${questionData.language}`);
  }
  
  // Validar nível
  const level = parseInt(questionData.level);
  if (isNaN(level) || level < 1 || level > 10) {
    errors.push(`Nível inválido: ${questionData.level}`);
  }
  
  // Validar resposta correta
  if (!['A', 'B', 'C', 'D'].includes(questionData.correctOption)) {
    errors.push(`Resposta correta inválida: ${questionData.correctOption}`);
  }
  
  return errors;
}

function convertToFirebaseStructure(questionData) {
  const level = parseInt(questionData.level);
  const theme = topicToThemeMap[questionData.topic.toLowerCase()] || 'general';
  
  // Converter resposta correta de letra para índice
  const correctAnswerMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
  const correctAnswer = correctAnswerMap[questionData.correctOption];
  
  // Determinar dificuldade baseada no nível
  let difficulty = 'easy';
  if (level >= 7) difficulty = 'hard';
  else if (level >= 4) difficulty = 'medium';
  
  return {
    baseId: questionData.baseId,
    language: questionData.language,
    question: questionData.question.trim(),
    options: [
      questionData.optionA.trim(),
      questionData.optionB.trim(),
      questionData.optionC.trim(),
      questionData.optionD.trim()
    ],
    correctAnswer: correctAnswer,
    explanation: questionData.explanation?.trim() || "Sem explicação disponível",
    level: level,
    difficulty: difficulty,
    theme: theme,
    topics: [questionData.topic],
    active: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      source: "Google Sheets Multi-Language Import",
      importDate: new Date(),
      version: "1.0",
      verified: true,
      reviewCount: 0,
      lastReviewed: new Date()
    }
  };
}

function groupQuestionsByBaseId(questionsData) {
  const grouped = {};
  
  questionsData.forEach(questionData => {
    const baseId = questionData.baseId;
    if (!grouped[baseId]) {
      grouped[baseId] = [];
    }
    grouped[baseId].push(questionData);
  });
  
  return grouped;
}

// ============================================================================
// 🔍 FUNÇÕES DE VERIFICAÇÃO
// ============================================================================

async function checkExistingQuestions() {
  console.log('🔍 Verificando perguntas existentes...');
  
  const questionsRef = collection(db, 'questions');
  const snapshot = await getDocs(questionsRef);
  
  const existingQuestions = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.baseId && data.language) {
      const key = `${data.baseId}_${data.language}`;
      existingQuestions[key] = {
        id: doc.id,
        ...data
      };
    }
  });
  
  console.log(`📊 Encontradas ${Object.keys(existingQuestions).length} perguntas existentes`);
  return existingQuestions;
}

async function validateImportData(questionsData) {
  console.log('✅ Validando dados de importação...');
  
  const groupedQuestions = groupQuestionsByBaseId(questionsData);
  const validationResults = {
    valid: [],
    invalid: [],
    duplicates: [],
    summary: {
      total: questionsData.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      languages: {},
      levels: {},
      themes: {}
    }
  };
  
  // Verificar perguntas existentes
  const existingQuestions = await checkExistingQuestions();
  
  questionsData.forEach(questionData => {
    const errors = validateQuestionData(questionData);
    
    if (errors.length > 0) {
      validationResults.invalid.push({
        data: questionData,
        errors: errors
      });
      validationResults.summary.invalid++;
    } else {
      // Verificar se já existe
      const key = `${questionData.baseId}_${questionData.language}`;
      if (existingQuestions[key]) {
        validationResults.duplicates.push({
          data: questionData,
          existing: existingQuestions[key]
        });
        validationResults.summary.duplicates++;
      } else {
        validationResults.valid.push(questionData);
        validationResults.summary.valid++;
        
        // Contar estatísticas
        validationResults.summary.languages[questionData.language] = 
          (validationResults.summary.languages[questionData.language] || 0) + 1;
        
        validationResults.summary.levels[questionData.level] = 
          (validationResults.summary.levels[questionData.level] || 0) + 1;
        
        const theme = topicToThemeMap[questionData.topic.toLowerCase()] || 'general';
        validationResults.summary.themes[theme] = 
          (validationResults.summary.themes[theme] || 0) + 1;
      }
    }
  });
  
  return validationResults;
}

// ============================================================================
// 📥 FUNÇÕES DE IMPORTAÇÃO
// ============================================================================

async function importQuestions(questionsData) {
  console.log('📥 Iniciando importação de perguntas...');
  
  const batch = writeBatch(db);
  let importedCount = 0;
  let errorCount = 0;
  
  for (const questionData of questionsData) {
    try {
      const firebaseQuestion = convertToFirebaseStructure(questionData);
      
      // Gerar ID único
      const questionId = `q_${questionData.baseId}_${questionData.language}_${Date.now()}`;
      
      // Adicionar ao batch
      const questionRef = doc(db, 'questions', questionId);
      batch.set(questionRef, firebaseQuestion);
      
      importedCount++;
      
      if (importedCount % 50 === 0) {
        console.log(`📊 Processadas ${importedCount} perguntas...`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar pergunta ${questionData.baseId}:`, error.message);
      errorCount++;
    }
  }
  
  // Executar batch
  try {
    await batch.commit();
    console.log(`✅ Batch executado com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao executar batch:`, error.message);
    throw error;
  }
  
  return { imported: importedCount, errors: errorCount };
}

async function createQuestionSets(questionsData) {
  console.log('📚 Criando conjuntos de perguntas...');
  
  const groupedQuestions = groupQuestionsByBaseId(questionsData);
  const questionSets = [];
  
  for (const [baseId, questions] of Object.entries(groupedQuestions)) {
    const firstQuestion = questions[0];
    const level = parseInt(firstQuestion.level);
    const theme = topicToThemeMap[firstQuestion.topic.toLowerCase()] || 'general';
    
    // Determinar dificuldade
    let difficulty = 'easy';
    if (level >= 7) difficulty = 'hard';
    else if (level >= 4) difficulty = 'medium';
    
    const questionSet = {
      id: `set_${baseId}`,
      baseId: baseId,
      name: `Conjunto ${baseId}`,
      description: `Perguntas relacionadas ao tópico: ${firstQuestion.topic}`,
      level: level,
      difficulty: difficulty,
      theme: theme,
      topics: [firstQuestion.topic],
      languages: questions.map(q => q.language),
      questionCount: questions.length,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: "Google Sheets Multi-Language Import",
        importDate: new Date(),
        version: "1.0"
      }
    };
    
    questionSets.push(questionSet);
  }
  
  return questionSets;
}

// ============================================================================
// 📊 FUNÇÕES DE RELATÓRIO
// ============================================================================

function generateImportReport(validationResults, importResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE IMPORTAÇÃO MULTI-IDIOMA');
  console.log('='.repeat(60));
  
  console.log('\n📈 RESUMO GERAL:');
  console.log(`   Total de registros: ${validationResults.summary.total}`);
  console.log(`   ✅ Válidos: ${validationResults.summary.valid}`);
  console.log(`   ❌ Inválidos: ${validationResults.summary.invalid}`);
  console.log(`   ⏭️ Duplicados: ${validationResults.summary.duplicates}`);
  console.log(`   📥 Importados: ${importResults.imported}`);
  console.log(`   💥 Erros: ${importResults.errors}`);
  
  console.log('\n🌍 DISTRIBUIÇÃO POR IDIOMA:');
  Object.entries(validationResults.summary.languages).forEach(([lang, count]) => {
    const langName = LANGUAGE_NAMES[lang] || lang;
    console.log(`   ${langName} (${lang}): ${count} perguntas`);
  });
  
  console.log('\n📊 DISTRIBUIÇÃO POR NÍVEL:');
  Object.entries(validationResults.summary.levels)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([level, count]) => {
      console.log(`   Nível ${level}: ${count} perguntas`);
    });
  
  console.log('\n🎯 DISTRIBUIÇÃO POR TEMA:');
  Object.entries(validationResults.summary.themes).forEach(([theme, count]) => {
    console.log(`   ${theme}: ${count} perguntas`);
  });
  
  if (validationResults.invalid.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    validationResults.invalid.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.data.baseId} (${item.data.language}):`);
      item.errors.forEach(error => console.log(`      - ${error}`));
    });
  }
  
  if (validationResults.duplicates.length > 0) {
    console.log('\n⏭️ DUPLICATAS ENCONTRADAS:');
    validationResults.duplicates.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.data.baseId} (${item.data.language})`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

// ============================================================================
// 🚀 FUNÇÃO PRINCIPAL
// ============================================================================

async function importMultilingualQuestions() {
  try {
    console.log('🚀 Iniciando importação multi-idioma do Google Sheets...');
    console.log(`📋 Total de registros para processar: ${GOOGLE_SHEETS_DATA.length}`);
    
    // 1. Validar dados
    const validationResults = await validateImportData(GOOGLE_SHEETS_DATA);
    
    if (validationResults.valid.length === 0) {
      console.log('❌ Nenhuma pergunta válida encontrada para importar!');
      generateImportReport(validationResults, { imported: 0, errors: 0 });
      return;
    }
    
    // 2. Importar perguntas válidas
    const importResults = await importQuestions(validationResults.valid);
    
    // 3. Criar conjuntos de perguntas
    const questionSets = await createQuestionSets(validationResults.valid);
    
    // 4. Salvar conjuntos
    if (questionSets.length > 0) {
      console.log(`📚 Salvando ${questionSets.length} conjuntos de perguntas...`);
      const batch = writeBatch(db);
      
      questionSets.forEach(set => {
        const setRef = doc(db, 'question_sets', set.id);
        batch.set(setRef, set);
      });
      
      await batch.commit();
      console.log('✅ Conjuntos salvos com sucesso!');
    }
    
    // 5. Gerar relatório
    generateImportReport(validationResults, importResults);
    
    console.log('\n🎉 Importação multi-idioma concluída com sucesso!');
    console.log(`📱 As perguntas estão prontas para uso no app AstroQuiz!`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    throw error;
  }
}

// ============================================================================
// 🎯 EXECUÇÃO
// ============================================================================

// Executar importação
if (require.main === module) {
  importMultilingualQuestions()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = {
  importMultilingualQuestions,
  validateQuestionData,
  convertToFirebaseStructure,
  groupQuestionsByBaseId
};
