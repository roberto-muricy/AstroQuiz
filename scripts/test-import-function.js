#!/usr/bin/env node

/**
 * Script para testar a função de importação do Google Sheets
 */

const fetch = require('node-fetch');

async function testGoogleSheetsConnection() {
  console.log('🧪 Testando conexão com Google Sheets...');
  
  try {
    // Configurações do Google Sheets
    const SHEET_ID = "1MynKehJpoYX1T_DoCI3ugDWRSiz8EYBHt1C3S99BgQk";
    const API_KEY = "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo";
    const RANGE = "A:Z"; // Usar range de colunas em vez do nome da aba
    
    console.log('📋 Configurações:', { SHEET_ID, API_KEY, RANGE });
    
    // Fazer requisição para o Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    console.log('🔗 URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${data.error?.message || 'Erro desconhecido'}`);
    }
    
    console.log('✅ Conexão com Google Sheets bem-sucedida!');
    console.log('📋 Dados recebidos:', {
      totalRows: data.values?.length || 0,
      headers: data.values?.[0] || [],
      sampleRow: data.values?.[1] || []
    });
    
    if (data.values && data.values.length > 0) {
      console.log('🎉 Dados encontrados na planilha!');
      console.log('📝 Primeira linha (headers):', data.values[0]);
      console.log('📝 Segunda linha (dados):', data.values[1]);
    } else {
      console.log('⚠️ Nenhum dado encontrado na planilha');
    }
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('🔑 Problema com a API Key do Google Sheets');
    } else if (error.message.includes('404')) {
      console.log('📄 Planilha não encontrada ou não acessível');
    } else if (error.message.includes('403')) {
      console.log('🚫 Acesso negado - verifique as permissões da planilha');
    }
  }
}

// Executar o teste
testGoogleSheetsConnection();
