const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 CORREÇÃO RÁPIDA DO FIRESTORE\n');

// Verificar se o Firebase CLI está instalado
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Aplicar regras via Firebase CLI
function applyRulesWithCLI() {
  try {
    console.log('📋 Aplicando regras via Firebase CLI...');
    
    // Verificar se estamos no diretório correto
    if (!fs.existsSync('firestore.rules')) {
      console.log('❌ Arquivo firestore.rules não encontrado!');
      console.log('   Certifique-se de estar no diretório AstroQuiz_Admin');
      return false;
    }
    
    // Aplicar regras
    execSync('firebase deploy --only firestore:rules', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Regras aplicadas com sucesso!');
    return true;
    
  } catch (error) {
    console.log('❌ Erro ao aplicar regras:', error.message);
    return false;
  }
}

// Solução manual
function showManualSolution() {
  console.log('\n🔧 SOLUÇÃO MANUAL:\n');
  
  console.log('1️⃣ Acesse: https://console.firebase.google.com');
  console.log('2️⃣ Selecione o projeto: astroquiz-3a316');
  console.log('3️⃣ Vá em: Firestore Database > Regras');
  console.log('4️⃣ Substitua as regras atuais por:\n');
  
  const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção users
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção questions
    match /questions/{questionId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção gameRules
    match /gameRules/{ruleId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção userStats
    match /userStats/{userId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção userProgress
    match /userProgress/{progressId} {
      allow read, write: if true;
    }
    
    // Regras para a coleção userAchievements
    match /userAchievements/{achievementId} {
      allow read, write: if true;
    }
  }
}`;
  
  console.log(rules);
  console.log('\n5️⃣ Clique em "Publicar"');
  console.log('6️⃣ Aguarde alguns segundos');
  console.log('7️⃣ Teste o painel admin novamente');
}

// Executar
async function main() {
  console.log('🔍 Verificando Firebase CLI...');
  
  if (checkFirebaseCLI()) {
    console.log('✅ Firebase CLI encontrado');
    
    if (applyRulesWithCLI()) {
      console.log('\n🎯 Regras aplicadas com sucesso!');
      console.log('   Teste o painel admin novamente');
    } else {
      console.log('\n⚠️  Falha ao aplicar regras automaticamente');
      showManualSolution();
    }
  } else {
    console.log('❌ Firebase CLI não encontrado');
    console.log('\n📦 Para instalar o Firebase CLI:');
    console.log('   npm install -g firebase-tools');
    console.log('   firebase login');
    console.log('\n🔧 Ou use a solução manual:');
    showManualSolution();
  }
}

main();
