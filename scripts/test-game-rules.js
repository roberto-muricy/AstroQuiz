const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.firebasestorage.app",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Regras padrão do jogo
const DEFAULT_GAME_RULES = {
  // Configurações de Tempo
  timePerQuestion: 15,
  timeBonus: 2,
  timePenalty: 1,
  
  // Configurações de Pontuação
  pointsPerCorrectAnswer: 10,
  pointsPerLevel: 100,
  pointsMultiplier: 1.5,
  streakBonus: 5,
  
  // Configurações de Progresso
  passingPercentage: 80,
  questionsPerLevel: 10,
  maxAttempts: 0, // ilimitado
  
  // Configurações de Dificuldade
  difficultyMultiplier: 1.2,
  unlockRequirement: 2, // 2 estrelas para desbloquear
  
  // Configurações de Conquistas
  achievementThresholds: {
    speedDemon: 120, // 2 minutos
    perfectionist: 95, // 95% precisão
    streakMaster: 5, // 5 acertos seguidos
  },
  
  // Configurações de Modo de Jogo
  allowHints: false,
  allowSkip: false,
  showTimer: true,
  showProgress: true,
  
  // Configurações de Ranking
  rankingUpdateInterval: 5, // 5 minutos
  rankingDisplayLimit: 50,
  
  // Configurações de Notificações
  enableNotifications: true,
  dailyReminder: true,
  achievementNotifications: true,
  
  // Metadados
  lastUpdated: new Date(),
  updatedBy: 'admin',
  version: '1.0.0'
};

async function testGameRules() {
  try {
    console.log('🧪 Testando Regras do Jogo\n');
    
    // 1. Verificar se as regras existem
    console.log('1️⃣ Verificando regras existentes...');
    const rulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
    
    if (rulesDoc.exists()) {
      const currentRules = rulesDoc.data();
      console.log('✅ Regras encontradas!');
      console.log(`   Versão: ${currentRules.version}`);
      console.log(`   Última atualização: ${currentRules.lastUpdated?.toDate() || 'N/A'}`);
      console.log(`   Atualizado por: ${currentRules.updatedBy || 'N/A'}\n`);
      
      // Mostrar algumas configurações principais
      console.log('📊 CONFIGURAÇÕES ATUAIS:');
      console.log(`   ⏱️  Tempo por pergunta: ${currentRules.timePerQuestion}s`);
      console.log(`   🎯 Pontos por resposta correta: ${currentRules.pointsPerCorrectAnswer}`);
      console.log(`   📈 Porcentagem para passar: ${currentRules.passingPercentage}%`);
      console.log(`   ❓ Perguntas por nível: ${currentRules.questionsPerLevel}`);
      console.log(`   🔓 Estrelas para desbloquear: ${currentRules.unlockRequirement}`);
      console.log(`   ⚡ Multiplicador de dificuldade: ${currentRules.difficultyMultiplier}x`);
      console.log(`   🏆 Limite do ranking: ${currentRules.rankingDisplayLimit} jogadores\n`);
      
    } else {
      console.log('❌ Nenhuma regra encontrada. Criando regras padrão...\n');
      
      // 2. Criar regras padrão
      console.log('2️⃣ Criando regras padrão...');
      await setDoc(doc(db, 'gameRules', 'current'), DEFAULT_GAME_RULES);
      console.log('✅ Regras padrão criadas com sucesso!\n');
    }
    
    // 3. Testar atualização de regras
    console.log('3️⃣ Testando atualização de regras...');
    const testRules = {
      ...DEFAULT_GAME_RULES,
      timePerQuestion: 20, // Aumentar tempo
      pointsPerCorrectAnswer: 15, // Aumentar pontos
      passingPercentage: 75, // Reduzir dificuldade
      lastUpdated: new Date(),
      updatedBy: 'test-script',
      version: '1.0.1'
    };
    
    await setDoc(doc(db, 'gameRules', 'current'), testRules);
    console.log('✅ Regras atualizadas com sucesso!');
    console.log('   • Tempo por pergunta: 20s');
    console.log('   • Pontos por resposta: 15');
    console.log('   • Porcentagem para passar: 75%\n');
    
    // 4. Verificar se a atualização foi salva
    console.log('4️⃣ Verificando se a atualização foi salva...');
    const updatedRulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
    const updatedRules = updatedRulesDoc.data();
    
    if (updatedRules.timePerQuestion === 20 && 
        updatedRules.pointsPerCorrectAnswer === 15 && 
        updatedRules.passingPercentage === 75) {
      console.log('✅ Atualização confirmada!');
      console.log(`   Versão: ${updatedRules.version}`);
      console.log(`   Atualizado por: ${updatedRules.updatedBy}\n`);
    } else {
      console.log('❌ Erro na atualização!');
    }
    
    // 5. Restaurar regras padrão
    console.log('5️⃣ Restaurando regras padrão...');
    await setDoc(doc(db, 'gameRules', 'current'), DEFAULT_GAME_RULES);
    console.log('✅ Regras padrão restauradas!\n');
    
    console.log('🎉 Teste concluído com sucesso!');
    console.log('   O painel admin agora pode gerenciar as regras do jogo.');
    console.log('   Acesse a aba "Configurações" para ver as opções disponíveis.\n');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testGameRules();
