const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

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

// Função para normalizar texto (remover acentos, maiúsculas, etc.)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

// Função para calcular similaridade entre duas perguntas
function calculateSimilarity(text1, text2) {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  // Se são exatamente iguais após normalização
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  // Calcular similaridade usando palavras em comum
  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Função para encontrar duplicatas
async function findDuplicates() {
  console.log('🔍 Procurando perguntas duplicadas...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total de perguntas: ${questions.length}`);
    
    const duplicates = [];
    const processed = new Set();
    
    for (let i = 0; i < questions.length; i++) {
      if (processed.has(questions[i].id)) continue;
      
      const currentQuestion = questions[i];
      const similarQuestions = [];
      
      for (let j = i + 1; j < questions.length; j++) {
        if (processed.has(questions[j].id)) continue;
        
        const similarity = calculateSimilarity(currentQuestion.question, questions[j].question);
        
        if (similarity >= 0.8) { // 80% de similaridade
          similarQuestions.push({
            id: questions[j].id,
            question: questions[j].question,
            similarity: similarity,
            level: questions[j].level,
            language: questions[j].language || 'pt'
          });
          processed.add(questions[j].id);
        }
      }
      
      if (similarQuestions.length > 0) {
        duplicates.push({
          original: {
            id: currentQuestion.id,
            question: currentQuestion.question,
            level: currentQuestion.level,
            language: currentQuestion.language || 'pt'
          },
          duplicates: similarQuestions
        });
        processed.add(currentQuestion.id);
      }
    }
    
    console.log(`\n📋 Encontradas ${duplicates.length} perguntas com duplicatas:`);
    
    duplicates.forEach((group, index) => {
      console.log(`\n--- Grupo ${index + 1} ---`);
      console.log(`Original: "${group.original.question}" (ID: ${group.original.id})`);
      console.log(`Nível: ${group.original.level}, Idioma: ${group.original.language}`);
      
      group.duplicates.forEach(dup => {
        console.log(`  Duplicata: "${dup.question}" (ID: ${dup.id})`);
        console.log(`  Similaridade: ${(dup.similarity * 100).toFixed(1)}%, Nível: ${dup.level}, Idioma: ${dup.language}`);
      });
    });
    
    return duplicates;
    
  } catch (error) {
    console.error('❌ Erro ao procurar duplicatas:', error);
    return [];
  }
}

// Função para remover duplicatas (mantém a primeira de cada grupo)
async function removeDuplicates(duplicates) {
  console.log('\n🗑️ Removendo duplicatas...');
  
  try {
    let removedCount = 0;
    
    for (const group of duplicates) {
      console.log(`\nRemovendo duplicatas de: "${group.original.question}"`);
      
      for (const duplicate of group.duplicates) {
        try {
          await deleteDoc(doc(db, 'questions', duplicate.id));
          console.log(`  ✅ Removida: "${duplicate.question}" (ID: ${duplicate.id})`);
          removedCount++;
        } catch (error) {
          console.error(`  ❌ Erro ao remover ${duplicate.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Total de duplicatas removidas: ${removedCount}`);
    return removedCount;
    
  } catch (error) {
    console.error('❌ Erro ao remover duplicatas:', error);
    return 0;
  }
}

// Função para melhorar o script de importação (prevenir duplicatas futuras)
function improveImportScript() {
  console.log('\n🔧 Melhorias para o script de importação:');
  console.log(`
// Adicione esta função ao script de importação:

async function checkForDuplicates(newQuestion, existingQuestions) {
  const normalizedNew = normalizeText(newQuestion.question);
  
  for (const existing of existingQuestions) {
    const normalizedExisting = normalizeText(existing.question);
    
    if (normalizedNew === normalizedExisting) {
      console.log(\`⚠️ Pergunta duplicada encontrada: "\${newQuestion.question}"\`);
      return true;
    }
    
    // Verificar similaridade alta
    const similarity = calculateSimilarity(newQuestion.question, existing.question);
    if (similarity >= 0.8) {
      console.log(\`⚠️ Pergunta muito similar encontrada: "\${newQuestion.question}"\`);
      console.log(\`   Similaridade: \${(similarity * 100).toFixed(1)}% com "\${existing.question}"\`);
      return true;
    }
  }
  
  return false;
}

// Use na função de importação:
const existingQuestions = await getAllQuestions();
for (const newQuestion of questionsToImport) {
  if (!(await checkForDuplicates(newQuestion, existingQuestions))) {
    await addQuestion(newQuestion);
  }
}
  `);
}

// Função principal
async function main() {
  console.log('🌟 AstroQuiz - Removedor de Perguntas Duplicadas');
  console.log('===============================================');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--find-only')) {
    await findDuplicates();
  } else if (args.includes('--improve-import')) {
    improveImportScript();
  } else {
    const duplicates = await findDuplicates();
    
    if (duplicates.length > 0) {
      console.log(`\n❓ Deseja remover ${duplicates.length} grupos de duplicatas? (y/N)`);
      // Em produção, você pode adicionar uma confirmação interativa aqui
      
      if (args.includes('--auto-remove')) {
        await removeDuplicates(duplicates);
      } else {
        console.log('\n💡 Para remover automaticamente, use: node scripts/remove-duplicate-questions.js --auto-remove');
      }
    } else {
      console.log('\n✅ Nenhuma duplicata encontrada!');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  findDuplicates,
  removeDuplicates,
  calculateSimilarity,
  normalizeText
};
