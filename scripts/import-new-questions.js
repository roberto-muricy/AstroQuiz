const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where } = require('firebase/firestore');
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
  'Fermi Paradox': 'fermi-paradox',
  'Galaxies': 'galaxies',
  'Black Holes': 'black-holes',
  'Drake Equation': 'drake-equation',
  'Exoplanets': 'exoplanets',
  'Solar System': 'solar-system',
  'Stars': 'stars',
  'Cosmology': 'cosmology',
  'Space Missions': 'space-missions',
  'Astronomy': 'astronomy',
  'Physics': 'physics',
  'Telescopes': 'telescopes',
  'Planets': 'planets',
  'Comets': 'comets',
  'Asteroids': 'asteroids',
  'Nebulae': 'nebulae',
  'Dark Matter': 'dark-matter',
  'Dark Energy': 'dark-energy',
  'Quantum Physics': 'quantum-physics',
  'Relativity': 'relativity'
};

// Função para detectar idioma
function detectLanguage(text) {
  if (!text) return 'en';
  
  const questionText = text.toLowerCase();
  const portugueseWords = ['como', 'qual', 'quando', 'onde', 'porque', 'quem', 'o que', 'qual é', 'quantos', 'quantas', 'qual', 'quais'];
  const englishWords = ['how', 'what', 'when', 'where', 'why', 'who', 'which', 'how many', 'how much'];
  
  for (const word of portugueseWords) {
    if (questionText.includes(word)) {
      return 'pt';
    }
  }
  
  return 'en';
}

// Função para verificar se a pergunta já existe
async function questionExists(questionText) {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(questionsRef, where('question', '==', questionText));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar pergunta existente:', error);
    return false;
  }
}

// Função para importar novas perguntas
async function importNewQuestions(csvFilePath) {
  console.log('🌟 AstroQuiz - Importação de Novas Perguntas');
  console.log('===============================================');
  
  const questions = [];
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        // Verificar dados essenciais
        if (!row.question || !row.topic) {
          console.log('⚠️ Pergunta sem dados essenciais: sem pergunta ou tópico');
          skippedCount++;
          return;
        }
        
        // Verificar se já existe
        const exists = await questionExists(row.question);
        if (exists) {
          console.log(`🔄 Pergunta já existe: "${row.question.substring(0, 50)}..."`);
          duplicateCount++;
          return;
        }
        
        // Determinar idioma
        const language = detectLanguage(row.question);
        
        // Determinar nível
        const level = parseInt(row.level) || 1;
        
        // Determinar dificuldade
        let difficulty = 'easy';
        if (level >= 4) difficulty = 'hard';
        else if (level >= 2) difficulty = 'medium';
        
        // Mapear tema
        const themeId = topicToThemeMap[row.topic] || 'astronomy';
        
        // Criar opções
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
            source: "Google Sheets New Import",
            verified: true,
            lastReviewed: new Date(),
            reviewCount: 0,
            importDate: new Date()
          }
        };
        
        questions.push(question);
      })
      .on('end', async () => {
        console.log(`📊 Processamento concluído:`);
        console.log(`   - Novas perguntas para importar: ${questions.length}`);
        console.log(`   - Perguntas ignoradas: ${skippedCount}`);
        console.log(`   - Duplicatas encontradas: ${duplicateCount}`);
        
        // Importar perguntas
        console.log('\n📥 Importando novas perguntas...');
        
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
        console.log(`   - Duplicatas: ${duplicateCount}`);
        
        resolve({ imported: importedCount, skipped: skippedCount, duplicates: duplicateCount });
      })
      .on('error', reject);
  });
}

// Função principal
async function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.log('❌ Uso: node import-new-questions.js <arquivo-csv>');
    console.log('📝 Exemplo: node import-new-questions.js "novas-perguntas.csv"');
    return;
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.log(`❌ Arquivo não encontrado: ${csvFilePath}`);
    return;
  }
  
  try {
    await importNewQuestions(csvFilePath);
  } catch (error) {
    console.error('❌ Erro na importação:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  importNewQuestions,
  detectLanguage,
  questionExists
};
