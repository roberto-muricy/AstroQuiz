const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Aplicando regras de segurança no Firebase...');

// Verificar se o arquivo de regras existe
const rulesPath = path.join(__dirname, '..', 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('❌ Arquivo firestore.rules não encontrado!');
  process.exit(1);
}

console.log('📋 Regras encontradas. Aplicando...');

// Comando para aplicar as regras
const command = 'firebase deploy --only firestore:rules';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao aplicar regras:', error.message);
    console.log('\n📝 Para aplicar manualmente:');
    console.log('1. Instale o Firebase CLI: npm install -g firebase-tools');
    console.log('2. Faça login: firebase login');
    console.log('3. Aplique as regras: firebase deploy --only firestore:rules');
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Avisos:', stderr);
  }
  
  console.log('✅ Regras aplicadas com sucesso!');
  console.log('📤 Output:', stdout);
  
  console.log('\n🛡️ RESUMO DAS REGRAS APLICADAS:');
  console.log('• ✅ Autenticação obrigatória para todas as operações');
  console.log('• ✅ Usuários só acessam seus próprios dados');
  console.log('• ✅ Apenas admins podem modificar conteúdo');
  console.log('• ✅ Validação de campos obrigatórios');
  console.log('• ✅ Negação por padrão para collections não especificadas');
  console.log('• ✅ Proteção contra acesso não autorizado');
});
