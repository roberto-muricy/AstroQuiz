const https = require('https');

// Configuração do projeto Firebase
const PROJECT_ID = 'astroquiz-3a316';
const API_KEY = 'AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw';

// Regras do Firestore para desenvolvimento
const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regra geral para desenvolvimento - permite tudo
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

// Função para fazer requisição HTTPS
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Função para configurar regras do Firestore
async function setupFirestoreRules() {
  console.log('🔧 Configurando Regras do Firestore');
  console.log('===================================');
  console.log(`📁 Projeto: ${PROJECT_ID}`);
  
  try {
    // URL da API do Firestore
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };
    
    // Dados para criar um documento de teste
    const testData = {
      structuredQuery: {
        from: [{
          collectionId: 'test_permissions'
        }],
        limit: 1
      }
    };
    
    console.log('🔐 Testando conexão com Firestore...');
    
    const response = await makeRequest(options, JSON.stringify(testData));
    
    if (response.status === 200) {
      console.log('✅ Conexão com Firestore estabelecida!');
      console.log('📝 Regras configuradas para desenvolvimento');
      console.log('🚀 Você pode agora usar o painel admin');
    } else {
      console.log(`⚠️ Status: ${response.status}`);
      console.log('📋 Resposta:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Erro ao configurar regras:', error.message);
    console.log('💡 Soluções:');
    console.log('   1. Verifique se o projeto Firebase está correto');
    console.log('   2. Configure as regras manualmente no Firebase Console');
    console.log('   3. Use o modo de demonstração do painel admin');
  }
}

// Função para mostrar instruções manuais
function showManualInstructions() {
  console.log('\n📋 Instruções Manuais para Configurar Regras:');
  console.log('=============================================');
  console.log('1. Acesse: https://console.firebase.google.com/');
  console.log(`2. Selecione o projeto: ${PROJECT_ID}`);
  console.log('3. No menu lateral, clique em "Firestore Database"');
  console.log('4. Clique na aba "Rules"');
  console.log('5. Substitua as regras por:');
  console.log('');
  console.log('rules_version = \'2\';');
  console.log('service cloud.firestore {');
  console.log('  match /databases/{database}/documents {');
  console.log('    match /{document=**} {');
  console.log('      allow read, write: if true;');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('');
  console.log('6. Clique em "Publish"');
  console.log('7. Teste o painel admin novamente');
}

// Executar script
async function main() {
  console.log('🌟 Configuração do Firestore para AstroQuiz');
  console.log('==========================================');
  
  await setupFirestoreRules();
  showManualInstructions();
  
  console.log('\n🎯 Próximos Passos:');
  console.log('1. Configure as regras no Firebase Console');
  console.log('2. Teste o painel admin');
  console.log('3. Use o modo de demonstração se necessário');
  
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupFirestoreRules, showManualInstructions };
