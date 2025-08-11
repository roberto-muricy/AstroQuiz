const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where, deleteDoc } = require('firebase/firestore');

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

// Mapeamento de categorias para temas
const categoryToThemeMap = {
  "Planetas": "planets",
  "Estrelas": "stars", 
  "Galáxias": "galaxies",
  "Exploração Espacial": "space-exploration",
  "Cosmologia": "cosmology",
  "Sistema Solar": "planets",
  "Astronomia": "stars",
  "História Espacial": "space-exploration"
};

// Função para converter dados do Google Sheets
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
        source: "Google Sheets Import",
        verified: true,
        lastReviewed: new Date(),
        reviewCount: 0
      },
      stats: {
        timesAsked: 0,
        correctAnswers: 0,
        averageTime: 0
      },
      isActive: true
    };
  });
}

// Função para verificar se uma pergunta já existe
async function checkQuestionExists(questionText) {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('question', '==', questionText));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar pergunta:', error);
    return false;
  }
}

// Função para importar apenas perguntas novas
async function importNewQuestions(sheetData) {
  console.log('🔄 Verificando perguntas novas...');
  
  const convertedQuestions = convertSheetDataToNewStructure(sheetData);
  const newQuestions = [];
  const existingQuestions = [];
  
  for (const question of convertedQuestions) {
    const exists = await checkQuestionExists(question.question);
    if (exists) {
      existingQuestions.push(question);
    } else {
      newQuestions.push(question);
    }
  }
  
  console.log(`📊 Resultado da verificação:`);
  console.log(`   - Perguntas existentes: ${existingQuestions.length}`);
  console.log(`   - Perguntas novas: ${newQuestions.length}`);
  
  // Importar apenas perguntas novas
  if (newQuestions.length > 0) {
    console.log('📥 Importando perguntas novas...');
    for (const question of newQuestions) {
      try {
        await setDoc(doc(db, 'questions', question.id), {
          ...question,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Importada: ${question.question.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Erro ao importar pergunta:`, error.message);
      }
    }
  }
  
  return {
    new: newQuestions.length,
    existing: existingQuestions.length,
    total: convertedQuestions.length
  };
}

// Função para atualizar perguntas existentes
async function updateExistingQuestions(sheetData) {
  console.log('🔄 Atualizando perguntas existentes...');
  
  const convertedQuestions = convertSheetDataToNewStructure(sheetData);
  let updatedCount = 0;
  
  for (const question of convertedQuestions) {
    try {
      // Verificar se a pergunta existe
      const questionsRef = collection(db, 'questions');
      const q = query(questionsRef, where('question', '==', question.question));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data();
        
        // Atualizar apenas se houver mudanças
        const hasChanges = 
          JSON.stringify(existingData.options) !== JSON.stringify(question.options) ||
          existingData.correctAnswer !== question.correctAnswer ||
          existingData.explanation !== question.explanation ||
          existingData.level !== question.level;
        
        if (hasChanges) {
          await setDoc(doc(db, 'questions', existingDoc.id), {
            ...existingData,
            ...question,
            updatedAt: new Date(),
            metadata: {
              ...existingData.metadata,
              lastUpdated: new Date(),
              source: "Google Sheets Update"
            }
          });
          updatedCount++;
          console.log(`✅ Atualizada: ${question.question.substring(0, 50)}...`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar pergunta:`, error.message);
    }
  }
  
  console.log(`📊 Perguntas atualizadas: ${updatedCount}`);
  return updatedCount;
}

// Função para sincronização completa
async function fullSync(sheetData) {
  console.log('🔄 Iniciando sincronização completa...');
  
  try {
    // 1. Importar perguntas novas
    const importResult = await importNewQuestions(sheetData);
    
    // 2. Atualizar perguntas existentes
    const updateResult = await updateExistingQuestions(sheetData);
    
    // 3. Verificar perguntas removidas do Google Sheets
    const removedQuestions = await checkRemovedQuestions(sheetData);
    
    console.log('🎉 Sincronização concluída!');
    console.log(`📊 Resumo:`);
    console.log(`   - Novas perguntas: ${importResult.new}`);
    console.log(`   - Perguntas atualizadas: ${updateResult}`);
    console.log(`   - Perguntas removidas: ${removedQuestions}`);
    
    return {
      new: importResult.new,
      updated: updateResult,
      removed: removedQuestions
    };
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}

// Função para verificar perguntas removidas
async function checkRemovedQuestions(sheetData) {
  console.log('🔄 Verificando perguntas removidas...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('metadata.source', '==', 'Google Sheets Import'));
    const snapshot = await getDocs(q);
    
    const sheetQuestions = new Set(sheetData.map(row => row.question));
    let removedCount = 0;
    
    for (const doc of snapshot.docs) {
      const questionData = doc.data();
      if (!sheetQuestions.has(questionData.question)) {
        // Pergunta foi removida do Google Sheets
        console.log(`🗑️ Pergunta removida do Google Sheets: ${questionData.question.substring(0, 50)}...`);
        
        // Opção 1: Marcar como inativa
        await setDoc(doc.ref, {
          ...questionData,
          isActive: false,
          updatedAt: new Date(),
          metadata: {
            ...questionData.metadata,
            removedFromSource: true,
            removedAt: new Date()
          }
        });
        
        // Opção 2: Excluir completamente (descomente se quiser)
        // await deleteDoc(doc.ref);
        
        removedCount++;
      }
    }
    
    return removedCount;
  } catch (error) {
    console.error('❌ Erro ao verificar perguntas removidas:', error);
    return 0;
  }
}

// Função para criar backup antes da sincronização
async function createBackup() {
  console.log('💾 Criando backup...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    const backup = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const backupId = `backup_${Date.now()}`;
    await setDoc(doc(db, 'backups', backupId), {
      id: backupId,
      questions: backup,
      createdAt: new Date(),
      description: 'Backup antes da sincronização do Google Sheets'
    });
    
    console.log(`✅ Backup criado: ${backupId}`);
    return backupId;
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    return null;
  }
}

// Função principal
async function main() {
  console.log('🌟 AstroQuiz - Sistema de Importação Contínua');
  console.log('============================================');
  
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
    }
  ];
  
  try {
    // 1. Criar backup
    const backupId = await createBackup();
    
    // 2. Executar sincronização
    const result = await fullSync(googleSheetsData);
    
    console.log('\n✅ Sincronização concluída com sucesso!');
    console.log(`📊 Resultados:`);
    console.log(`   - Novas perguntas: ${result.new}`);
    console.log(`   - Atualizadas: ${result.updated}`);
    console.log(`   - Removidas: ${result.removed}`);
    console.log(`   - Backup: ${backupId}`);
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
  
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  importNewQuestions, 
  updateExistingQuestions, 
  fullSync, 
  createBackup,
  checkRemovedQuestions
};
