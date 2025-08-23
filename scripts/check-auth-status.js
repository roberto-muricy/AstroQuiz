#!/usr/bin/env node

/**
 * 🔍 Verificar Status de Autenticação
 * 
 * Este script verifica se o usuário está autenticado e tem permissões de admin
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, onAuthStateChanged } = require('firebase/auth');
const { getFirestore, doc, deleteDoc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA-yXZxVVExRQ7fyYDG0JWRQ-EotGl0aQo",
  authDomain: "astro-quiz-2umd.firebaseapp.com",
  projectId: "astro-quiz-2umd",
  storageBucket: "astro-quiz-2umd.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('🔍 Verificando status de autenticação...\n');

// Verificar se há usuário autenticado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ Usuário autenticado:');
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email verificado: ${user.emailVerified}`);
    
    // Verificar se é admin
    const ADMIN_EMAILS = ['robertomuricy@gmail.com', 'joseanemansur@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email);
    
    console.log(`   É admin: ${isAdmin ? '✅ Sim' : '❌ Não'}`);
    
    if (isAdmin) {
      console.log('\n🧪 Testando permissões de exclusão...');
      
      try {
        // Tentar excluir um documento de teste (que não existe)
        const testDocRef = doc(db, 'questions', 'test-delete-permission');
        await deleteDoc(testDocRef);
        console.log('❌ Erro: Deveria ter falhado para documento inexistente');
      } catch (error) {
        if (error.code === 'permission-denied') {
          console.log('❌ Erro de permissão detectado!');
          console.log(`   Código: ${error.code}`);
          console.log(`   Mensagem: ${error.message}`);
          
          console.log('\n🔧 Possíveis soluções:');
          console.log('1. Verificar se as regras do Firestore estão corretas');
          console.log('2. Verificar se o token de autenticação está válido');
          console.log('3. Verificar se o email está na lista de admins');
          console.log('4. Tentar fazer logout e login novamente');
          
        } else if (error.code === 'not-found') {
          console.log('✅ Permissões OK - Erro esperado para documento inexistente');
        } else {
          console.log(`⚠️ Outro erro: ${error.code} - ${error.message}`);
        }
      }
    } else {
      console.log('\n❌ Usuário não é admin - não pode excluir perguntas');
    }
    
  } else {
    console.log('❌ Nenhum usuário autenticado');
    console.log('\n🔧 Para testar, faça login primeiro:');
    console.log('   npm run test-auth');
  }
});

// Aguardar um pouco para a verificação
setTimeout(() => {
  console.log('\n🏁 Verificação concluída');
  process.exit(0);
}, 3000);
