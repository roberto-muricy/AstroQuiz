# 🔑 Railway Environment Variables Setup Guide

## 🚨 **CRITICAL: Configure These Variables BEFORE Deployment**

Railway needs these environment variables configured **before** the first deployment to avoid build failures.

---

## 📋 **Step-by-Step Variable Configuration**

### 1. **Access Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Select your AstroQuiz project
3. Click on your service (main app)
4. Go to **"Variables"** tab

### 2. **Required Variables (Set These First)**

#### 🔐 **Security Variables** (Generate with `npm run deploy:production-keys`)
```bash
NODE_ENV=production
APP_KEYS=your-4-comma-separated-keys
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-salt
JWT_SECRET=your-jwt-secret
```

#### 🗄️ **Database Variables** (PostgreSQL)
```bash
# DATABASE_URL is auto-provided by Railway PostgreSQL service
# Just ensure PostgreSQL service is added to your project
```

#### 📊 **Application Variables**
```bash
STRAPI_TELEMETRY_DISABLED=true
STRAPI_DISABLE_UPDATE_NOTIFICATION=true
STRAPI_HIDE_STARTUP_MESSAGE=true
```

### 3. **Optional Variables**

#### 🔤 **DeepL Translation**
```bash
DEEPL_API_KEY=9f331073-436a-407d-b9d8-d4076fc4415c:fx
DEEPL_API_URL=https://api.deepl.com/v2
```

#### 🌐 **CORS Configuration**
```bash
CORS_ORIGINS=https://your-frontend.vercel.app,https://localhost:3000
```

#### 🏛️ **Admin Configuration**
```bash
ADMIN_PATH=/admin
SERVE_ADMIN=true
```

---

## 🚂 **Railway-Specific Setup Process**

### **Option A: Using Railway Dashboard (Recommended)**

1. **Generate Staging/Production Keys Locally**:
   ```bash
   # staging
   npm run deploy:staging-keys

   # production
   npm run deploy:production-keys
   ```

2. **Copy Variables from Generated File**:
   - Open `railway-staging.env` or `railway-production.env`
   - Copy each variable to Railway Dashboard

3. **Add Variables One by One**:
   - Click **"Add Variable"**
   - Enter **Name** (e.g., `NODE_ENV`)
   - Enter **Value** (e.g., `production`)
   - Click **"Add"**

### **Option B: Using Railway CLI** (Advanced)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set variables from file
railway variables set NODE_ENV=production
railway variables set APP_KEYS="your-app-keys"
# ... continue for all variables
```

---

## ✅ **Verification Checklist**

Before deploying, ensure these variables are set in Railway:

### 🔐 **Security (Required)**
- [ ] `NODE_ENV=production`
- [ ] `APP_KEYS` (4 comma-separated keys)
- [ ] `API_TOKEN_SALT`
- [ ] `ADMIN_JWT_SECRET`
- [ ] `TRANSFER_TOKEN_SALT`
- [ ] `JWT_SECRET`

### 🗄️ **Database (Auto-configured)**
- [ ] PostgreSQL service added to project
- [ ] `DATABASE_URL` appears automatically

### 📊 **Application (Recommended)**
- [ ] `STRAPI_TELEMETRY_DISABLED=true`
- [ ] `STRAPI_DISABLE_UPDATE_NOTIFICATION=true`

### 🔤 **Integrations (Optional)**
- [ ] `DEEPL_API_KEY` (if using translation)
- [ ] `CORS_ORIGINS` (if frontend needs specific domains)

---

## 🚨 **Common Variable Issues & Solutions**

### ❌ **"APP_KEYS is required" Error**

**Problem**: APP_KEYS missing or malformed

**Solution**:
```bash
# Generate new keys
npm run deploy:production-keys

# Copy the APP_KEYS line exactly (including all commas)
APP_KEYS=key1,key2,key3,key4
```

### ❌ **"Database connection failed" Error**

**Problem**: DATABASE_URL not available

**Solution**:
1. Ensure PostgreSQL service is added to Railway project
2. Check that DATABASE_URL appears in Variables tab
3. If missing, remove and re-add PostgreSQL service

### ❌ **"Build failed" Error**

**Problem**: Variables not available during build

**Solution**:
1. Set `NODE_ENV=production` first
2. Add all security variables before triggering build
3. Use our custom build script that handles missing variables

---

## 🔄 **Variable Update Process**

### **For Existing Deployments**:

1. **Update variables** in Railway Dashboard
2. **Trigger redeploy**:
   - Go to **Deployments** tab
   - Click **"Deploy Latest Commit"**
   - Or push new commit to trigger auto-deploy

### **For New Variables**:

1. **Add variable** in Railway Dashboard
2. **Application automatically restarts** with new variables
3. **Verify with health check**: `https://your-app.railway.app/api/health`

---

## 📱 **Quick Copy-Paste Template**

Use this template in Railway Dashboard Variables:

```bash
# Copy these one by one to Railway Variables tab:

NODE_ENV=production
STRAPI_TELEMETRY_DISABLED=true
STRAPI_DISABLE_UPDATE_NOTIFICATION=true

# Generate these with: npm run deploy:production-keys
APP_KEYS=your-generated-keys-here
API_TOKEN_SALT=your-generated-salt-here
ADMIN_JWT_SECRET=your-generated-jwt-here
TRANSFER_TOKEN_SALT=your-generated-transfer-salt-here
JWT_SECRET=your-generated-jwt-secret-here

# Optional - DeepL Translation
DEEPL_API_KEY=9f331073-436a-407d-b9d8-d4076fc4415c:fx
DEEPL_API_URL=https://api.deepl.com/v2

# Optional - CORS (update with your frontend domain)
CORS_ORIGINS=https://your-frontend.vercel.app,https://localhost:3000

# Optional - Admin Configuration
ADMIN_PATH=/admin
SERVE_ADMIN=true
```

---

## 🎯 **Next Steps After Variable Setup**

1. **Trigger Deployment**:
   ```bash
   git push origin main
   ```

2. **Monitor Build Logs** in Railway Dashboard

3. **Verify Deployment**:
   ```bash
   npm run deploy:verify https://your-app.railway.app
   ```

4. **Test Application**:
   - Health: `https://your-app.railway.app/api/health`
   - Admin: `https://your-app.railway.app/admin`
   - Quiz: `https://your-app.railway.app/api/quiz/health`

---

**⚡ Remember: Set variables BEFORE deploying to avoid build failures!**
