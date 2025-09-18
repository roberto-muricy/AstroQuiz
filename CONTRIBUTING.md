# 🤝 Guia de Contribuição - AstroQuiz

## 🎯 **Como Contribuir com o Projeto**

### **📋 Pré-requisitos**
- Node.js 18+
- npm 8+
- Git configurado
- Conhecimento básico de Strapi e CSS

## 🚀 **Setup Inicial**

### **1. Fork do Repositório**
```bash
# 1. Fork o repositório no GitHub
# 2. Clone seu fork
git clone https://github.com/SEU_USUARIO/AstroQuiz-Project.git
cd AstroQuiz-Project/quiz-cms
```

### **2. Configurar Remote Original**
```bash
# Adicionar repositório original como upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/AstroQuiz-Project.git

# Verificar remotes
git remote -v
```

### **3. Instalar Dependências**
```bash
npm install
```

## 🔄 **Fluxo de Trabalho**

### **1. Criar Branch para Feature**
```bash
# Atualizar branch main
git checkout main
git pull upstream main

# Criar nova branch
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/correcao-bug
```

### **2. Desenvolver Feature**
```bash
# Fazer suas alterações
# Testar localmente
npm run develop
npm run test:api

# Commit das alterações
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

### **3. Push e Pull Request**
```bash
# Push da branch
git push origin feature/nome-da-feature

# Criar Pull Request no GitHub
```

## 📝 **Padrões de Commit**

### **Formato:**
```
tipo(escopo): descrição

Corpo da mensagem (opcional)

Rodapé (opcional)
```

### **Tipos:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação, sem mudança de código
- `refactor:` - Refatoração de código
- `test:` - Adição de testes
- `chore:` - Tarefas de manutenção

### **Exemplos:**
```bash
feat(ui): adiciona botão de dark mode
fix(api): corrige erro de paginação
docs(readme): atualiza instruções de setup
style(css): melhora responsividade mobile
```

## 🧪 **Testes Obrigatórios**

### **Antes de Fazer Push:**
```bash
# 1. Testes da API
npm run test:api

# 2. Testes de Performance
npm run test:performance

# 3. Verificar se servidor inicia
npm run develop

# 4. Testar interface
# Acessar: http://localhost:1337/design-system/home-screen.html
```

### **Checklist de Qualidade:**
- [ ] Código funciona localmente
- [ ] Testes passam
- [ ] Interface responsiva
- [ ] Documentação atualizada
- [ ] Sem erros de linting

## 📁 **Estrutura de Arquivos**

### **Onde Colocar Código:**
```
src/
├── api/              # APIs customizadas
├── extensions/       # Extensões Strapi
├── middlewares/      # Middlewares
└── plugins/          # Plugins

public/
├── assets/           # Imagens, ícones
└── design-system/   # Interface web
```

### **Documentação:**
```
docs/                # Documentação técnica
README.md           # Visão geral
CONTRIBUTING.md     # Este arquivo
ONBOARDING_DEVELOPERS.md  # Guia para novos devs
```

## 🎨 **Padrões de Design**

### **CSS:**
- Use variáveis do design system (`variables.css`)
- Mantenha consistência com cores e fontes
- Teste responsividade

### **Componentes:**
- Siga a estrutura existente
- Use classes utilitárias
- Mantenha acessibilidade

## 🐛 **Reportar Bugs**

### **Template de Bug Report:**
```markdown
## 🐛 Descrição do Bug
Breve descrição do problema.

## 🔄 Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## 🎯 Comportamento Esperado
O que deveria acontecer.

## 📱 Ambiente
- OS: [ex: macOS, Windows, Linux]
- Node: [ex: 18.17.1]
- Navegador: [ex: Chrome 95]

## 📸 Screenshots
Se aplicável, adicione screenshots.
```

## ✨ **Sugerir Features**

### **Template de Feature Request:**
```markdown
## 🚀 Descrição da Feature
Descrição clara da funcionalidade desejada.

## 💡 Motivação
Por que esta feature seria útil?

## 📋 Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## 🎨 Mockups/Wireframes
Se aplicável, adicione designs.
```

## 🔄 **Processo de Review**

### **Para Reviewers:**
1. **Código:** Verificar qualidade e padrões
2. **Funcionalidade:** Testar localmente
3. **Documentação:** Verificar se está atualizada
4. **Testes:** Garantir que passam

### **Para Contributors:**
1. **Responder feedback** rapidamente
2. **Fazer ajustes** solicitados
3. **Manter branch atualizada** com main
4. **Comunicar** qualquer problema

## 📞 **Comunicação**

### **Canais:**
- **Issues:** Para bugs e features
- **Discussions:** Para dúvidas gerais
- **Pull Requests:** Para código

### **Etiquetas:**
- `bug` - Bug report
- `enhancement` - Feature request
- `documentation` - Melhoria de docs
- `good first issue` - Para iniciantes
- `help wanted` - Precisa de ajuda

## 🏆 **Reconhecimento**

### **Contribuidores serão reconhecidos:**
- No README.md
- Em releases
- No changelog

## 📚 **Recursos Adicionais**

### **Documentação:**
- [Strapi Docs](https://docs.strapi.io)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://conventionalcommits.org/)

### **Ferramentas:**
- VS Code (recomendado)
- GitKraken (Git GUI)
- Postman (API testing)

---

**🎉 Obrigado por contribuir com o AstroQuiz!**
