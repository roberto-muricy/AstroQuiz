const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } = require('firebase/firestore');

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

// Estratégia para escolher a melhor versão de cada pergunta
function selectBestVersion(questions) {
  // Critérios de prioridade:
  // 1. Idioma preferido (pt > en)
  // 2. Nível médio (5-7)
  // 3. Opções mais completas
  // 4. Explicação mais detalhada
  
  const sorted = questions.sort((a, b) => {
    // Prioridade 1: Idioma (português primeiro)
    if (a.language === 'pt' && b.language !== 'pt') return -1;
    if (b.language === 'pt' && a.language !== 'pt') return 1;
    
    // Prioridade 2: Nível médio (5-7)
    const aLevelScore = Math.abs(a.level - 6); // Quanto mais próximo de 6, melhor
    const bLevelScore = Math.abs(b.level - 6);
    if (aLevelScore !== bLevelScore) return aLevelScore - bLevelScore;
    
    // Prioridade 3: Explicação mais longa
    const aExplanationLength = a.explanation?.length || 0;
    const bExplanationLength = b.explanation?.length || 0;
    if (aExplanationLength !== bExplanationLength) return bExplanationLength - aExplanationLength;
    
    // Prioridade 4: Opções mais completas
    const aOptionsComplete = a.options?.every(opt => opt && opt.length > 3) || false;
    const bOptionsComplete = b.options?.every(opt => opt && opt.length > 3) || false;
    if (aOptionsComplete !== bOptionsComplete) return bOptionsComplete - aOptionsComplete;
    
    return 0;
  });
  
  return sorted[0];
}

// Função para limpar duplicatas inteligentemente
async function cleanDuplicatesIntelligently() {
  console.log('🧹 Iniciando limpeza inteligente de duplicatas...');
  
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total de perguntas: ${questions.length}`);
    
    // Agrupar por pergunta normalizada
    const groups = new Map();
    
    questions.forEach(question => {
      const normalized = normalizeText(question.question);
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized).push(question);
    });
    
    // Filtrar grupos com duplicatas
    const duplicateGroups = Array.from(groups.entries())
      .filter(([_, questions]) => questions.length > 1)
      .map(([normalized, questions]) => ({
        normalized,
        questions,
        best: selectBestVersion(questions)
      }));
    
    console.log(`📋 Encontrados ${duplicateGroups.length} grupos com duplicatas`);
    
    let removedCount = 0;
    let updatedCount = 0;
    
    for (const group of duplicateGroups) {
      console.log(`\n🔧 Processando: "${group.best.question}"`);
      console.log(`   Melhor versão: ID ${group.best.id}, Nível ${group.best.level}, Idioma ${group.best.language}`);
      
      // Atualizar a melhor versão com metadados
      try {
        await updateDoc(doc(db, 'questions', group.best.id), {
          duplicateCount: group.questions.length,
          isBestVersion: true,
          updatedAt: new Date(),
          metadata: {
            ...group.best.metadata,
            duplicateResolution: 'selected_as_best',
            totalDuplicates: group.questions.length
          }
        });
        updatedCount++;
        console.log(`   ✅ Versão principal atualizada`);
      } catch (error) {
        console.error(`   ❌ Erro ao atualizar versão principal:`, error.message);
      }
      
      // Remover duplicatas
      for (const duplicate of group.questions) {
        if (duplicate.id !== group.best.id) {
          try {
            await deleteDoc(doc(db, 'questions', duplicate.id));
            removedCount++;
            console.log(`   🗑️ Removida duplicata: ID ${duplicate.id}`);
          } catch (error) {
            console.error(`   ❌ Erro ao remover ${duplicate.id}:`, error.message);
          }
        }
      }
    }
    
    console.log(`\n📊 Resultado da limpeza:`);
    console.log(`   - Versões principais atualizadas: ${updatedCount}`);
    console.log(`   - Duplicatas removidas: ${removedCount}`);
    console.log(`   - Perguntas restantes: ${questions.length - removedCount}`);
    
    return {
      updated: updatedCount,
      removed: removedCount,
      remaining: questions.length - removedCount
    };
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
    return { updated: 0, removed: 0, remaining: 0 };
  }
}

// Função para normalizar texto
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para melhorar o script de importação
function generateImprovedImportScript() {
  console.log('\n🔧 Script de importação melhorado:');
  console.log(`
// === SCRIPT DE IMPORTAÇÃO MELHORADO ===

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = { /* sua configuração */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para normalizar texto
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

// Função para verificar duplicatas
async function checkForDuplicates(newQuestion) {
  try {
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    const normalizedNew = normalizeText(newQuestion.question);
    
    for (const doc of snapshot.docs) {
      const existing = doc.data();
      const normalizedExisting = normalizeText(existing.question);
      
      if (normalizedNew === normalizedExisting) {
        console.log(\`⚠️ Duplicata encontrada: "\${newQuestion.question}"\`);
        console.log(\`   ID existente: \${doc.id}, Nível: \${existing.level}, Idioma: \${existing.language}\`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    return false;
  }
}

// Função para importar com verificação de duplicatas
async function importQuestionsWithDuplicateCheck(questionsToImport) {
  console.log('📥 Iniciando importação com verificação de duplicatas...');
  
  let importedCount = 0;
  let skippedCount = 0;
  
  for (const question of questionsToImport) {
    try {
      const isDuplicate = await checkForDuplicates(question);
      
      if (isDuplicate) {
        skippedCount++;
        continue;
      }
      
      // Gerar ID único
      const questionId = \`q_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
      
      // Adicionar metadados
      const questionWithMetadata = {
        ...question,
        id: questionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isBestVersion: true,
        duplicateCount: 0,
        metadata: {
          source: 'Google Sheets Import',
          verified: true,
          lastReviewed: new Date(),
          reviewCount: 0,
          duplicateResolution: 'new_question'
        }
      };
      
      await setDoc(doc(db, 'questions', questionId), questionWithMetadata);
      importedCount++;
      
      console.log(\`✅ Importada: "\${question.question.substring(0, 50)}..."\`);
      
    } catch (error) {
      console.error(\`❌ Erro ao importar pergunta: \${error.message}\`);
    }
  }
  
  console.log(\`\\n📊 Resultado da importação:\`);
  console.log(\`   - Importadas: \${importedCount}\`);
  console.log(\`   - Duplicatas ignoradas: \${skippedCount}\`);
  
  return { imported: importedCount, skipped: skippedCount };
}

// Uso:
// const questionsFromCSV = parseCSV('seu-arquivo.csv');
// await importQuestionsWithDuplicateCheck(questionsFromCSV);
  `);
}

// Função principal
async function main() {
  console.log('🌟 AstroQuiz - Estratégia de Limpeza de Duplicatas');
  console.log('=================================================');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--clean')) {
    await cleanDuplicatesIntelligently();
  } else if (args.includes('--generate-script')) {
    generateImprovedImportScript();
  } else {
    console.log('📋 Opções disponíveis:');
    console.log('   --clean: Limpar duplicatas existentes');
    console.log('   --generate-script: Gerar script de importação melhorado');
    console.log('\n💡 Recomendação: Use --clean primeiro, depois --generate-script');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  cleanDuplicatesIntelligently,
  selectBestVersion,
  normalizeText
};
