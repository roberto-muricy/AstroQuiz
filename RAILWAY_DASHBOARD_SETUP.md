# 🚂 Railway Dashboard Setup - Final Guide

## 🎯 **Configuração Final do Railway Dashboard**

### **1. Acessar Railway Dashboard**
1. Vá para [railway.app](https://railway.app)
2. Faça login com sua conta
3. Selecione seu projeto **AstroQuiz**

### **2. Configurar Variáveis de Ambiente**

#### **A. Vá para Variables Tab:**
1. Clique em **"Variables"** no menu lateral
2. Clique em **"New Variable"** para cada variável abaixo

#### **B. Adicionar Todas as Variáveis:**
```bash
# Node.js Version (CRÍTICO!)
NODE_VERSION=18.20.4

# Environment
NODE_ENV=production
STRAPI_TELEMETRY_DISABLED=true

# Admin Panel
ADMIN_PATH=/admin
SERVE_ADMIN=true

# Security Keys (CRÍTICO!)
APP_KEYS=IcoWvDRU/pwx28mqyVmW41dqRlS8Z8hzHuHNbATxItE=,2KxRvscx7UHsMPxJzbkGSTl3Bs9UPfKZnCcmLCnz+Uc=,r0rhigOzzArZj632XYiqJGh47uc1PLtUiRsunsVG3aY=,bDjOw/FVyHVfv4KnG59fdLGLx5L9Yoa+4JciwDQ1nB8=
API_TOKEN_SALT=JafSjJ2cPG0Q90WseZ9OWLkagdtH+cOI+PEDEqC6Qx8=
ADMIN_JWT_SECRET=Rt3dimDAcHLsdBD+6eG5pgBeGmdp03Q8okKk8jmyKlU=
TRANSFER_TOKEN_SALT=SwOErxKSPu1sgSwbD3lHHSb4AnO6CF4NSiI1A6Jt/Kw=
JWT_SECRET=aTKgGFD1DmFT6jmDvlP1+HlbXXcFkTfEqyISSqIHVUI=

# CORS
CORS_ORIGINS=https://your-frontend-domain.com,https://localhost:3000

# Database
DATABASE_SSL=true
DATABASE_SSL_SELF=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Performance
CRON_ENABLED=false
WEBHOOKS_POPULATE_RELATIONS=false
```

### **3. Configurar Database**

#### **A. Vá para Data Tab:**
1. Clique em **"Data"** no menu lateral
2. Clique em **"Add Database"**
3. Selecione **"PostgreSQL"**
4. Railway criará `DATABASE_URL` automaticamente

### **4. Forçar Novo Deploy**

#### **A. Vá para Deployments Tab:**
1. Clique em **"Deployments"** no menu lateral
2. Clique em **"Deploy"** para forçar novo deployment
3. Monitore os logs em tempo real

### **5. Verificar Deploy**

#### **A. Health Check:**
```bash
curl https://your-app.railway.app/api/health
```

#### **B. Admin Panel:**
```bash
curl https://your-app.railway.app/admin
```

#### **C. API Test:**
```bash
curl https://your-app.railway.app/api/questions?pagination[pageSize]=1
```

## 🔧 **Arquivos de Configuração Criados**

### **1. .nvmrc**
```
18.20.4
```

### **2. nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run railway:build"]

[start]
cmd = "npm run railway:start"
```

### **3. railway.json**
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
  },
  "nixpacks": {
    "providers": ["nodejs"],
    "variables": {
      "NODE_VERSION": "18.20.4"
    }
  }
}
```

### **4. package.json engines**
```json
{
  "engines": {
    "node": ">=18.0.0 <=20.x.x",
    "npm": ">=6.0.0"
  }
}
```

## 🎯 **Checklist Final**

### **Antes do Deploy:**
- [ ] Todas as variáveis de ambiente configuradas no Railway
- [ ] PostgreSQL database configurado
- [ ] Build local funcionando (✅ TESTADO)
- [ ] Arquivos de configuração commitados

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

## 🚨 **Troubleshooting**

### **Se ainda houver problemas:**

#### **1. Verificar Logs:**
- Railway Dashboard → Deployments → [Latest] → View Logs

#### **2. Verificar Variáveis:**
- Railway Dashboard → Variables → Verificar se todas estão configuradas

#### **3. Verificar Database:**
- Railway Dashboard → Data → Verificar se PostgreSQL está ativo

#### **4. Testar Localmente:**
```bash
npm run railway:build
npm run railway:start
```

## 🎉 **Resultado Esperado**

Com essas configurações, seus deployments devem:
- ✅ **Build com sucesso** (Node.js 18.20.4 + Strapi)
- ✅ **Start corretamente** (Environment variables configuradas)
- ✅ **Conectar ao database** (PostgreSQL + SSL)
- ✅ **Admin panel funcionando** (Security keys configuradas)
- ✅ **API endpoints respondendo** (CORS configurado)

**🎉 Seus erros de deployment no Railway devem estar definitivamente resolvidos!**
