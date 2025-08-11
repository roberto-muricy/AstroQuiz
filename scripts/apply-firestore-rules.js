const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

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

// Função para testar permissões criando um documento de teste
async function testPermissions() {
  console.log('🔐 Testando permissões do Firestore...');
  
  try {
    // Tentar criar um documento de teste
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Teste de permissões'
    };
    
    await setDoc(doc(db, 'test_permissions', 'test'), testDoc);
    console.log('✅ Permissões funcionando!');
    
    // Limpar documento de teste
    // await deleteDoc(doc(db, 'test_permissions', 'test'));
    
    return true;
  } catch (error) {
    console.error('❌ Erro de permissões:', error.message);
    return false;
  }
}

// Função para criar estrutura com tratamento de erro melhorado
async function createStructureWithRetry() {
  console.log('🔄 Tentando criar estrutura com tratamento de erro...');
  
  try {
    // Primeiro, testar permissões
    const hasPermissions = await testPermissions();
    if (!hasPermissions) {
      console.log('❌ Sem permissões suficientes');
      return false;
    }
    
    // Dados base
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
        isUnlocked: true
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
        themes: ["planets"],
        categories: ["basic-astronomy"],
        difficulty: "easy",
        tags: ["planets", "solar-system", "mercury"],
        metadata: {
          source: "NASA",
          verified: true,
          reviewCount: 0
        },
        stats: {
          timesAsked: 0,
          correctAnswers: 0,
          averageTime: 0
        },
        isActive: true
      }
    ];
    
    // Criar um tema por vez
    console.log('📁 Criando tema de teste...');
    await setDoc(doc(db, 'themes', baseThemes[0].id), {
      ...baseThemes[0],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Tema criado com sucesso!');
    
    // Criar um nível por vez
    console.log('📊 Criando nível de teste...');
    await setDoc(doc(db, 'levels', baseLevels[0].id), {
      ...baseLevels[0],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Nível criado com sucesso!');
    
    // Criar uma pergunta por vez
    console.log('❓ Criando pergunta de teste...');
    await setDoc(doc(db, 'questions', baseQuestions[0].id), {
      ...baseQuestions[0],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Pergunta criada com sucesso!');
    
    console.log('🎉 Estrutura básica criada com sucesso!');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao criar estrutura:', error);
    console.log('💡 Sugestões:');
    console.log('   1. Verifique se o projeto Firebase está correto');
    console.log('   2. Verifique se as regras do Firestore permitem escrita');
    console.log('   3. Verifique se há conexão com a internet');
    return false;
  }
}

// Executar teste
async function main() {
  console.log('🔧 Teste de Permissões e Estrutura');
  console.log('==================================');
  
  const success = await createStructureWithRetry();
  
  if (success) {
    console.log('\n✅ Tudo funcionando! Você pode agora usar o painel admin.');
  } else {
    console.log('\n❌ Problemas encontrados. Verifique as configurações.');
  }
  
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testPermissions, createStructureWithRetry };
