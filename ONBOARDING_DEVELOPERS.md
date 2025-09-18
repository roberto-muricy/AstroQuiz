# 👥 Guia de Onboarding para Desenvolvedores - AstroQuiz

## 🎯 **Visão Geral do Projeto**

O AstroQuiz é um sistema de quiz multilíngue com:
- **Backend:** Strapi CMS (Node.js)
- **Frontend:** Interface web responsiva
- **Idiomas:** Português, Inglês, Espanhol, Francês
- **Funcionalidades:** Quiz interativo, sistema de pontuação, design system completo

## 🚀 **Setup Inicial (5 minutos)**

### **1. Clone o Repositório**
```bash
git clone [URL_DO_REPOSITORIO]
cd "AstroQuiz Project/quiz-cms"
```

### **2. Instalar Dependências**
```bash
npm install
```

### **3. Iniciar o Servidor**
```bash
npm run develop
```

### **4. Acessar o Sistema**
- **Admin Panel:** http://localhost:1337/admin
- **Interface Web:** http://localhost:1337/design-system/home-screen.html

## 📁 **Estrutura do Projeto**

```
quiz-cms/
├── src/                    # Código fonte Strapi
│   ├── api/               # APIs customizadas
│   ├── extensions/        # Extensões do Strapi
│   ├── middlewares/       # Middlewares customizados
│   └── plugins/           # Plugins personalizados
├── public/                # Arquivos estáticos
│   ├── assets/           # Imagens, ícones
│   └── design-system/    # Interface web
├── config/               # Configurações
└── docs/                 # Documentação
```

## 🎨 **Design System**

### **Localização:**
```
public/design-system/
├── css/                  # Estilos CSS
│   ├── variables.css     # Variáveis do design system
│   └── home-screen.css   # Estilos da home screen
├── home-screen.html      # Interface principal
└── test-icons.html       # Teste de ícones
```

### **Principais Componentes:**
- **Tab Bar:** Navegação principal (Home, Quiz, Stats, Profile)
- **Daily Challenge:** Desafio diário com sistema de XP
- **Cards:** Sistema de cards responsivos
- **Ícones:** Biblioteca completa de ícones SVG/PNG

## 🌍 **Sistema Multilíngue**

### **Idiomas Suportados:**
- **Português (pt)** - Idioma principal
- **Inglês (en)** - Idioma base
- **Espanhol (es)**
- **Francês (fr)**

### **Como Funciona:**
```bash
# API com localização
GET /api/questions?locale=pt
GET /api/questions?locale=en
GET /api/questions?locale=es
GET /api/questions?locale=fr
```

## 🛠️ **Comandos Úteis**

### **Desenvolvimento:**
```bash
npm run develop          # Servidor de desenvolvimento
npm run build           # Build para produção
npm run start           # Servidor de produção
```

### **Testes:**
```bash
npm run test:api        # Testes da API
npm run test:performance # Testes de performance
```

### **Utilitários:**
```bash
# Verificar status do servidor
ps aux | grep strapi

# Verificar porta
lsof -i :1337

# Logs do sistema
tail -f strapi.log
```

## 🎨 **Customização do Design**

### **Alterar Fontes:**
**Arquivo:** `public/design-system/css/variables.css`
```css
--font-primary: 'Poppins', sans-serif;
--text-header-24-size: 24px;
```

### **Alterar Cores:**
```css
--primary-gradient: linear-gradient(90deg, #FFA726 0%, #FFB74D 100%);
--secondary-gradient: linear-gradient(90deg, #0FB57E 0%, #06996B 100%);
```

### **Alterar Textos:**
**Arquivo:** `public/design-system/home-screen.html`
```html
<div class="daily-challenge-subtitle">Seu texto aqui</div>
```

## 📊 **APIs Disponíveis**

### **Perguntas:**
```bash
# Listar perguntas
GET /api/questions

# Com paginação
GET /api/questions?pagination[pageSize]=10

# Com localização
GET /api/questions?locale=pt&pagination[pageSize]=5
```

### **Estatísticas:**
```bash
# Contar perguntas por idioma
GET /api/questions?locale=pt&pagination[pageSize]=1
```

## 🐛 **Troubleshooting**

### **Problemas Comuns:**

#### **1. Servidor não inicia:**
```bash
# Verificar se a porta está ocupada
lsof -i :1337
# Matar processo se necessário
kill -9 [PID]
```

#### **2. Ícones não aparecem:**
- Verificar se os arquivos estão em `public/assets/images/misc/`
- Usar servidor Strapi (porta 1337) em vez do Python (porta 8080)

#### **3. Erro de dependências:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### **4. Problemas de cache:**
```bash
# Limpar cache do navegador
Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
```

## 📚 **Recursos Adicionais**

### **Documentação:**
- `README.md` - Visão geral
- `QUICK_START.md` - Setup rápido
- `docs/` - Documentação técnica

### **Arquivos de Configuração:**
- `package.json` - Dependências
- `config/` - Configurações do Strapi
- `tsconfig.json` - TypeScript

### **Scripts Úteis:**
- `scripts/` - Scripts de migração e setup

## 🎯 **Próximos Passos**

### **Para Desenvolvedores Frontend:**
1. Explore `public/design-system/`
2. Teste diferentes resoluções
3. Customize cores e fontes
4. Adicione novos componentes

### **Para Desenvolvedores Backend:**
1. Explore `src/api/`
2. Adicione novos endpoints
3. Customize middlewares
4. Implemente novas funcionalidades

### **Para Desenvolvedores Full-Stack:**
1. Integre frontend com backend
2. Implemente autenticação
3. Adicione testes automatizados
4. Configure CI/CD

## 📞 **Suporte**

### **Em caso de dúvidas:**
1. Verifique a documentação em `docs/`
2. Consulte os logs em `strapi.log`
3. Teste com `npm run test:api`
4. Verifique o status do servidor

---

**🎉 Bem-vindo ao projeto AstroQuiz!**
