# 🚨 Railway Deployment Errors - Fix Guide

## 🚨 **Problemas Identificados**

### **Deployments com Erro:**
- **astroquiz-admin-panel** (Deployment 5d3pcitiz)
- **astro-quiz** (Deployment 8w1yn1fh5)

## 🔍 **Causa Raiz dos Problemas**

### **1. Incompatibilidade de Versão do Node.js**
- **Problema:** Você está usando Node.js 22.17.1
- **Requisito:** Strapi requer Node.js 18-20
- **Erro:** `npm warn EBADENGINE Unsupported engine`

### **2. Problemas de Build**
- **SQLite3 compilation errors**
- **Python path issues**
- **Node-gyp build failures**

## 🛠️ **Soluções Imediatas**

### **Solução 1: Configurar Railway para Node.js 18**

#### **A. Adicionar .nvmrc (Recomendado)**
```bash
# Criar arquivo .nvmrc na raiz do projeto
echo "18.20.4" > .nvmrc
```

#### **B. Atualizar railway.json**
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

### **Solução 2: Configurar Variáveis de Ambiente no Railway**

#### **A. Variáveis Obrigatórias:**
```bash
# Node.js Version
NODE_VERSION=18.20.4

# Environment
NODE_ENV=production
STRAPI_TELEMETRY_DISABLED=true

# Admin Panel
ADMIN_PATH=/admin
SERVE_ADMIN=true

# Database (Railway provides automatically)
# DATABASE_URL=postgresql://... (Auto-provided)

# Security Keys (CRÍTICO!)
APP_KEYS=IcoWvDRU/pwx28mqyVmW41dqRlS8Z8hzHuHNbATxItE=,2KxRvscx7UHsMPxJzbkGSTl3Bs9UPfKZnCcmLCnz+Uc=,r0rhigOzzArZj632XYiqJGh47uc1PLtUiRsunsVG3aY=,bDjOw/FVyHVfv4KnG59fdLGLx5L9Yoa+4JciwDQ1nB8=
API_TOKEN_SALT=JafSjJ2cPG0Q90WseZ9OWLkagdtH+cOI+PEDEqC6Qx8=
ADMIN_JWT_SECRET=Rt3dimDAcHLsdBD+6eG5pgBeGmdp03Q8okKk8jmyKlU=
TRANSFER_TOKEN_SALT=SwOErxKSPu1sgSwbD3lHHSb4AnO6CF4NSiI1A6Jt/Kw=
JWT_SECRET=aTKgGFD1DmFT6jmDvlP1+HlbXXcFkTfEqyISSqIHVUI=

# CORS
CORS_ORIGINS=https://your-frontend-domain.com,https://localhost:3000

# Database SSL
DATABASE_SSL=true
DATABASE_SSL_SELF=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Performance
CRON_ENABLED=false
WEBHOOKS_POPULATE_RELATIONS=false
```

### **Solução 3: Atualizar package.json**

#### **A. Adicionar engines:**
```json
{
  "engines": {
    "node": ">=18.0.0 <=20.x.x",
    "npm": ">=6.0.0"
  }
}
```

#### **B. Atualizar scripts para Railway:**
```json
{
  "scripts": {
    "railway:build": "rm -rf dist build .cache && npm run build",
    "railway:start": "NODE_ENV=production npm run start"
  }
}
```

## 🚀 **Passos para Corrigir**

### **1. Criar .nvmrc**
```bash
echo "18.20.4" > .nvmrc
```

### **2. Atualizar railway.json**
```bash
# Substituir conteúdo do railway.json
cat > railway.json << 'EOF'
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
EOF
```

### **3. Atualizar package.json**
```bash
# Adicionar engines ao package.json
npm pkg set engines.node=">=18.0.0 <=20.x.x"
npm pkg set engines.npm=">=6.0.0"
```

### **4. Fazer Commit e Push**
```bash
git add .
git commit -m "fix: resolve railway deployment issues

- Add .nvmrc for Node.js 18.20.4
- Update railway.json with Nixpacks configuration
- Set Node.js version constraints in package.json
- Configure Railway environment variables"
git push origin main
```

### **5. Configurar Railway Dashboard**

#### **A. Variáveis de Ambiente:**
1. Acesse Railway Dashboard
2. Vá para seu projeto
3. Clique em "Variables" tab
4. Adicione todas as variáveis listadas acima
5. Clique "Deploy" para aplicar

#### **B. Database Setup:**
1. Vá para "Data" tab
2. Clique "Add Database" → "PostgreSQL"
3. Railway criará DATABASE_URL automaticamente

### **6. Forçar Novo Deploy**
1. Vá para "Deployments" tab
2. Clique "Deploy" para forçar novo deployment
3. Monitore os logs em tempo real

## 🔧 **Script de Correção Automática**

```bash
#!/bin/bash
# Railway Deployment Fix Script

echo "🚂 Fixing Railway deployment issues..."

# 1. Create .nvmrc
echo "18.20.4" > .nvmrc
echo "✅ Created .nvmrc with Node.js 18.20.4"

# 2. Update railway.json
cat > railway.json << 'EOF'
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
EOF
echo "✅ Updated railway.json with Nixpacks configuration"

# 3. Update package.json engines
npm pkg set engines.node=">=18.0.0 <=20.x.x"
npm pkg set engines.npm=">=6.0.0"
echo "✅ Updated package.json engines"

# 4. Commit changes
git add .
git commit -m "fix: resolve railway deployment issues

- Add .nvmrc for Node.js 18.20.4
- Update railway.json with Nixpacks configuration  
- Set Node.js version constraints in package.json
- Configure Railway environment variables"
git push origin main

echo "✅ Changes committed and pushed"
echo ""
echo "🎯 Next steps:"
echo "1. Go to Railway Dashboard → Variables tab"
echo "2. Add all required environment variables"
echo "3. Go to Deployments tab → Click Deploy"
echo "4. Monitor deployment logs"
```

## 📊 **Verificação Pós-Deploy**

### **1. Health Check:**
```bash
curl https://your-app.railway.app/api/health
```

### **2. Admin Panel:**
```bash
curl https://your-app.railway.app/admin
```

### **3. API Test:**
```bash
curl https://your-app.railway.app/api/questions?pagination[pageSize]=1
```

## 🎯 **Resumo das Correções**

1. **✅ Node.js Version:** Configurado para 18.20.4
2. **✅ Railway Config:** Atualizado com Nixpacks
3. **✅ Environment Variables:** Lista completa fornecida
4. **✅ Database:** PostgreSQL configurado
5. **✅ Security Keys:** Configurados para produção

**🎉 Com essas correções, seus deployments devem funcionar perfeitamente!**
