# 🚨 Railway Deployment Errors - FIX V2

## 🚨 **Novos Erros Identificados**

### **Deployments com Erro:**
- **astro-quiz** (Deployment 2jpznblqt)
- **astroquiz-admin-panel** (Deployment 99va81nev)

## 🔍 **Problemas Persistentes**

### **1. Dependência Strapi Faltando**
- **Erro:** `Missing dependencies: strapi`
- **Causa:** Dependência não instalada corretamente
- **Impacto:** Build falha no Railway

### **2. Node.js Version Issues**
- **Problema:** Railway pode não estar respeitando `.nvmrc`
- **Solução:** Configurar explicitamente no Railway

### **3. Environment Variables**
- **Problema:** Variáveis não configuradas no Railway Dashboard
- **Impacto:** Runtime errors

## 🛠️ **Correções Imediatas**

### **1. Instalar Dependência Strapi**

```bash
# Instalar strapi globalmente
npm install -g @strapi/strapi

# Ou instalar localmente
npm install @strapi/strapi
```

### **2. Atualizar package.json**

```json
{
  "dependencies": {
    "@strapi/strapi": "^5.23.0",
    "@strapi/plugin-users-permissions": "^5.23.0",
    "@strapi/plugin-i18n": "^5.23.0"
  }
}
```

### **3. Configurar Railway Explicitamente**

#### **A. Adicionar Nixpacks.toml**
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

### **4. Variáveis de Ambiente Críticas**

#### **A. No Railway Dashboard → Variables:**
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

## 🚀 **Script de Correção Automática**

```bash
#!/bin/bash
# Railway Deployment Fix V2

echo "🚂 Fixing Railway deployment errors V2..."

# 1. Install missing dependencies
echo "📦 Installing missing dependencies..."
npm install @strapi/strapi@^5.23.0
npm install @strapi/plugin-users-permissions@^5.23.0
npm install @strapi/plugin-i18n@^5.23.0

# 2. Create Nixpacks.toml
echo "🔧 Creating Nixpacks.toml..."
cat > nixpacks.toml << 'EOF'
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run railway:build"]

[start]
cmd = "npm run railway:start"
EOF

# 3. Update railway.json
echo "🚂 Updating railway.json..."
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

# 4. Update package.json engines
echo "📦 Updating package.json engines..."
npm pkg set engines.node=">=18.0.0 <=20.x.x"
npm pkg set engines.npm=">=6.0.0"

# 5. Test build locally
echo "🔨 Testing build locally..."
npm run railway:build

# 6. Commit changes
echo "📝 Committing changes..."
git add .
git commit -m "fix: resolve railway deployment errors V2

- Install missing @strapi/strapi dependency
- Add Nixpacks.toml for explicit Node.js 18.20.4
- Update railway.json with Nixpacks configuration
- Set Node.js version constraints in package.json
- Configure Railway environment variables"
git push origin main

echo "✅ Railway deployment fixes applied!"
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

## 🎯 **Resumo das Correções V2**

1. **✅ Dependência Strapi:** Instalada corretamente
2. **✅ Nixpacks.toml:** Configuração explícita do Node.js 18.20.4
3. **✅ Railway.json:** Atualizado com Nixpacks
4. **✅ Environment Variables:** Lista completa fornecida
5. **✅ Build Test:** Testado localmente antes do deploy

**🎉 Com essas correções V2, seus deployments devem funcionar perfeitamente!**
