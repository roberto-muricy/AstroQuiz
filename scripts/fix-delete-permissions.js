#!/usr/bin/env node

/**
 * 🔧 Corrigir Permissões de Exclusão
 * 
 * Este script aplica as regras corretas do Firestore para permitir exclusão
 */

const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo",
  authDomain: "astro-quiz-2umd.firebaseapp.com",
  projectId: "astro-quiz-2umd",
  storageBucket: "astro-quiz-2umd.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

console.log('🔧 Corrigindo permissões de exclusão...\n');

// Regras atualizadas do Firestore
const updatedRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== FUNÇÕES AUXILIARES =====
    
    // Verifica se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Verifica se o usuário é admin (baseado no email)
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.email in ['robertomuricy@gmail.com', 'joseanemansur@gmail.com'];
    }
    
    // Verifica se o usuário está acessando seus próprios dados
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Verifica se o documento tem os campos obrigatórios
    function hasRequiredFields(requiredFields) {
      return request.resource.data.keys().hasAll(requiredFields);
    }
    
    // ===== REGRAS PARA USUÁRIOS =====
    match /users/{userId} {
      // Usuários podem ler/escrever apenas seus próprios dados
      allow read, write: if isOwner(userId);
      // Admins podem ler todos os usuários
      allow read: if isAdmin();
    }
    
    // ===== REGRAS PARA PERGUNTAS =====
    match /questions/{questionId} {
      // Qualquer usuário autenticado pode ler perguntas
      allow read: if isAuthenticated();
      // Apenas admins podem criar/editar/deletar perguntas
      allow create, update: if isAdmin() && 
        hasRequiredFields(['question', 'options', 'correctAnswer', 'level', 'language']);
      // Permissão de exclusão simplificada para admins
      allow delete: if isAdmin();
    }
    
    // ===== REGRAS PARA ESTATÍSTICAS DE USUÁRIOS =====
    match /userStats/{userId} {
      // Usuários podem ler/escrever apenas suas próprias estatísticas
      allow read, write: if isOwner(userId);
      // Admins podem ler todas as estatísticas
      allow read: if isAdmin();
    }
    
    // ===== REGRAS PARA PROGRESSO DE USUÁRIOS =====
    match /userProgress/{progressId} {
      // Usuários podem ler/escrever apenas seu próprio progresso
      allow read, write: if isAuthenticated() && 
        request.auth.uid == resource.data.userId;
      // Admins podem ler todo o progresso
      allow read: if isAdmin();
    }
    
    // ===== REGRAS PARA REGRAS DO JOGO =====
    match /gameRules/{ruleId} {
      // Qualquer usuário autenticado pode ler regras do jogo
      allow read: if isAuthenticated();
      // Apenas admins podem modificar regras
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA TEMAS =====
    match /themes/{themeId} {
      // Qualquer usuário autenticado pode ler temas
      allow read: if isAuthenticated();
      // Apenas admins podem modificar temas
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA NÍVEIS =====
    match /levels/{levelId} {
      // Qualquer usuário autenticado pode ler níveis
      allow read: if isAuthenticated();
      // Apenas admins podem modificar níveis
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA CONJUNTOS DE PERGUNTAS =====
    match /question_sets/{setId} {
      // Qualquer usuário autenticado pode ler conjuntos
      allow read: if isAuthenticated();
      // Apenas admins podem modificar conjuntos
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA RELAÇÕES DE PERGUNTAS =====
    match /question_relations/{relationId} {
      // Qualquer usuário autenticado pode ler relações
      allow read: if isAuthenticated();
      // Apenas admins podem modificar relações
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA PREFERÊNCIAS DE USUÁRIOS =====
    match /user_preferences/{userId} {
      // Usuários podem ler/escrever apenas suas próprias preferências
      allow read, write: if isOwner(userId);
      // Admins podem ler todas as preferências
      allow read: if isAdmin();
    }
    
    // ===== REGRAS PARA CONQUISTAS =====
    match /achievements/{achievementId} {
      // Qualquer usuário autenticado pode ler conquistas
      allow read: if isAuthenticated();
      // Apenas admins podem modificar conquistas
      allow write: if isAdmin();
    }
    
    // ===== REGRAS PARA CONQUISTAS DE USUÁRIOS =====
    match /user_achievements/{userId} {
      // Usuários podem ler/escrever apenas suas próprias conquistas
      allow read, write: if isOwner(userId);
      // Admins podem ler todas as conquistas
      allow read: if isAdmin();
    }
    
    // ===== REGRAS PARA LOGS DE ATIVIDADE =====
    match /activity_logs/{logId} {
      // Apenas admins podem ler logs de atividade
      allow read: if isAdmin();
      // Sistema pode criar logs (se necessário)
      allow create: if isAuthenticated();
    }
    
    // ===== REGRAS PARA CONFIGURAÇÕES DO SISTEMA =====
    match /system_config/{configId} {
      // Apenas admins podem ler/escrever configurações
      allow read, write: if isAdmin();
    }
    
    // ===== REGRA PADRÃO - NEGAR TUDO =====
    // Qualquer collection não especificada acima será negada
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

console.log('📋 Regras atualizadas:');
console.log('✅ Permissão de exclusão simplificada para admins');
console.log('✅ Removida validação de campos obrigatórios para exclusão');
console.log('✅ Mantidas todas as outras regras de segurança\n');

console.log('🔧 Para aplicar as correções:');
console.log('');
console.log('1. Copie as regras acima');
console.log('2. Vá para o Firebase Console');
console.log('3. Navegue para Firestore Database > Rules');
console.log('4. Cole as regras e clique em "Publish"');
console.log('');
console.log('🌐 Firebase Console: https://console.firebase.google.com/project/astro-quiz-2umd/firestore/rules');
console.log('');
console.log('📝 Alternativamente, use o comando:');
console.log('   firebase deploy --only firestore:rules');
console.log('');
console.log('🎯 Após aplicar as regras, teste a exclusão novamente!');
