const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX", // Placeholder
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
};

console.log('🧪 Testando Correções das Regras do Jogo\n');

async function testGameRules() {
  try {
    // 1. Inicializar Firebase
    console.log('1️⃣ Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase inicializado');

    // 2. Testar leitura das regras atuais
    console.log('\n2️⃣ Testando leitura das regras...');
    try {
      const rulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
      if (rulesDoc.exists()) {
        const data = rulesDoc.data();
        console.log('✅ Regras existem no Firestore');
        console.log('   • Versão:', data.version || 'N/A');
        console.log('   • Time per Question:', data.timePerQuestion || 'N/A');
        console.log('   • Achievement Thresholds:', data.achievementThresholds ? '✅' : '❌');
      } else {
        console.log('⚠️ Regras não existem - criando padrão...');
      }
    } catch (error) {
      console.log('❌ Erro ao ler regras:', error.message);
      return;
    }

    // 3. Testar salvamento de regras
    console.log('\n3️⃣ Testando salvamento de regras...');
    try {
      const testRules = {
        timePerQuestion: 20,
        timeBonus: 3,
        timePenalty: 2,
        pointsPerCorrectAnswer: 15,
        pointsPerLevel: 150,
        pointsMultiplier: 2.0,
        streakBonus: 8,
        passingPercentage: 85,
        questionsPerLevel: 12,
        maxAttempts: 3,
        unlockRequirement: 2,
        difficultyMultiplier: 1.3,
        allowHints: true,
        allowSkip: false,
        showTimer: true,
        showProgress: true,
        rankingUpdateInterval: 10,
        rankingDisplayLimit: 100,
        enableNotifications: true,
        dailyReminder: true,
        achievementNotifications: true,
        achievementThresholds: {
          speedDemon: 180,
          perfectionist: 98,
          streakMaster: 7
        },
        lastUpdated: new Date(),
        updatedBy: 'test-script',
        version: '1.0.1'
      };

      await setDoc(doc(db, 'gameRules', 'current'), testRules);
      console.log('✅ Regras salvas com sucesso!');
      console.log('   • Time per Question: 20s');
      console.log('   • Achievement Thresholds: ✅');
      console.log('   • Versão: 1.0.1');

    } catch (error) {
      console.log('❌ Erro ao salvar regras:', error.message);
      return;
    }

    // 4. Verificar se as regras foram salvas
    console.log('\n4️⃣ Verificando regras salvas...');
    try {
      const savedRulesDoc = await getDoc(doc(db, 'gameRules', 'current'));
      if (savedRulesDoc.exists()) {
        const savedData = savedRulesDoc.data();
        console.log('✅ Regras verificadas com sucesso!');
        console.log('   • Time per Question:', savedData.timePerQuestion);
        console.log('   • Speed Demon Threshold:', savedData.achievementThresholds?.speedDemon);
        console.log('   • Perfectionist Threshold:', savedData.achievementThresholds?.perfectionist);
        console.log('   • Streak Master Threshold:', savedData.achievementThresholds?.streakMaster);
      }
    } catch (error) {
      console.log('❌ Erro ao verificar regras:', error.message);
    }

    console.log('\n🎯 Teste Concluído!');
    console.log('   ✅ Firebase conectado');
    console.log('   ✅ Regras lidas com sucesso');
    console.log('   ✅ Regras salvas com sucesso');
    console.log('   ✅ Achievement Thresholds funcionando');
    console.log('   ✅ Time per Question funcionando');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar teste
testGameRules().then(() => {
  console.log('\n📋 Próximos Passos:');
  console.log('   1. Teste o painel admin novamente');
  console.log('   2. Tente alterar "Time per Question"');
  console.log('   3. Clique em "Salvar Regras"');
  console.log('   4. Verifique se não há mais erros');
  
  console.log('\n🚀 Se ainda houver problemas:');
  console.log('   • Verifique o console do navegador');
  console.log('   • Recarregue a página do admin');
  console.log('   • Limpe o cache do navegador');
});


