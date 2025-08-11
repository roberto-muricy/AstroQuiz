# 🧪 Guia de Teste - Painel Administrativo com Sidebar

## 1. 🚀 Como Iniciar

1. **Abra o terminal** e navegue até a pasta do projeto
2. **Execute**: `npm start`
3. **Acesse**: http://localhost:3000
4. **Interface Nova**: Agora você verá uma sidebar lateral com navegação por abas!

## 🎨 Nova Interface com Sidebar

### **Sidebar Features:**
- ❓ **Perguntas**: Gerenciar perguntas do quiz
- 👥 **Usuários**: Interface limpa com botão "Adicionar Usuário"
- 📊 **Analytics**: Relatórios e estatísticas (em desenvolvimento)
- ⚙️ **Configurações**: Configurações do sistema (em desenvolvimento)
- 📈 **Estatísticas em Tempo Real**: Total de perguntas, usuários e usuários ativos

### **🎨 Nova Interface de Usuários:**
- **Interface Limpa**: Apenas a tabela de usuários é exibida
- **Botão "Adicionar Usuário"**: No canto superior direito (estilo profissional)
- **Modal Simplificado**: Formulário compacto que abre em modal
- **Campos Essenciais**: Nome, Sobrenome, Email e Status

### **🎨 Nova Interface de Perguntas:**
- **Interface Limpa**: Apenas a tabela de perguntas é exibida
- **Botão "Adicionar Pergunta"**: No canto superior direito (estilo profissional)
- **Modal Completo**: Formulário com todos os campos necessários
- **Campos**: Tópico, Nível, Pergunta, 4 opções, Opção correta, Explicação
- **Filtros Ordenados**: Tópicos em ordem alfabética, Níveis em ordem numérica
- **Perguntas por Página**: Dropdown para selecionar 10, 25 ou 50 perguntas por página

## 2. 📋 Casos de Teste

### ✅ **Teste 1: Cadastrar Usuário via Modal**

**Passos:**
1. Clique no botão "Adicionar Usuário" (canto superior direito)
2. Modal deve abrir com formulário simplificado
3. Preencha os dados:
```
Nome: João
Sobrenome: Silva
Email: joao.silva@email.com
Status: Ativo
```

**Resultado esperado:** 
- ✅ Modal abre corretamente
- ✅ Usuário criado com sucesso!
- ✅ Modal fecha automaticamente
- ✅ Usuário aparece na lista
- ✅ Estatísticas na sidebar atualizam

---

### ✅ **Teste 2: Cadastrar Pergunta via Modal**

**Passos:**
1. Vá para a aba "Perguntas"
2. Clique no botão "Adicionar Pergunta" (canto superior direito)
3. Modal deve abrir com formulário completo
4. Preencha os dados:
```
Tópico: Astronomia
Nível: 1
Pergunta: Qual é o planeta mais próximo do Sol?
Opção A: Terra
Opção B: Vênus
Opção C: Mercúrio
Opção D: Marte
Opção Correta: Mercúrio
Explicação: Mercúrio é o primeiro planeta do sistema solar
```

**Resultado esperado:** 
- ✅ Modal abre corretamente
- ✅ Pergunta criada com sucesso!
- ✅ Modal fecha automaticamente
- ✅ Pergunta aparece na lista
- ✅ Estatísticas na sidebar atualizam

---

### ✅ **Teste 3: Perguntas por Página**

**Passos:**
1. Vá para a aba "Perguntas"
2. Localize o dropdown "Perguntas por página" nos filtros
3. Teste as opções:
   - Selecione "10" - deve mostrar 10 perguntas por página
   - Selecione "25" - deve mostrar 25 perguntas por página
   - Selecione "50" - deve mostrar 50 perguntas por página

**Resultado esperado:** 
- ✅ Dropdown aparece com opções 10, 25, 50
- ✅ Número de perguntas por página muda conforme seleção
- ✅ Paginação se ajusta automaticamente
- ✅ Página atual volta para 1 quando muda o número por página

---

### ✅ **Teste 2: Validação de Email**

**Teste com email inválido:**
```
Nome: Maria Santos
Email: email-invalido
Status: Ativo
```

**Resultado esperado:** 
- ❌ "Email inválido"

**Teste com email duplicado:**
```
Nome: João Duplicado
Email: joao.silva@email.com (mesmo do teste 1)
Status: Ativo
```

**Resultado esperado:** 
- ❌ "Este email já está cadastrado"

---

### ✅ **Teste 3: Validação de Campos Obrigatórios**

