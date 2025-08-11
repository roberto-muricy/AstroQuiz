const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const csv = require('csv-parser');

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

// Mapeamento de tópicos para temas
const topicToThemeMap = {
  "Black Holes": "black-holes",
  "Stars": "stars", 
  "Planets": "planets",
  "Galaxies": "galaxies",
  "Solar System": "solar-system",
  "Space Exploration": "space-exploration",
  "Cosmology": "cosmology",
  "Astronomy": "astronomy",
  "Exoplanets": "exoplanets",
  "Space Technology": "space-technology"
};

// Função para importar apenas perguntas limpas
async function importCleanQuestions(csvFilePath) {
  console.log('🧹 Importando perguntas limpas do Google Sheets...');
  
  const questions = [];
  let importedCount = 0;
  let skippedCount = 0;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Verificar se a pergunta deve ser mantida (opcional)
        if (row.Manter && row.Manter !== 'SIM' && row.Keep && row.Keep !== 'YES') {
          skippedCount++;
          return;
        }
        
        // Verificar se tem dados essenciais
        if (!row.question || !row.topic) {
          console.log(`⚠️ Pergunta sem dados essenciais: sem pergunta ou tópico`);
          skippedCount++;
          return;
        }
        
        // Determinar idioma (detectar automaticamente)
        const questionText = row.question.toLowerCase();
        const portugueseWords = ['como', 'qual', 'quando', 'onde', 'porque', 'quem', 'o que', 'qual é', 'quantos', 'quantas'];
        const englishWords = ['how', 'what', 'when', 'where', 'why', 'who', 'which', 'how many', 'how much'];
        
        let language = 'en'; // padrão inglês
        for (const word of portugueseWords) {
          if (questionText.includes(word)) {
            language = 'pt';
            break;
          }
        }
        
        // Determinar nível
        const level = parseInt(row.level) || 1;
        
        // Determinar dificuldade
        let difficulty = 'easy';
        if (level >= 4) difficulty = 'hard';
        else if (level >= 2) difficulty = 'medium';
        
        // Mapear tema
        const themeId = topicToThemeMap[row.topic] || 'astronomy';
        
        // Criar opções (se não estiverem vazias)
        const options = [
          row.optionA || "Opção A",
          row.optionB || "Opção B", 
          row.optionC || "Opção C",
          row.optionD || "Opção D"
        ];
        
        // Determinar resposta correta
        const correctIndex = row.correctOption === 'A' ? 0 : 
                           row.correctOption === 'B' ? 1 : 
                           row.correctOption === 'C' ? 2 : 3;
        
        // Gerar ID único
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const question = {
          id: questionId,
          question: row.question,
          options: options,
          correctAnswer: correctIndex,
          explanation: row.explanation || "Sem explicação disponível",
          level: level,
          difficulty: difficulty,
          theme: themeId,
          topics: [row.topic],
          language: language,
          active: true,
          isBestVersion: true,
          duplicateCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            source: "Google Sheets Clean Import",
            verified: true,
            lastReviewed: new Date(),
            reviewCount: 0,
            duplicateResolution: "manually_selected",
            selectionReason: "Melhor versão selecionada"
          }
        };
        
        questions.push(question);
      })
      .on('end', async () => {
        console.log(`📊 Processamento concluído:`);
        console.log(`   - Perguntas para importar: ${questions.length}`);
        console.log(`   - Perguntas ignoradas: ${skippedCount}`);
        
        // Importar perguntas
        console.log('\n📥 Importando perguntas...');
        
        for (const question of questions) {
          try {
            await setDoc(doc(db, 'questions', question.id), question);
            importedCount++;
            console.log(`✅ Importada: "${question.question.substring(0, 50)}..." (${question.language}, nível ${question.level})`);
          } catch (error) {
            console.error(`❌ Erro ao importar ${question.id}:`, error.message);
          }
        }
        
        console.log(`\n🎉 Importação concluída!`);
        console.log(`   - Importadas: ${importedCount}`);
        console.log(`   - Ignoradas: ${skippedCount}`);
        
        resolve({ imported: importedCount, skipped: skippedCount });
      })
      .on('error', reject);
  });
}

// Função para criar backup antes da importação
async function createBackup() {
  console.log('💾 Criando backup antes da importação...');
  
  try {
    const { getDocs, collection } = require('firebase/firestore');
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    const backup = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const backupId = `backup_before_clean_import_${Date.now()}`;
    await setDoc(doc(db, 'backups', backupId), {
      id: backupId,
      questions: backup,
      createdAt: new Date(),
      description: 'Backup antes da importação limpa do Google Sheets'
    });
    
    console.log(`✅ Backup criado: ${backupId} (${backup.length} perguntas)`);
    return backupId;
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    return null;
  }
}

// Função para limpar todas as perguntas existentes
async function clearAllQuestions() {
  console.log('🗑️ Limpando todas as perguntas existentes...');
  
  try {
    const { getDocs, collection, deleteDoc } = require('firebase/firestore');
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    let deletedCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        await deleteDoc(doc.ref);
        deletedCount++;
        console.log(`🗑️ Removida: ${doc.id}`);
      } catch (error) {
        console.error(`❌ Erro ao remover ${doc.id}:`, error.message);
      }
    }
    
    console.log(`✅ Removidas ${deletedCount} perguntas`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Erro ao limpar perguntas:', error);
    return 0;
  }
}

// Função principal
async function main() {
  console.log('🌟 AstroQuiz - Importação Limpa do Google Sheets');
  console.log('===============================================');
  
  const args = process.argv.slice(2);
  const csvFile = args[0] || 'firebase-questions-export-2025-08-08.csv';
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Arquivo não encontrado: ${csvFile}`);
    console.log('\n💡 Como usar:');
    console.log('   1. Limpe as duplicatas no Google Sheets');
    console.log('   2. Adicione uma coluna "Manter" com "SIM" para as que quer manter');
    console.log('   3. Exporte como CSV');
    console.log('   4. Execute: node scripts/import-clean-questions.js seu-arquivo.csv');
    return;
  }
  
  try {
    // 1. Criar backup
    const backupId = await createBackup();
    
    // 2. Perguntar se quer limpar tudo
    if (args.includes('--clear-all')) {
      console.log('\n⚠️ ATENÇÃO: Isso vai remover TODAS as perguntas existentes!');
      console.log('   Use --clear-all apenas se tiver certeza!');
      
      const deletedCount = await clearAllQuestions();
      console.log(`\n🗑️ Removidas ${deletedCount} perguntas existentes`);
    }
    
    // 3. Importar perguntas limpas
    const result = await importCleanQuestions(csvFile);
    
    console.log('\n🎉 Processo concluído com sucesso!');
    console.log(`📊 Resultados:`);
    console.log(`   - Importadas: ${result.imported}`);
    console.log(`   - Ignoradas: ${result.skipped}`);
    console.log(`   - Backup: ${backupId}`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  importCleanQuestions,
  createBackup,
  clearAllQuestions
};
