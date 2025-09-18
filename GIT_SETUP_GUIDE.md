# 🚀 Guia Completo de Setup Git - AstroQuiz

## 📋 **1. Preparação do Repositório**

### **Verificar Status Atual:**
```bash
# Verificar se já existe repositório Git
git status

# Verificar branch atual
git branch
```

### **Configurar Git (se necessário):**
```bash
# Configurar usuário (substitua pelos seus dados)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

## 🗂️ **2. Organizar Arquivos**

### **Adicionar Arquivos ao Git:**
```bash
# Adicionar todos os arquivos importantes
git add .

# Verificar o que será commitado
git status
```

### **Primeiro Commit:**
```bash
git commit -m "feat: initial commit - AstroQuiz project setup

- Complete Strapi CMS setup
- Design system implementation
- Multilingual support (PT, EN, ES, FR)
- API endpoints and testing
- Developer documentation
- Asset organization system"
```

## 🌐 **3. Criar Repositório no GitHub**

### **Opção A: Via GitHub Web**
1. Acesse https://github.com
2. Clique em "New repository"
3. Nome: `AstroQuiz-Project`
4. Descrição: `🚀 Multilingual Quiz System with Strapi CMS`
5. Marque como "Public" ou "Private"
6. **NÃO** inicialize com README (já temos)
7. Clique "Create repository"

### **Opção B: Via GitHub CLI**
```bash
# Instalar GitHub CLI (se não tiver)
# brew install gh  # macOS
# ou baixar de: https://cli.github.com

# Login no GitHub
gh auth login

# Criar repositório
gh repo create AstroQuiz-Project --public --description "🚀 Multilingual Quiz System with Strapi CMS"
```

## 🔗 **4. Conectar Repositório Local ao GitHub**

### **Adicionar Remote:**
```bash
# Adicionar repositório GitHub como origin
git remote add origin https://github.com/SEU_USUARIO/AstroQuiz-Project.git

# Verificar remotes
git remote -v
```

### **Push Inicial:**
```bash
# Push da branch main
git push -u origin main
```

## 📚 **5. Configurar Documentação**

### **Atualizar README.md:**
```bash
# O README já existe, mas você pode personalizar
# Adicionar badges, screenshots, etc.
```

### **Adicionar Badges (opcional):**
```markdown
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Strapi](https://img.shields.io/badge/Strapi-5.23.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
```

## 🏷️ **6. Criar Tags e Releases**

### **Primeira Tag:**
```bash
# Criar tag para versão inicial
git tag -a v1.0.0 -m "Release v1.0.0: Initial AstroQuiz setup"

# Push da tag
git push origin v1.0.0
```

### **Criar Release no GitHub:**
1. Vá para "Releases" no GitHub
2. Clique "Create a new release"
3. Tag: `v1.0.0`
4. Título: `🚀 AstroQuiz v1.0.0 - Initial Release`
5. Descrição: Detalhes das funcionalidades

## 👥 **7. Configurar Colaboradores**

### **Adicionar Colaboradores:**
1. Vá para "Settings" → "Collaborators"
2. Adicione usuários do GitHub
3. Defina permissões (Read, Write, Admin)

### **Configurar Branch Protection:**
1. Settings → Branches
2. Add rule para `main`
3. Require pull request reviews
4. Require status checks

## 🔄 **8. Configurar CI/CD (Opcional)**

### **GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:api
```

## 📋 **9. Checklist Final**

### **Verificações:**
- [ ] Repositório criado no GitHub
- [ ] Código pushed para GitHub
- [ ] README.md atualizado
- [ ] .gitignore configurado
- [ ] CONTRIBUTING.md criado
- [ ] Template de PR configurado
- [ ] Primeira tag criada
- [ ] Colaboradores adicionados (se necessário)

### **Teste de Clone:**
```bash
# Testar se outros podem clonar
cd /tmp
git clone https://github.com/SEU_USUARIO/AstroQuiz-Project.git
cd AstroQuiz-Project/quiz-cms
npm install
npm run develop
```

## 🎯 **10. Compartilhar com Desenvolvedores**

### **Template de Convite:**
```
Assunto: 🚀 Convite para Contribuir - AstroQuiz Project

Olá [Nome]!

Gostaria de convidá-lo para contribuir com o projeto AstroQuiz! 🎉

🔗 REPOSITÓRIO: https://github.com/SEU_USUARIO/AstroQuiz-Project
📚 DOCUMENTAÇÃO: https://github.com/SEU_USUARIO/AstroQuiz-Project/blob/main/ONBOARDING_DEVELOPERS.md
🤝 GUIA DE CONTRIBUIÇÃO: https://github.com/SEU_USUARIO/AstroQuiz-Project/blob/main/CONTRIBUTING.md

⚡ SETUP RÁPIDO:
1. git clone https://github.com/SEU_USUARIO/AstroQuiz-Project.git
2. cd AstroQuiz-Project/quiz-cms
3. npm install
4. npm run develop

🎯 O QUE VOCÊ PODE FAZER:
- Desenvolver novas funcionalidades
- Corrigir bugs
- Melhorar documentação
- Otimizar performance
- Adicionar testes

📋 CHECKLIST: Consulte CHECKLIST_ONBOARDING.md

Qualquer dúvida, estou à disposição!

Abraços,
[Seu Nome]
```

## 🛠️ **11. Comandos Úteis para Manutenção**

### **Atualizar Repositório:**
```bash
# Verificar status
git status

# Adicionar mudanças
git add .

# Commit
git commit -m "feat: descrição da mudança"

# Push
git push origin main
```

### **Gerenciar Branches:**
```bash
# Listar branches
git branch -a

# Criar nova branch
git checkout -b feature/nova-funcionalidade

# Deletar branch local
git branch -d nome-da-branch

# Deletar branch remota
git push origin --delete nome-da-branch
```

### **Sincronizar Fork:**
```bash
# Para quem fez fork do repositório
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

**🎉 Seu repositório AstroQuiz está pronto para ser compartilhado!**
