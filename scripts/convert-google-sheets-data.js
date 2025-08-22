const fs = require('fs');
const path = require('path');

// ============================================================================
// 🔧 SCRIPT DE CONVERSÃO DE DADOS DO GOOGLE SHEETS
// ============================================================================

/**
 * Converte dados do Google Sheets para o formato de importação multi-idioma
 * 
 * Estrutura esperada do Google Sheets:
 * baseId | language | topic | level | question | optionA | optionB | optionC | optionD | correctOption | explanation
 */

// ============================================================================
// 📋 EXEMPLO DE DADOS DO GOOGLE SHEETS (SUBSTITUA PELOS SEUS DADOS REAIS)
// ============================================================================

// Copie e cole aqui os dados do seu Google Sheets
// Formato: array de objetos com as colunas do seu Google Sheets
const GOOGLE_SHEETS_RAW_DATA = [
  // Exemplo - SUBSTITUA pelos seus dados reais
  // Copie e cole aqui os dados exportados do seu Google Sheets
  {
    baseId: "q001",
    language: "pt",
    topic: "astronomia",
    level: 1,
    question: "Qual é o planeta mais próximo do Sol?",
    optionA: "Mercúrio",
    optionB: "Vênus",
    optionC: "Terra",
    optionD: "Marte",
    correctOption: "A",
    explanation: "Mercúrio é o planeta mais próximo do Sol, localizado a aproximadamente 57,9 milhões de km."
  },
  {
    baseId: "q001",
    language: "en",
    topic: "astronomy",
    level: 1,
    question: "Which planet is closest to the Sun?",
    optionA: "Mercury",
    optionB: "Venus",
    optionC: "Earth",
    optionD: "Mars",
    correctOption: "A",
    explanation: "Mercury is the planet closest to the Sun, located approximately 57.9 million km away."
  },
  {
    baseId: "q001",
    language: "es",
    topic: "astronomía",
    level: 1,
    question: "¿Cuál es el planeta más cercano al Sol?",
    optionA: "Mercurio",
    optionB: "Venus",
    optionC: "Tierra",
    optionD: "Marte",
    correctOption: "A",
    explanation: "Mercurio es el planeta más cercano al Sol, ubicado a aproximadamente 57,9 millones de km."
  },
  {
    baseId: "q001",
    language: "fr",
    topic: "astronomie",
    level: 1,
    question: "Quelle est la planète la plus proche du Soleil?",
    optionA: "Mercure",
    optionB: "Vénus",
    optionC: "Terre",
    optionD: "Mars",
    correctOption: "A",
    explanation: "Mercure est la planète la plus proche du Soleil, située à environ 57,9 millions de km."
  }
];

// ============================================================================
// 🔧 FUNÇÕES DE CONVERSÃO
// ============================================================================

function validateRawData(data) {
  console.log('✅ Validando dados brutos...');
  
  const errors = [];
  const warnings = [];
  
  data.forEach((row, index) => {
    // Verificar campos obrigatórios
    if (!row.baseId) errors.push(`Linha ${index + 1}: baseId ausente`);
    if (!row.language) errors.push(`Linha ${index + 1}: language ausente`);
    if (!row.question) errors.push(`Linha ${index + 1}: question ausente`);
    if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) {
      errors.push(`Linha ${index + 1}: opções incompletas`);
    }
    if (!row.correctOption) errors.push(`Linha ${index + 1}: correctOption ausente`);
    
    // Verificar idiomas suportados
    const supportedLanguages = ['pt', 'en', 'es', 'fr'];
    if (!supportedLanguages.includes(row.language)) {
      warnings.push(`Linha ${index + 1}: idioma não suportado: ${row.language}`);
    }
    
    // Verificar níveis
    const level = parseInt(row.level);
    if (isNaN(level) || level < 1 || level > 10) {
      warnings.push(`Linha ${index + 1}: nível inválido: ${row.level}`);
    }
    
    // Verificar resposta correta
    if (!['A', 'B', 'C', 'D'].includes(row.correctOption)) {
      errors.push(`Linha ${index + 1}: resposta correta inválida: ${row.correctOption}`);
    }
  });
  
  return { errors, warnings };
}

function cleanAndFormatData(data) {
  console.log('🧹 Limpando e formatando dados...');
  
  return data.map(row => ({
    baseId: String(row.baseId).trim(),
    language: String(row.language).toLowerCase().trim(),
    topic: String(row.topic).trim(),
    level: parseInt(row.level) || 1,
    question: String(row.question).trim(),
    optionA: String(row.optionA).trim(),
    optionB: String(row.optionB).trim(),
    optionC: String(row.optionC).trim(),
    optionD: String(row.optionD).trim(),
    correctOption: String(row.correctOption).toUpperCase().trim(),
    explanation: String(row.explanation || '').trim()
  }));
}

function groupByBaseId(data) {
  console.log('📊 Agrupando por baseId...');
  
  const grouped = {};
  
  data.forEach(row => {
    const baseId = row.baseId;
    if (!grouped[baseId]) {
      grouped[baseId] = [];
    }
    grouped[baseId].push(row);
  });
  
  return grouped;
}

