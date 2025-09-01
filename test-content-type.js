/**
 * Script para testar o Content Type Question
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337';

async function testQuestionAPI() {
  console.log('🧪 Testando API do Content Type Question...\n');

  try {
    // Teste 1: Verificar se a API está respondendo
    console.log('1️⃣ Testando se a API está online...');
    const response = await axios.get(`${BASE_URL}/api/questions`);
    console.log('✅ API está funcionando!');
    console.log(`   Total de perguntas: ${response.data.data?.length || 0}\n`);

    // Teste 2: Criar uma nova pergunta
    console.log('2️⃣ Criando uma nova pergunta...');
    const newQuestion = {
      data: {
        baseId: 'q0001',
        topic: 'Galaxies and Cosmology',
        level: 1,
        question: 'What is the largest galaxy in our local group?',
        optionA: 'Milky Way',
        optionB: 'Andromeda',
        optionC: 'Triangulum',
        optionD: 'Large Magellanic Cloud',
        correctOption: 'B',
        explanation: 'Andromeda is the largest galaxy in our local group, containing about 1 trillion stars.',
        language: 'en'
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/api/questions`, newQuestion);
    console.log('✅ Pergunta criada com sucesso!');
    console.log(`   ID: ${createResponse.data.data.id}\n`);

    // Teste 3: Buscar a pergunta criada
    console.log('3️⃣ Buscando a pergunta criada...');
    const getResponse = await axios.get(`${BASE_URL}/api/questions/${createResponse.data.data.id}`);
    console.log('✅ Pergunta encontrada!');
    console.log(`   Pergunta: ${getResponse.data.data.attributes.question}\n`);

    // Teste 4: Testar filtros
    console.log('4️⃣ Testando filtros...');
    const filterResponse = await axios.get(`${BASE_URL}/api/questions?filters[language][$eq]=en`);
    console.log(`✅ Filtro por idioma: ${filterResponse.data.data.length} perguntas encontradas\n`);

    // Teste 5: Testar filtro por nível
    console.log('5️⃣ Testando filtro por nível...');
    const levelResponse = await axios.get(`${BASE_URL}/api/questions?filters[level][$eq]=1`);
    console.log(`✅ Filtro por nível: ${levelResponse.data.data.length} perguntas encontradas\n`);

    console.log('🎉 Todos os testes passaram! O Content Type Question está funcionando perfeitamente.');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Executar os testes
testQuestionAPI();
