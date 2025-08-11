const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw",
  authDomain: "astroquiz-3a316.firebaseapp.com",
  projectId: "astroquiz-3a316",
  storageBucket: "astroquiz-3a316.appspot.com",
  messagingSenderId: "473888146350",
  appId: "1:473888146350:web:5381e61b07b74abe0dfe3f",
  measurementId: "G-WNNXRM88XS"
};

console.log('🔧 Aplicando Regras do Firestore Diretamente\n');

async function applyFirestoreRules() {
  try {
    // 1. Inicializar Firebase
    console.log('1️⃣ Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase inicializado');

    // 2. Criar documento de regras de teste
    console.log('\n2️⃣ Criando regras de teste...');
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
        updatedBy: 'admin-script',
        version: '1.0.1'
      };

      await setDoc(doc(db, 'gameRules', 'current'), testRules);
      console.log('✅ Regras de teste criadas com sucesso!');
      
    } catch (error) {
      console.log('❌ Erro ao criar regras de teste:', error.message);
      
      if (error.message.includes('permission')) {
        console.log('\n🔧 PROBLEMA IDENTIFICADO:');
        console.log('   • Erro de permissão no Firestore');
        console.log('   • As regras de segurança não estão configuradas');
        console.log('   • Solução: Aplicar regras manualmente no console\n');
        
        console.log('📋 PASSO A PASSO PARA RESOLVER:\n');
        
        console.log('1️⃣ Acesse: https://console.firebase.google.com');
        console.log('2️⃣ Selecione o projeto: astroquiz-3a316');
        console.log('3️⃣ Vá em: Firestore Database > Regras');
        console.log('4️⃣ Substitua as regras atuais por:\n');
        
        console.log('rules_version = \'2\';');
        console.log('service cloud.firestore {');
        console.log('  match /databases/{database}/documents {');
        console.log('    // Regras para a coleção users');
        console.log('    match /users/{userId} {');
        console.log('      allow read, write: if true;');
        console.log('    }');
        console.log('    ');
        console.log('    // Regras para a coleção questions');
        console.log('    match /questions/{questionId} {');
        console.log('      allow read, write: if true;');
        console.log('    }');
        console.log('    ');
        console.log('    // Regras para a coleção gameRules');
        console.log('    match /gameRules/{ruleId} {');
        console.log('      allow read, write: if true;');
        console.log('    }');
        console.log('    ');
        console.log('    // Regras para a coleção userStats');
        console.log('    match /userStats/{userId} {');
        console.log('      allow read, write: if true;');
        console.log('    }');
        console.log('    ');
        console.log('    // Regras para a coleção userProgress');
        console.log('    match /userProgress/{progressId} {');
        console.log('      allow read, write: if true;');
        console.log('    }');
        console.log('  }');
        console.log('}\n');
        
        console.log('5️⃣ Clique em "Publicar"');
        console.log('6️⃣ Aguarde alguns segundos');
        console.log('7️⃣ Execute este script novamente');
        
        return;
      }
    }

    // 3. Testar se as regras funcionam
    console.log('\n3️⃣ Testando se as regras funcionam...');
    try {
      const testDoc = await setDoc(doc(db, 'test', 'test'), { test: true });
      console.log('✅ Teste de escrita funcionando!');
      
      // Limpar documento de teste
      await setDoc(doc(db, 'test', 'test'), {});
      console.log('✅ Documento de teste limpo');
      
    } catch (error) {
      console.log('❌ Teste de escrita falhou:', error.message);
    }

    console.log('\n🎯 Status Final:');
    console.log('   ✅ Firebase conectado');
    console.log('   ✅ Regras aplicadas (se não houve erro)');
    console.log('   🔧 Se houve erro de permissão, aplique as regras manualmente');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar
applyFirestoreRules().then(() => {
  console.log('\n📋 Resumo:');
  console.log('   • Se não houve erros: Regras funcionando!');
  console.log('   • Se houve erro de permissão: Aplique as regras manualmente');
  console.log('   • Depois teste o painel admin novamente');
});

