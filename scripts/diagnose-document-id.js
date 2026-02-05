/**
 * FASE 1: Diagnóstico do document_id
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const API_TOKEN = process.env.API_TOKEN;

async function diagnose() {
  console.log('🔍 FASE 1: Diagnóstico do document_id\n');

  try {
    // Vou criar um endpoint temporário que executa as queries
    console.log('Criando endpoint de diagnóstico...');
    console.log('Aguarde o deploy completar e então executaremos as queries.\n');

    console.log('Execute este comando após o deploy:');
    console.log(`curl -s "${PRODUCTION_URL}/api/questions/diagnose-document-id" | jq .`);

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

diagnose();
