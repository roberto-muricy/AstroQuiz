#!/usr/bin/env node

/**
 * Script para debugar a função de importação
 */

console.log('🔍 Debugando função de importação...');

// Simular o contexto do navegador
global.window = {};
global.document = {
  createElement: (tag) => ({
    innerHTML: '',
    style: {},
    appendChild: () => {},
    click: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  querySelector: () => null
};

global.fetch = require('node-fetch');

// Testar se a função pode ser definida
try {
  const testFunction = async () => {
    console.log("🚀 Função de teste executada!");
    
    // Configurações do Google Sheets
    const SHEET_ID = "1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk";
    const API_KEY = "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo";
    const RANGE = "A:Z";
    
    console.log("📋 Configurações:", { SHEET_ID, API_KEY, RANGE });
    
    // Verificar se estamos no contexto correto
    if (typeof window === 'undefined') {
      console.error("❌ Erro: Função executada fora do contexto do navegador");
      return;
    }
    
    console.log("✅ Contexto do navegador OK");
    
    // Fazer requisição para o Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    console.log("🔗 Conectando com Google Sheets:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📊 Status da resposta:", response.status);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${data.error?.message || 'Erro desconhecido'}`);
    }
    
    console.log("✅ Conexão com Google Sheets bem-sucedida!");
    console.log("📋 Total de linhas:", data.values?.length || 0);
    
    return data;
  };
  
  console.log("✅ Função definida com sucesso");
  console.log("🔍 Tipo da função:", typeof testFunction);
  
  // Testar execução
  testFunction().then(result => {
    console.log("🎉 Função executada com sucesso!");
    console.log("📊 Resultado:", result ? "Dados recebidos" : "Sem dados");
  }).catch(error => {
    console.error("❌ Erro na execução:", error.message);
  });
  
} catch (error) {
  console.error("❌ Erro ao definir função:", error.message);
}

console.log('✅ Debug concluído');