**Teste com nome vazio:**
```
Nome: (vazio)
Email: teste@email.com
Status: Ativo
```

**Resultado esperado:** 
- ❌ "Nome é obrigatório"

---

### ✅ **Teste 4: Gerenciamento de Usuários**

**Ações para testar:**

1. **Filtro por nome/email:**
   - Digite "João" no campo de busca
   - Deve mostrar apenas usuários com "João" no nome ou email

2. **Filtro por status:**
   - Selecione "Ativo" no filtro de status
   - Deve mostrar apenas usuários ativos

3. **Ativar/Desativar usuário:**
   - Clique em "Desativar" em um usuário ativo
   - Status deve mudar para "Inativo"
   - Botão deve mudar para "Ativar"

4. **Excluir usuário:**
   - Clique em "Excluir"
   - Deve aparecer confirmação
   - Usuário deve ser removido da lista

---

## 3. 🎯 Dados de Teste Sugeridos

```javascript
// Usuários para teste
const usuariosTeste = [
  {
    nome: "Ana Costa",
    email: "ana.costa@email.com",
    status: "Ativo"
  },
  {
    nome: "Carlos Oliveira", 
    email: "carlos.oliveira@email.com",
    status: "Ativo"
  },
  {
    nome: "Beatriz Santos",
    email: "beatriz.santos@email.com", 
    status: "Inativo"
  },
  {
    nome: "Diego Ferreira",
    email: "diego.ferreira@email.com",
    status: "Ativo"
  }
];
```

## 4. 🔍 Verificações no Firebase

1. **Acesse**: https://console.firebase.google.com/
2. **Projeto**: astroquiz-3a316
3. **Firestore Database**
4. **Coleção**: `users`
5. **Verifique** se os usuários estão sendo salvos com a estrutura:
   ```json
   {
     "name": "Nome do usuário",
     "email": "email@exemplo.com", 
     "status": "active",
     "createdAt": "timestamp",
     "totalScore": 0,
     "completedQuizzes": 0,
     "achievements": [],
     "preferences": {
       "notifications": true,
       "language": "pt"
     }
   }
   ```

## 5. 🐛 Resolução de Problemas

### **Problema: Página não carrega**
- Verifique se `npm start` está rodando
- Acesse http://localhost:3000
- Verifique o console do navegador (F12)

### **Problema: Erro no Firebase**
- Verifique se a configuração do Firebase está correta
- Confirme se as regras do Firestore permitem leitura/escrita
- Verifique se o projeto está ativo no Firebase Console

### **Problema: Componentes não aparecem**
- Verifique se não há erros no console
- Confirme se todos os arquivos foram salvos
- Reinicie o servidor (`Ctrl+C` e `npm start` novamente)

## 6. 📱 Testes de Responsividade

1. **Desktop**: Redimensione a janela
2. **Tablet**: Use DevTools (F12) → Device Toolbar
3. **Mobile**: Teste em diferentes tamanhos de tela

## 7. 🌐 Teste de Internacionalização

1. **Português**: Interface deve estar em português por padrão
2. **Inglês**: Mude o idioma e verifique se as traduções funcionam
3. **Mensagens**: Teste mensagens de erro e sucesso em ambos idiomas

---

## 🎉 Checklist de Teste Completo

### **Interface e Navegação:**
- [ ] Servidor iniciado com sucesso
- [ ] Sidebar aparece na lateral esquerda
- [ ] Navegação entre abas funciona (Perguntas/Usuários/Analytics/Configurações)
- [ ] Estatísticas em tempo real aparecem na sidebar
- [ ] Interface é responsiva

### **Funcionalidades de Usuários:**
- [ ] Cadastro de usuário válido funciona
- [ ] Validações de email funcionam
- [ ] Validações de campos obrigatórios funcionam
- [ ] Lista de usuários exibe dados
- [ ] Filtros funcionam corretamente
- [ ] Ações de ativar/desativar funcionam
- [ ] Exclusão com confirmação funciona
- [ ] Paginação funciona (se houver muitos usuários)

### **Funcionalidades de Perguntas:**
- [ ] Cadastro de perguntas funciona
- [ ] Lista de perguntas funciona
- [ ] Importação de planilha funciona

### **Técnico:**
- [ ] Dados são salvos no Firebase
- [ ] Traduções funcionam
- [ ] Console sem erros

**Status**: ✅ Todos os testes passaram | ❌ Problemas encontrados

---

*Última atualização: Janeiro 2024*
