# 🚂 Railway Deployment Fix Guide - AstroQuiz

## 🚨 **Problemas Identificados**

### **Deployments com Erro:**
- **astroquiz-admin-panel** (Deployment 5d3pcitiz)
- **astro-quiz** (Deployment 8w1yn1fh5)

## 🔍 **Diagnóstico dos Problemas**

### **1. Verificar Logs de Deploy**
```bash
# Acesse Railway Dashboard
# Vá para: Project → Deployments → [Deployment com erro]
# Clique em "View Logs"
```

### **2. Problemas Comuns Identificados**

#### **A. Build Failures**
- **Causa:** Dependências não instaladas corretamente
- **Solução:** Verificar `package.json` e `railway.json`

#### **B. Environment Variables**
- **Causa:** Variáveis de ambiente não configuradas
- **Solução:** Verificar Railway Variables

#### **C. Database Connection**
- **Causa:** `DATABASE_URL` não configurada
- **Solução:** Configurar PostgreSQL no Railway

## 🛠️ **Soluções Passo-a-Passo**

### **1. Verificar Configuração do Railway**

#### **A. railway.json (Já Configurado ✅)**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run railway:build"
  },
  "deploy": {
    "startCommand": "npm run railway:start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

#### **B. package.json Scripts (Já Configurado ✅)**
```json
{
  "railway:build": "rm -rf dist build .cache && npm run build",
  "railway:start": "NODE_ENV=production npm run start"
}
```

### **2. Configurar Variáveis de Ambiente**

#### **A. Variáveis Obrigatórias no Railway:**
```bash
# 🔐 Security Keys (CRÍTICO!)
APP_KEYS=IcoWvDRU/pwx28mqyVmW41dqRlS8Z8hzHuHNbATxItE=,2KxRvscx7UHsMPxJzbkGSTl3Bs9UPfKZnCcmLCnz+Uc=,r0rhigOzzArZj632XYiqJGh47uc1PLtUiRsunsVG3aY=,bDjOw/FVyHVfv4KnG59fdLGLx5L9Yoa+4JciwDQ1nB8=
API_TOKEN_SALT=JafSjJ2cPG0Q90WseZ9OWLkagdtH+cOI+PEDEqC6Qx8=
ADMIN_JWT_SECRET=Rt3dimDAcHLsdBD+6eG5pgBeGmdp03Q8okKk8jmyKlU=
TRANSFER_TOKEN_SALT=SwOErxKSPu1sgSwbD3lHHSb4AnO6CF4NSiI1A6Jt/Kw=
JWT_SECRET=aTKgGFD1DmFT6jmDvlP1+HlbXXcFkTfEqyISSqIHVUI=

# 🌍 Application
NODE_ENV=production
STRAPI_TELEMETRY_DISABLED=true

# 🗄️ Database (Railway fornece automaticamente)
# DATABASE_URL=postgresql://... (Auto-provided)

# 🌐 CORS
CORS_ORIGINS=https://your-frontend-domain.com,https://localhost:3000

# 🏛️ Admin Panel
ADMIN_PATH=/admin
SERVE_ADMIN=true
```

#### **B. Como Configurar no Railway:**
1. Acesse Railway Dashboard
2. Vá para seu projeto
3. Clique em "Variables" tab
4. Adicione cada variável acima
5. Clique "Deploy" para aplicar

### **3. Verificar Database Connection**

#### **A. PostgreSQL Setup:**
```bash
# 1. No Railway Dashboard:
# - Vá para "Data" tab
# - Clique "Add Database" → "PostgreSQL"
# - Railway criará DATABASE_URL automaticamente
```

#### **B. Verificar Connection String:**
```bash
# DATABASE_URL deve estar no formato:
# postgresql://username:password@host:port/database
```

### **4. Testar Deploy Localmente**

#### **A. Simular Build Railway:**
```bash
# No terminal local:
npm run railway:build
npm run railway:start
```

#### **B. Verificar se Funciona:**
```bash
# Testar endpoints:
curl http://localhost:1337/api/health
curl http://localhost:1337/admin
```

### **5. Deploy Manual**

#### **A. Forçar Novo Deploy:**
```bash
# 1. Fazer commit de mudanças
git add .
git commit -m "fix: resolve railway deployment issues"
git push origin main

# 2. No Railway Dashboard:
# - Vá para "Deployments"
# - Clique "Deploy" para forçar novo deploy
```

#### **B. Verificar Deploy Status:**
```bash
# Acompanhar logs em tempo real
# Railway Dashboard → Deployments → [Latest] → View Logs
```

## 🔧 **Scripts de Diagnóstico**

### **1. Verificar Configuração:**
```bash
# Executar localmente para testar
npm run deploy:verify
```

### **2. Testar Performance:**
```bash
# Testar endpoints de produção
npm run performance:test
```

### **3. Gerar Relatório:**
```bash
# Gerar relatório de deployment
npm run deploy:production-keys
```

## 🚨 **Troubleshooting Específico**

### **Erro: "Build Failed"**
```bash
# Solução:
1. Verificar se todas as dependências estão no package.json
2. Verificar se NODE_ENV=production está configurado
3. Verificar se DATABASE_URL está configurada
```

### **Erro: "Database Connection Failed"**
```bash
# Solução:
1. Verificar se PostgreSQL está configurado no Railway
2. Verificar se DATABASE_URL está correta
3. Verificar se SSL está configurado corretamente
```

### **Erro: "Admin Panel Not Loading"**
```bash
# Solução:
1. Verificar se ADMIN_PATH=/admin está configurado
2. Verificar se SERVE_ADMIN=true está configurado
3. Verificar se todas as chaves de segurança estão configuradas
```

### **Erro: "CORS Issues"**
```bash
# Solução:
1. Verificar CORS_ORIGINS no Railway Variables
2. Adicionar domínios permitidos
3. Verificar se frontend está configurado corretamente
```

## 📊 **Monitoramento**

### **1. Health Check:**
```bash
# Endpoint de saúde
GET /api/health
```

### **2. Admin Panel:**
```bash
# Acessar admin panel
GET /admin
```

### **3. API Endpoints:**
```bash
# Testar API
GET /api/questions?pagination[pageSize]=1
```

## 🎯 **Checklist de Deploy**

### **Antes do Deploy:**
- [ ] Todas as variáveis de ambiente configuradas
- [ ] PostgreSQL configurado no Railway
- [ ] Build local funcionando
- [ ] Testes passando

### **Durante o Deploy:**
- [ ] Acompanhar logs em tempo real
- [ ] Verificar se build completa
- [ ] Verificar se start command executa
- [ ] Verificar conexão com database

### **Após o Deploy:**
- [ ] Testar health check
- [ ] Testar admin panel
- [ ] Testar API endpoints
- [ ] Verificar logs de erro

## 📞 **Suporte**

### **Se ainda houver problemas:**
1. Verificar Railway Status: https://status.railway.app
2. Verificar logs detalhados no Railway Dashboard
3. Testar deploy local primeiro
4. Verificar se todas as variáveis estão corretas

---

**🎉 Com essas correções, seus deployments devem funcionar perfeitamente!**
