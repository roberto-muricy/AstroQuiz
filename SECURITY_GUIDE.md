# 🔐 Guia de Segurança - AstroQuiz

## 🛡️ Regras de Segurança Implementadas

### ✅ **Autenticação Obrigatória**
- Todas as operações requerem autenticação
- Usuários não autenticados não podem acessar dados

### ✅ **Controle de Acesso por Função**
- **Usuários comuns:** Apenas seus próprios dados
- **Administradores:** Acesso completo ao sistema
- **Sistema:** Operações específicas permitidas

### ✅ **Proteção de Dados Pessoais**
- Usuários só acessam seus próprios dados
- Progresso, estatísticas e preferências protegidos
- Isolamento completo entre usuários

### ✅ **Controle de Conteúdo**
- Apenas admins podem criar/editar perguntas
- Validação de campos obrigatórios
- Proteção contra dados malformados

### ✅ **Negação por Padrão**
- Collections não especificadas são negadas
- Proteção contra acesso não autorizado
- Segurança em camadas

## 🎯 **Regras Específicas por Collection**

### 👥 **Users**
```javascript
// Usuários: apenas seus próprios dados
// Admins: leitura de todos os usuários
```

### ❓ **Questions**
```javascript
// Leitura: usuários autenticados
// Escrita: apenas admins + validação
```

### 📊 **UserStats & UserProgress**
```javascript
// Usuários: apenas seus próprios dados
// Admins: leitura de todos os dados
```

### 🎮 **GameRules, Themes, Levels**
```javascript
// Leitura: usuários autenticados
// Escrita: apenas admins
```

### 🔧 **System Config**
```javascript
// Acesso: apenas admins
```

## 🚀 **Como Aplicar as Regras**

### **Opção 1: Script Automático**
```bash
node scripts/apply-secure-rules.js
```

### **Opção 2: Manual**
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Fazer login
firebase login

# Aplicar regras
firebase deploy --only firestore:rules
```

### **Opção 3: Console Firebase**
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá para Firestore Database
4. Clique em "Rules"
5. Cole as regras do arquivo `firestore.rules`
6. Clique em "Publish"

## 🔍 **Testando as Regras**

### **Teste de Autenticação**
```javascript
// Deve falhar sem autenticação
firebase.firestore().collection('users').get()

// Deve funcionar com autenticação
firebase.auth().signInWithEmailAndPassword(email, password)
  .then(() => firebase.firestore().collection('users').get())
```

### **Teste de Permissões**
```javascript
// Usuário comum não pode acessar dados de outros
firebase.firestore().collection('users').doc('otherUserId').get()

// Admin pode acessar tudo
firebase.firestore().collection('questions').add(questionData)
```

## ⚠️ **Advertências Importantes**

### **🚨 Antes de Aplicar**
1. **Teste em desenvolvimento** primeiro
2. **Verifique se o app funciona** com as novas regras
3. **Tenha backup** dos dados importantes
4. **Monitore logs** após aplicação

### **🚨 Após Aplicar**
1. **Teste todas as funcionalidades** do app
2. **Verifique se usuários** conseguem acessar
3. **Monitore erros** no console
4. **Ajuste regras** se necessário

## 🔧 **Configuração de Admins**

### **Adicionar Novo Admin**
Edite o arquivo `firestore.rules`:
```javascript
function isAdmin() {
  return isAuthenticated() && 
         request.auth.token.email in [
           'robertomuricy@gmail.com',
           'novo@admin.com'  // Adicione aqui
         ];
}
```

### **Remover Admin**
```javascript
function isAdmin() {
  return isAuthenticated() && 
         request.auth.token.email in [
           'robertomuricy@gmail.com'
           // Remova o email desejado
         ];
}
```

## 📊 **Monitoramento de Segurança**

### **Logs Importantes**
- Tentativas de acesso negado
- Operações de admin
- Criação de usuários
- Modificações em perguntas

### **Alertas Recomendados**
- Múltiplas tentativas de login falhadas
- Acesso a dados de outros usuários
- Modificações em configurações críticas

## 🆘 **Em Caso de Problemas**

### **Reverter Regras**
```bash
# Aplicar regras de desenvolvimento
firebase deploy --only firestore:rules --project your-dev-project
```

### **Debug de Regras**
```javascript
// No console do navegador
firebase.firestore().collection('users').get()
  .then(snapshot => console.log('Sucesso'))
  .catch(error => console.error('Erro:', error))
```

### **Contato de Emergência**
- Verifique logs do Firebase Console
- Teste regras no simulador
- Consulte documentação oficial

## 📚 **Recursos Adicionais**

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/iam/security-best-practices)
- [Firestore Rules Simulator](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

---

**🔐 Segurança é prioridade! Sempre teste antes de aplicar em produção.**
