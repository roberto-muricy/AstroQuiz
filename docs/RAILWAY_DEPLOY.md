# 🚂 Railway Deployment Guide - AstroQuiz

Complete step-by-step guide for deploying AstroQuiz to Railway with PostgreSQL.

---

## 📋 **Prerequisites Checklist**

Before starting, ensure you have:

- [x] **GitHub Repository**: Code pushed to GitHub main branch
- [x] **Railway Account**: Free account with $5 trial credit  
- [x] **Local Environment**: Working locally with `npm run develop`
- [x] **Production Keys**: Generated with `npm run deploy:production-keys`
- [x] **Tests Passing**: All tests pass with `npm run test:all`

---

## 🚀 **Step 1: Create Railway Project**

### 1.1 Connect GitHub Repository

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository**: `roberto-muricy/AstroQuiz` (or your fork)
5. **Select branch**: `main`
6. **Railway auto-detects**: Node.js project ✅

### 1.2 Initial Deployment (Will Fail - Expected)

- Railway starts building automatically
- **Build will fail** - this is expected because environment variables are missing
- Don't worry, we'll fix this in the next steps

---

## 🗄️ **Step 2: Add PostgreSQL Database**

### 2.1 Add Database Service

1. **In your Railway project dashboard**
2. **Click "Add Service"** 
3. **Select "Database"**
4. **Choose "PostgreSQL"**
5. **Railway provisions database automatically** ⚡

### 2.2 Verify Database Connection

- Railway automatically creates `DATABASE_URL` environment variable
- You can see it in **Variables** tab
- Format: `postgresql://user:password@host:port/database`

---

## 🔑 **Step 3: Configure Environment Variables**

### 3.1 Generate Production Keys

Run locally to generate secure production keys:

```bash
npm run deploy:production-keys
```

This creates `railway-production.env` with all required variables.

### 3.2 Set Variables in Railway Dashboard

1. **Go to your project → Variables tab**
2. **Add each variable** from `railway-production.env`:

#### 🔐 **Security Variables (Required)**
```bash
APP_KEYS=your-4-comma-separated-keys-here
API_TOKEN_SALT=your-generated-salt-here
ADMIN_JWT_SECRET=your-generated-jwt-here
TRANSFER_TOKEN_SALT=your-generated-transfer-salt-here
JWT_SECRET=your-generated-jwt-secret-here
```

#### 🌍 **Application Variables**
```bash
NODE_ENV=production
ADMIN_PATH=/admin
STRAPI_TELEMETRY_DISABLED=true
```

#### 🔤 **DeepL Translation (Optional)**
```bash
DEEPL_API_KEY=9f331073-436a-407d-b9d8-d4076fc4415c:fx
DEEPL_API_URL=https://api.deepl.com/v2
```

#### 🌐 **CORS Configuration (Optional)**
```bash
CORS_ORIGINS=https://your-frontend-domain.com,https://localhost:3000
```

### 3.3 Variables Automatically Provided by Railway

These are created automatically - **don't add them manually**:

- `DATABASE_URL` - PostgreSQL connection string
- `RAILWAY_STATIC_URL` - Your app's domain
- `PORT` - Server port (usually 8080)

---

## 🚀 **Step 4: Deploy Application**

### 4.1 Trigger Deployment

1. **Push to GitHub** (if you made any changes):
   ```bash
   git add .
   git commit -m "Railway deploy configuration"
   git push origin main
   ```

2. **Or manually redeploy in Railway**:
   - Go to **Deployments** tab
   - Click **"Deploy Latest Commit"**

### 4.2 Monitor Deployment

1. **Watch build logs** in Railway dashboard
2. **Build process**:
   ```
   ✅ Installing dependencies (npm install)
   ✅ Building application (npm run build)  
   ✅ Starting server (npm run start)
   ✅ Health check passed (/api/health)
   ```

3. **Deployment typically takes 2-5 minutes**

---

## ✅ **Step 5: Verify Deployment**

### 5.1 Get Your App URL

