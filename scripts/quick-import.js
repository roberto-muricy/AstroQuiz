const { db } = require('../src/firebase/index.js');
const { collection, addDoc, query, where, getDocs } = require('firebase/firestore');

// COLE AQUI OS DADOS DO SEU GOOGLE SHEETS
// Substitua este array pelos dados reais exportados do Google Sheets
const GOOGLE_SHEETS_DATA = [
  // Exemplo - substitua pelos seus dados reais
  // Copie e cole aqui os dados do seu Google Sheets
  // Formato esperado:
  // {
  //   baseId: 'q0001',
  //   language: 'pt',
  //   topic: 'astronomia',
  //   level: 1,
  //   question: 'Sua pergunta aqui?',
  //   optionA: 'Opção A',
  //   optionB: 'Opção B',
  //   optionC: 'Opção C',
  //   optionD: 'Opção D',
  //   correctOption: 'A',
  //   explanation: 'Explicação da resposta'
  // }
];

async function quickImport() {
  try {
    console.log('🚀 Iniciando importação rápida...');
    
    if (GOOGLE_SHEETS_DATA.length === 0) {
      console.log('❌ Nenhum dado encontrado. Adicione os dados do Google Sheets no array GOOGLE_SHEETS_DATA');
      return;
    }

    console.log(`📊 Encontrados ${GOOGLE_SHEETS_DATA.length} registros para importar`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const questionData of GOOGLE_SHEETS_DATA) {
      try {
        // Validar dados obrigatórios
        if (!questionData.baseId || !questionData.language || !questionData.question) {
          console.log(`⚠️ Dados incompletos: ${JSON.stringify(questionData)}`);
          errorCount++;
          continue;
        }

        // Verificar se já existe
        const existingQuery = query(
          collection(db, 'questions'),
          where('baseId', '==', questionData.baseId),
          where('language', '==', questionData.language)
        );
        
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          console.log(`⏭️ Já existe: ${questionData.baseId} (${questionData.language})`);
          skippedCount++;
          continue;
        }

        // Adicionar pergunta
        await addDoc(collection(db, 'questions'), {
          ...questionData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Importada: ${questionData.baseId} (${questionData.language})`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Erro: ${questionData.baseId}`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 RESULTADO FINAL:');
    console.log(`✅ ${importedCount} perguntas importadas`);
    console.log(`⏭️ ${skippedCount} perguntas já existiam`);
    console.log(`❌ ${errorCount} erros encontrados`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executa a importação
quickImport();
