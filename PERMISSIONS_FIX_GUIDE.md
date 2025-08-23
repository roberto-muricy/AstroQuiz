# 🔧 Guia para Corrigir Permissões de Exclusão

## ❌ Problema Atual
Você está recebendo o erro: **"Missing or insufficient permissions"** ao tentar excluir perguntas.

## 🔍 Causa do Problema
As regras do Firestore estão exigindo validação de campos obrigatórios para exclusão, mas a operação de exclusão não precisa dessa validação.

## ✅ Solução

### **Passo 1: Acessar o Firebase Console**
1. Vá para: https://console.firebase.google.com/project/astro-quiz-2umd/firestore/rules
2. Faça login com sua conta Google

### **Passo 2: Atualizar as Regras**
Substitua as regras atuais pelas seguintes:

```javascript
rules_version = '2';
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
      // Apenas admins podem criar/editar perguntas
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
}
```

### **Passo 3: Publicar as Regras**
1. Cole as regras acima no editor
2. Clique em **"Publish"**
3. Aguarde a confirmação

### **Passo 4: Testar a Exclusão**
1. Volte para o painel admin: https://astroquiz-admin.vercel.app
2. Tente excluir uma pergunta
3. Deve funcionar sem erros

## 🔑 Principais Mudanças

### **Antes:**
```javascript
allow create, update, delete: if isAdmin() && 
  hasRequiredFields(['question', 'options', 'correctAnswer', 'level', 'language']);
```

### **Depois:**
```javascript
allow create, update: if isAdmin() && 
  hasRequiredFields(['question', 'options', 'correctAnswer', 'level', 'language']);
allow delete: if isAdmin();
```

## 🎯 Por que essa mudança?

1. **Exclusão não precisa de validação**: Quando você exclui um documento, não há dados para validar
2. **Simplificação**: A regra de exclusão fica mais simples e direta
3. **Segurança mantida**: Apenas admins ainda podem excluir
4. **Compatibilidade**: Funciona com a operação `deleteDoc()` do Firebase

## 🚨 Se ainda não funcionar

### **Verificar autenticação:**
1. Faça logout do painel admin
2. Faça login novamente
3. Verifique se está logado com um email de admin

### **Verificar console do navegador:**
1. Abra F12 (DevTools)
2. Vá na aba Console
3. Tente excluir uma pergunta
4. Veja se há erros específicos

### **Verificar regras:**
1. No Firebase Console, vá em Firestore > Rules
2. Verifique se as regras foram publicadas corretamente
3. Aguarde alguns minutos para propagação

## ✅ Resultado Esperado

Após aplicar as correções:
- ✅ **Exclusão funciona** sem erros
- ✅ **Segurança mantida** (apenas admins)
- ✅ **Criação/edição** continua funcionando
- ✅ **Leitura** continua funcionando

**Teste agora a exclusão de perguntas!** 🗑️