Railway provides a URL like: `https://astroquiz-production-xxxx.railway.app`

### 5.2 Manual Verification

Test these endpoints in your browser:

1. **Health Check**: `https://your-app.railway.app/api/health`
   - Should return: `{"success": true, "data": {"status": "healthy", ...}}`

2. **Admin Panel**: `https://your-app.railway.app/admin`
   - Should load Strapi admin login

3. **Quiz API**: `https://your-app.railway.app/api/quiz/health`
   - Should return quiz engine status

4. **Questions API**: `https://your-app.railway.app/api/questions?pagination[limit]=5`
   - Should return sample questions

### 5.3 Automated Verification

Run the verification script locally:

```bash
npm run deploy:verify https://your-app.railway.app
```

This runs comprehensive tests and generates a report.

---

## 🔧 **Step 6: Post-Deployment Configuration**

### 6.1 Create Admin User

1. **Go to**: `https://your-app.railway.app/admin`
2. **Create your first admin user**
3. **Set strong password**
4. **Complete setup wizard**

### 6.2 Test Data Import (Optional)

If you need to import questions in production:

1. **SSH into Railway** (if available) or use admin panel
2. **Import via admin interface** or API calls
3. **Verify data** with API endpoints

### 6.3 Configure Custom Domain (Optional)

1. **In Railway project → Settings**
2. **Add custom domain**
3. **Update CORS_ORIGINS** environment variable
4. **Update frontend configuration**

---

## 📊 **Step 7: Performance & Monitoring**

### 7.1 Monitor Application Health

- **Railway Metrics**: CPU, Memory, Network usage
- **Application Logs**: Check for errors
- **Health Endpoint**: Monitor `/api/health`

### 7.2 Database Monitoring

- **Connection Pool**: Monitor active connections
- **Query Performance**: Check slow queries
- **Storage Usage**: Monitor database size

### 7.3 Set Up Alerts (Optional)

1. **Railway Webhooks**: For deployment notifications
2. **External Monitoring**: Uptime monitoring services
3. **Error Tracking**: Sentry or similar services

---

## 🔄 **Step 8: Continuous Deployment**

### 8.1 Automatic Deployments

Railway automatically deploys when you push to `main` branch:

```bash
git add .
git commit -m "Feature: Add new quiz functionality"
git push origin main
# → Railway automatically builds and deploys
```

### 8.2 Deployment Rollbacks

If deployment fails:

1. **Check deployment logs** in Railway
2. **Fix issues locally**
3. **Push fixes** to GitHub
4. **Or rollback** to previous deployment in Railway

---

## 🎯 **Step 9: Frontend Integration**

### 9.1 Update Frontend Configuration

Update your frontend to use production API:

```javascript
// Frontend config
const API_BASE_URL = 'https://your-app.railway.app/api';

// Test connection
fetch(`${API_BASE_URL}/health`)
  .then(response => response.json())
  .then(data => console.log('API connected:', data));
```

### 9.2 CORS Configuration

If you have CORS issues, update the `CORS_ORIGINS` environment variable:

```bash
CORS_ORIGINS=https://your-frontend.vercel.app,https://localhost:3000
```

---

## 🎉 **Deployment Complete!**

Your AstroQuiz is now live on Railway! 🚀

### 📍 **Important URLs**

- **Application**: `https://your-app.railway.app`
- **Admin Panel**: `https://your-app.railway.app/admin`  
- **Health Check**: `https://your-app.railway.app/api/health`
- **API Documentation**: Available in your repository

### 🔄 **Next Steps**

1. **Share your app URL** with team/users
2. **Set up frontend** to use production API
3. **Monitor performance** and usage
4. **Plan scaling** if needed

---

## 🆘 **Need Help?**

- **Railway Documentation**: https://docs.railway.app
- **Strapi Documentation**: https://docs.strapi.io
- **Troubleshooting Guide**: `docs/TROUBLESHOOTING.md`
- **Verification Script**: `npm run deploy:verify <URL>`

**Your AstroQuiz CMS is now production-ready! 🎮✨**
