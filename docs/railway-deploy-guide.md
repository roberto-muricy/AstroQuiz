# 🚂 Railway Deployment Guide

## 📋 Overview

This guide walks you through deploying the AstroQuiz CMS to Railway with PostgreSQL database and proper environment configuration.

---

## 🚀 Quick Deploy Steps

### 1. **Repository Cleanup**
First, clean up the repository and remove sensitive files:

```bash
# Make the cleanup script executable
chmod +x scripts/git-cleanup.sh

# Run the cleanup script
./scripts/git-cleanup.sh

# Push clean repository to GitHub
git push origin main
```

### 2. **Railway Setup**
1. **Create Railway Account**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Link your GitHub account
3. **Create New Project**: Select "Deploy from GitHub repo"
4. **Select Repository**: Choose your AstroQuiz repository

### 3. **Database Setup**
```bash
# In Railway dashboard:
# 1. Click "New" → "Database" → "PostgreSQL"
# 2. Railway will automatically provide DATABASE_URL
# 3. No additional configuration needed
```

### 4. **Environment Variables**
Set these in Railway dashboard under "Variables":

```bash
# 🔐 Security Keys (Generate with: npm run generate-keys)
# Copy the generated keys from your local development setup
APP_KEYS=your-4-comma-separated-keys-here
API_TOKEN_SALT=your-generated-salt-here
ADMIN_JWT_SECRET=your-generated-jwt-here
TRANSFER_TOKEN_SALT=your-generated-transfer-salt-here
JWT_SECRET=your-generated-jwt-secret-here

# 🌍 Application
NODE_ENV=production
ADMIN_PATH=/admin

# 🔤 Translation (Optional)
DEEPL_API_KEY=9f331073-436a-407d-b9d8-d4076fc4415c:fx
DEEPL_API_URL=https://api.deepl.com/v2

# 📊 Analytics
STRAPI_TELEMETRY_DISABLED=true

# 🗄️ Database (Automatically provided by Railway PostgreSQL)
# DATABASE_URL=postgresql://... (Railway provides this automatically)
```

### 5. **Deploy**
Railway will automatically deploy when you push to main branch.

---

## 🔐 Security Key Generation

Generate secure keys for production:

```bash
# Generate APP_KEYS (4 keys)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Combine them: key1,key2,key3,key4

# Generate other secrets
node -e "console.log('API_TOKEN_SALT=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ADMIN_JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('TRANSFER_TOKEN_SALT=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔧 Railway Configuration Files

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/quiz/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Build & Start Scripts
```json
{
  "scripts": {
    "build": "strapi build",
    "start": "strapi start",
    "railway:build": "npm run build",
    "railway:start": "npm run start"
  }
}
```

---

## 🗄️ Database Migration

### Automatic Migration
Railway will automatically run migrations on first deploy.

### Manual Migration (if needed)
```bash
# Connect to Railway project
railway login
railway link [project-id]

# Run migrations
railway run npm run strapi -- migrate
```

---

## 🧪 Deployment Verification

### Automated Testing
```bash
# After deployment, test your app
node scripts/verify-deploy.js
```

### Manual Testing
1. **Health Check**: `https://your-app.railway.app/api/quiz/health`
2. **Admin Panel**: `https://your-app.railway.app/admin`
3. **API Endpoints**: `https://your-app.railway.app/api/questions`

---

## 📊 Monitoring & Logs

### Railway Dashboard
- **Logs**: View real-time application logs
- **Metrics**: Monitor CPU, memory, and network usage
- **Deployments**: Track deployment history

### Health Check Endpoint
```bash
curl https://your-app.railway.app/api/quiz/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "session": true,
      "scoring": true,
      "selector": true
    }
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### **Build Failures**
```bash
# Check build logs in Railway dashboard
# Common causes:
# - Missing environment variables
# - Node.js version mismatch
# - Missing dependencies
```

#### **Database Connection Issues**
```bash
# Verify DATABASE_URL is set
# Check PostgreSQL service is running
# Ensure pg dependencies are installed
```

#### **Environment Variable Issues**
```bash
# Verify all required variables are set:
# - APP_KEYS
# - API_TOKEN_SALT
# - ADMIN_JWT_SECRET
# - JWT_SECRET
# - DATABASE_URL (auto-provided)
```

### Debug Commands
```bash
# Check environment
railway run env

# Check database connection
railway run npm run strapi -- console

# View logs
railway logs
```

---

## 🚀 Production Optimization

### Performance Settings
```javascript
// config/env/production/server.js
module.exports = {
  // Enable compression
  middlewares: [
    'strapi::compression',
    // ... other middlewares
  ],
  
  // Connection pooling
  pool: {
    min: 2,
    max: 10
  }
};
```

### Security Headers
```javascript
// Automatic via production config
// - CORS properly configured
// - Security headers enabled
// - SSL/TLS enforced
```

### Caching Strategy
```javascript
// Enable caching in production
cache: {
  enabled: true,
  models: ['question'],
  ttl: 3600000 // 1 hour
}
```

---

## 📈 Scaling

### Horizontal Scaling
```bash
# Railway Pro plans support:
# - Multiple instances
# - Load balancing
# - Auto-scaling
```

### Database Scaling
```bash
# PostgreSQL scales automatically
# Monitor usage in Railway dashboard
# Upgrade plan if needed
```

---

## 🔄 CI/CD Pipeline

### Automatic Deployment
```yaml
# Railway automatically deploys on:
# - Push to main branch
# - Pull request merge
# - Manual trigger
```

### Custom Deploy Hooks
```json
{
  "scripts": {
    "postdeploy": "node scripts/verify-deploy.js"
  }
}
```

---

## 📞 Support

### Railway Support
- **Docs**: [docs.railway.app](https://docs.railway.app)
- **Discord**: Railway Community
- **Status**: [status.railway.app](https://status.railway.app)

### AstroQuiz Support
- **Issues**: GitHub repository issues
- **Documentation**: `/docs` folder
- **Health Check**: `/api/quiz/health`

---

## ✅ Deployment Checklist

- [ ] Repository cleaned of sensitive files
- [ ] PostgreSQL database created in Railway
- [ ] Environment variables configured
- [ ] Security keys generated
- [ ] Domain configured (optional)
- [ ] Health check passing
- [ ] Admin panel accessible
- [ ] API endpoints working
- [ ] Quiz Engine functional
- [ ] DeepL integration configured (optional)

🎉 **Your AstroQuiz CMS is now live on Railway!**
