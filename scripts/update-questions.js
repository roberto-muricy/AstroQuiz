const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, updateDoc, getDocs, query, where } = require('firebase/firestore');

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

// Função para atualizar idioma de perguntas
async function updateQuestionsLanguage(oldLanguage, newLanguage) {
  console.log(`🔄 Atualizando idioma de ${oldLanguage} para ${newLanguage}...`);
  
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('language', '==', oldLanguage));
    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        language: newLanguage,
        updatedAt: new Date(),
        'metadata.lastUpdated': new Date()
      });
      updatedCount++;
    }
    
    console.log(`✅ ${updatedCount} perguntas atualizadas`);
    return updatedCount;
  } catch (error) {
    console.error('❌ Erro ao atualizar idioma:', error);
    return 0;
  }
}

// Função para atualizar nível de perguntas
async function updateQuestionsLevel(oldLevel, newLevel) {
  console.log(`🔄 Atualizando nível de ${oldLevel} para ${newLevel}...`);
  
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('level', '==', oldLevel));
    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        level: newLevel,
        updatedAt: new Date(),
        'metadata.lastUpdated': new Date()
      });
      updatedCount++;
    }
    
    console.log(`✅ ${updatedCount} perguntas atualizadas`);
    return updatedCount;
  } catch (error) {
    console.error('❌ Erro ao atualizar nível:', error);
    return 0;
  }
}

// Função para atualizar tema de perguntas
async function updateQuestionsTheme(oldTheme, newTheme) {
  console.log(`🔄 Atualizando tema de ${oldTheme} para ${newTheme}...`);
  
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('theme', '==', oldTheme));
    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        theme: newTheme,
        updatedAt: new Date(),
        'metadata.lastUpdated': new Date()
      });
      updatedCount++;
    }
    
    console.log(`✅ ${updatedCount} perguntas atualizadas`);
    return updatedCount;
  } catch (error) {
    console.error('❌ Erro ao atualizar tema:', error);
    return 0;
  }
}

// Função para reativar perguntas desativadas
async function reactivateQuestions() {
  console.log('🔄 Reativando perguntas desativadas...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('active', '==', false));
    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        active: true,
        updatedAt: new Date(),
        'metadata.lastUpdated': new Date()
      });
      updatedCount++;
    }
    
    console.log(`✅ ${updatedCount} perguntas reativadas`);
    return updatedCount;
  } catch (error) {
    console.error('❌ Erro ao reativar perguntas:', error);
    return 0;
  }
}

// Função principal
async function main() {
  const action = process.argv[2];
  const param1 = process.argv[3];
  const param2 = process.argv[4];
  
  console.log('🌟 AstroQuiz - Atualização de Perguntas');
  console.log('=========================================');
  
  switch (action) {
    case 'language':
      if (!param1 || !param2) {
        console.log('❌ Uso: node update-questions.js language <idioma-antigo> <idioma-novo>');
        console.log('📝 Exemplo: node update-questions.js language en pt');
        return;
      }
      await updateQuestionsLanguage(param1, param2);
      break;
      
    case 'level':
      if (!param1 || !param2) {
        console.log('❌ Uso: node update-questions.js level <nivel-antigo> <nivel-novo>');
        console.log('📝 Exemplo: node update-questions.js level 1 2');
        return;
      }
      await updateQuestionsLevel(parseInt(param1), parseInt(param2));
      break;
      
    case 'theme':
      if (!param1 || !param2) {
        console.log('❌ Uso: node update-questions.js theme <tema-antigo> <tema-novo>');
        console.log('📝 Exemplo: node update-questions.js theme astronomy galaxies');
        return;
      }
      await updateQuestionsTheme(param1, param2);
      break;
      
    case 'reactivate':
      await reactivateQuestions();
      break;
      
    default:
      console.log('❌ Ação não reconhecida. Ações disponíveis:');
      console.log('   language - Atualizar idioma');
      console.log('   level - Atualizar nível');
      console.log('   theme - Atualizar tema');
      console.log('   reactivate - Reativar perguntas');
      console.log('');
      console.log('📝 Exemplos:');
      console.log('   node update-questions.js language en pt');
      console.log('   node update-questions.js level 1 2');
      console.log('   node update-questions.js theme astronomy galaxies');
      console.log('   node update-questions.js reactivate');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateQuestionsLanguage,
  updateQuestionsLevel,
  updateQuestionsTheme,
  reactivateQuestions
};