function analyzeData(data) {
  console.log('📈 Analisando dados...');
  
  const grouped = groupByBaseId(data);
  const analysis = {
    totalQuestions: data.length,
    uniqueBaseIds: Object.keys(grouped).length,
    languages: {},
    levels: {},
    topics: {},
    completeness: {}
  };
  
  // Analisar idiomas
  data.forEach(row => {
    analysis.languages[row.language] = (analysis.languages[row.language] || 0) + 1;
  });
  
  // Analisar níveis
  data.forEach(row => {
    analysis.levels[row.level] = (analysis.levels[row.level] || 0) + 1;
  });
  
  // Analisar tópicos
  data.forEach(row => {
    analysis.topics[row.topic] = (analysis.topics[row.topic] || 0) + 1;
  });
  
  // Analisar completude por baseId
  Object.entries(grouped).forEach(([baseId, questions]) => {
    const languages = questions.map(q => q.language);
    const supportedLanguages = ['pt', 'en', 'es', 'fr'];
    const missingLanguages = supportedLanguages.filter(lang => !languages.includes(lang));
    
    analysis.completeness[baseId] = {
      total: questions.length,
      languages: languages,
      missingLanguages: missingLanguages,
      isComplete: missingLanguages.length === 0
    };
  });
  
  return analysis;
}

function generateReport(analysis) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE ANÁLISE DOS DADOS');
  console.log('='.repeat(60));
  
  console.log('\n📈 RESUMO GERAL:');
  console.log(`   Total de registros: ${analysis.totalQuestions}`);
  console.log(`   IDs únicos: ${analysis.uniqueBaseIds}`);
  console.log(`   Média por ID: ${(analysis.totalQuestions / analysis.uniqueBaseIds).toFixed(1)}`);
  
  console.log('\n🌍 DISTRIBUIÇÃO POR IDIOMA:');
  Object.entries(analysis.languages).forEach(([lang, count]) => {
    const langNames = { 'pt': 'Português', 'en': 'English', 'es': 'Español', 'fr': 'Français' };
    const langName = langNames[lang] || lang;
    console.log(`   ${langName} (${lang}): ${count} perguntas`);
  });
  
  console.log('\n📊 DISTRIBUIÇÃO POR NÍVEL:');
  Object.entries(analysis.levels)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([level, count]) => {
      console.log(`   Nível ${level}: ${count} perguntas`);
    });
  
  console.log('\n🎯 DISTRIBUIÇÃO POR TÓPICO:');
  Object.entries(analysis.topics)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      console.log(`   ${topic}: ${count} perguntas`);
    });
  
  console.log('\n✅ COMPLETUDE POR ID:');
  const completeIds = Object.entries(analysis.completeness).filter(([, info]) => info.isComplete);
  const incompleteIds = Object.entries(analysis.completeness).filter(([, info]) => !info.isComplete);
  
  console.log(`   IDs completos (4 idiomas): ${completeIds.length}`);
  console.log(`   IDs incompletos: ${incompleteIds.length}`);
  
  if (incompleteIds.length > 0) {
    console.log('\n⚠️ IDs INCOMPLETOS:');
    incompleteIds.forEach(([baseId, info]) => {
      console.log(`   ${baseId}: ${info.total}/4 idiomas (faltam: ${info.missingLanguages.join(', ')})`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

function generateImportCode(data) {
  console.log('💻 Gerando código de importação...');
  
  const formattedData = data.map(row => {
    return `  {
    baseId: "${row.baseId}",
    language: "${row.language}",
    topic: "${row.topic}",
    level: ${row.level},
    question: "${row.question.replace(/"/g, '\\"')}",
    optionA: "${row.optionA.replace(/"/g, '\\"')}",
    optionB: "${row.optionB.replace(/"/g, '\\"')}",
    optionC: "${row.optionC.replace(/"/g, '\\"')}",
    optionD: "${row.optionD.replace(/"/g, '\\"')}",
    correctOption: "${row.correctOption}",
    explanation: "${row.explanation.replace(/"/g, '\\"')}"
  }`;
  }).join(',\n');
  
  const importCode = `// Código gerado automaticamente - Cole no arquivo import-multilingual-questions.js
const GOOGLE_SHEETS_DATA = [
${formattedData}
];`;
  
  return importCode;
}

function saveToFile(data, filename) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Dados salvos em: ${filePath}`);
}

function saveImportCode(code, filename) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, code);
  console.log(`💾 Código de importação salvo em: ${filePath}`);
}

// ============================================================================
// 🚀 FUNÇÃO PRINCIPAL
// ============================================================================

function convertGoogleSheetsData() {
  try {
    console.log('🚀 Iniciando conversão de dados do Google Sheets...');
    console.log(`📋 Total de registros para processar: ${GOOGLE_SHEETS_RAW_DATA.length}`);
    
    // 1. Validar dados brutos
    const validation = validateRawData(GOOGLE_SHEETS_RAW_DATA);
    
    if (validation.errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      console.log('\n❌ Corrija os erros antes de continuar!');
      return;
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️ AVISOS:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    // 2. Limpar e formatar dados
    const cleanedData = cleanAndFormatData(GOOGLE_SHEETS_RAW_DATA);
    
    // 3. Analisar dados
    const analysis = analyzeData(cleanedData);
    
    // 4. Gerar relatório
    generateReport(analysis);
    
    // 5. Salvar dados processados
    saveToFile(cleanedData, 'processed-questions-data.json');
    
    // 6. Gerar código de importação
    const importCode = generateImportCode(cleanedData);
    saveImportCode(importCode, 'generated-import-code.js');
    
    console.log('\n🎉 Conversão concluída com sucesso!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Copie o conteúdo de "generated-import-code.js"');
    console.log('2. Cole no arquivo "import-multilingual-questions.js" (substitua GOOGLE_SHEETS_DATA)');
    console.log('3. Execute: node scripts/import-multilingual-questions.js');
    
  } catch (error) {
    console.error('❌ Erro durante a conversão:', error);
    throw error;
  }
}

// ============================================================================
// 🎯 EXECUÇÃO
// ============================================================================

// Executar conversão
if (require.main === module) {
  convertGoogleSheetsData()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução:', error);
      process.exit(1);
    });
}

module.exports = {
  convertGoogleSheetsData,
  validateRawData,
  cleanAndFormatData,
  analyzeData,
  generateReport
};
