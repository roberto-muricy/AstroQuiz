const { db } = require('../src/firebase/index.js');
const { collection, addDoc, query, where, getDocs } = require('firebase/firestore');

// Função para importar perguntas organizadas
async function importOrganizedQuestions() {
  try {
    console.log('🚀 Iniciando importação de perguntas organizadas...');
    
    // Dados de exemplo - substitua pelos dados reais do seu Google Sheets
    const questionsData = [
      // Exemplo de estrutura - substitua pelos seus dados reais
      {
        baseId: 'q0001',
        language: 'pt',
        topic: 'astronomia',
        level: 1,
        question: 'Qual é o planeta mais próximo do Sol?',
        optionA: 'Mercúrio',
        optionB: 'Vênus', 
        optionC: 'Terra',
        optionD: 'Marte',
        correctOption: 'A',
        explanation: 'Mercúrio é o primeiro planeta do sistema solar'
      },
      {
        baseId: 'q0001',
        language: 'en',
        topic: 'astronomy',
        level: 1,
        question: 'Which planet is closest to the Sun?',
        optionA: 'Mercury',
        optionB: 'Venus',
        optionC: 'Earth', 
        optionD: 'Mars',
        correctOption: 'A',
        explanation: 'Mercury is the first planet in the solar system'
      },
      {
        baseId: 'q0002',
        language: 'pt',
        topic: 'astronomia',
        level: 1,
        question: 'Quantos planetas existem no sistema solar?',
        optionA: '7',
        optionB: '8',
        optionC: '9',
        optionD: '10',
        correctOption: 'B',
        explanation: 'Existem 8 planetas no sistema solar'
      },
      {
        baseId: 'q0002',
        language: 'en',
        topic: 'astronomy',
        level: 1,
        question: 'How many planets are there in the solar system?',
        optionA: '7',
        optionB: '8',
        optionC: '9',
        optionD: '10',
        correctOption: 'B',
        explanation: 'There are 8 planets in the solar system'
      }
    ];

    console.log(`📊 Preparando para importar ${questionsData.length} perguntas...`);
    
    let importedCount = 0;
    let skippedCount = 0;

    for (const questionData of questionsData) {
      try {
        // Verificar se já existe uma pergunta com o mesmo baseId e language
        const existingQuery = query(
          collection(db, 'questions'),
          where('baseId', '==', questionData.baseId),
          where('language', '==', questionData.language)
        );
        
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          console.log(`⏭️ Pergunta já existe: ${questionData.baseId} (${questionData.language})`);
          skippedCount++;
          continue;
        }

        // Adicionar nova pergunta
        await addDoc(collection(db, 'questions'), {
          ...questionData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Importada: ${questionData.baseId} (${questionData.language}) - ${questionData.question.substring(0, 50)}...`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Erro ao importar pergunta ${questionData.baseId}:`, error);
      }
    }

    console.log(`🎉 Importação concluída!`);
    console.log(`✅ ${importedCount} perguntas importadas`);
    console.log(`⏭️ ${skippedCount} perguntas já existiam`);
    
  } catch (error) {
    console.error('❌ Erro geral na importação:', error);
  }
}

// Função para importar de CSV (se você exportar do Google Sheets)
async function importFromCSV(csvData) {
  try {
    console.log('📄 Importando de dados CSV...');
    
    // Aqui você pode processar os dados CSV
    // csvData seria o conteúdo do arquivo CSV exportado do Google Sheets
    
    console.log('✅ Importação CSV concluída!');
    
  } catch (error) {
    console.error('❌ Erro na importação CSV:', error);
  }
}

// Executa a importação
importOrganizedQuestions();
