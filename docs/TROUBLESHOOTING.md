# 🆘 AstroQuiz Railway Deployment - Troubleshooting Guide

Common issues and solutions for Railway deployment problems.

---

## 🚨 **Build & Deployment Issues**

### ❌ **Build Fails: "npm ERR! Missing script: build"**

**Problem**: Railway can't find the build script.

**Solution**:
```bash
# Check package.json has build script
"scripts": {
  "build": "strapi build"
}

# If missing, add it and push:
git add package.json
git commit -m "Add build script"
git push origin main
```

### ❌ **Build Fails: "Module not found"**

**Problem**: Missing dependencies in production.

**Solution**:
```bash
# Ensure all dependencies are in package.json (not devDependencies)
npm install --save missing-package

# Check for missing production dependencies:
npm ls --production

# Push updated package.json:
git add package.json package-lock.json
git commit -m "Fix production dependencies"
git push origin main
```

### ❌ **Deployment Timeout**

**Problem**: Build or startup takes too long.

**Solution**:
1. **Check Railway logs** for specific error
2. **Optimize build process**:
   ```json
   // package.json
   "scripts": {
     "build": "strapi build --no-optimization"
   }
   ```
3. **Increase timeout in railway.json**:
   ```json
   {
     "deploy": {
       "healthcheckTimeout": 600
     }
   }
   ```

---

## 🗄️ **Database Connection Issues**

### ❌ **"Database connection failed"**

**Problem**: Can't connect to PostgreSQL database.

**Solution**:

1. **Verify DATABASE_URL exists**:
   - Railway Dashboard → Variables
   - Should see `DATABASE_URL=postgresql://...`

2. **Check database service status**:
   - Railway Dashboard → PostgreSQL service
   - Should show "Active" status

3. **Test connection locally**:
   ```bash
   # Use Railway's DATABASE_URL locally
   export DATABASE_URL="postgresql://..."
   npm run develop
   ```

4. **Check database configuration**:
   ```javascript
   // config/env/production/database.js
   const { parse } = require('pg-connection-string');
   
   module.exports = ({ env }) => {
     const config = parse(env('DATABASE_URL'));
     // Verify config is correct
   };
   ```

### ❌ **"SSL connection required"**

**Problem**: PostgreSQL requires SSL but not configured.

**Solution**:
```javascript
// config/env/production/database.js
connection: {
  ssl: {
    rejectUnauthorized: false // Railway requires this
  }
}
```

### ❌ **"Too many connections"**

**Problem**: Database connection pool exhausted.

**Solution**:
```javascript
// config/env/production/database.js
pool: {
  min: 2,
  max: 5, // Reduce from 10
  acquireTimeoutMillis: 60000
}
```

---

## 🔑 **Environment Variables Issues**

### ❌ **"APP_KEYS is required"**

**Problem**: Missing or invalid APP_KEYS.

**Solution**:
```bash
# Generate new production keys
npm run deploy:production-keys

# Copy APP_KEYS to Railway Variables:
# Railway Dashboard → Variables → Add Variable
# Name: APP_KEYS
# Value: key1,key2,key3,key4
```

### ❌ **"Invalid JWT secret"**

**Problem**: JWT secrets are missing or malformed.

**Solution**:
1. **Regenerate all security keys**:
   ```bash
   npm run deploy:production-keys
   ```

2. **Set in Railway Variables**:
   - `ADMIN_JWT_SECRET`
   - `JWT_SECRET`
   - `API_TOKEN_SALT`
   - `TRANSFER_TOKEN_SALT`

3. **Ensure no spaces or special characters** in variable values

### ❌ **"NODE_ENV not set"**

**Problem**: Application running in wrong environment.

**Solution**:
```bash
# Set in Railway Variables:
NODE_ENV=production
```

---

## 🏥 **Health Check Failures**

### ❌ **Health check timeout**

**Problem**: `/api/health` endpoint not responding.

**Solution**:

1. **Check if server is starting**:
   ```bash
   # Railway logs should show:
   # "Server running on port 8080"
   ```

2. **Verify health endpoint**:
   ```javascript
   // src/api/health/routes/health.js
   {
     method: 'GET',
     path: '/health', // Should be /health not /api/health
     handler: 'health.index'
   }
   ```

3. **Test locally**:
   ```bash
   curl http://localhost:1337/api/health
   ```

4. **Increase timeout in railway.json**:
   ```json
   {
     "deploy": {
       "healthcheckTimeout": 300
     }
   }
   ```

### ❌ **Health check returns 503**

**Problem**: Application is unhealthy.

**Solution**:

1. **Check health endpoint response**:
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Common causes**:
   - Database connection failed
   - Quiz Engine services not loaded
   - Missing environment variables

3. **Check detailed health**:
   ```bash
   curl https://your-app.railway.app/api/health/detailed
   ```

---

## 🎮 **Quiz Engine Issues**

### ❌ **"Quiz services not available"**

**Problem**: Quiz Engine services not loading.

**Solution**:

1. **Check service files exist**:
   ```
   src/api/quiz-engine/services/scoring.js
   src/api/quiz-engine/services/selector.js
   src/api/quiz-engine/services/session.js
   ```

2. **Verify service registration**:
   ```javascript
   // Each service should export factory function
   module.exports = ({ strapi }) => ({
     // service methods
   });
   ```

3. **Check Strapi logs** for service loading errors

### ❌ **"No questions found"**

**Problem**: Question pool is empty.

**Solution**:

1. **Check questions exist**:
   ```bash
   curl "https://your-app.railway.app/api/questions?pagination[limit]=5"
   ```

2. **Import questions if needed**:
   - Use admin panel to import
   - Or run import script on production data

3. **Check localization**:
   ```bash
   curl "https://your-app.railway.app/api/questions?filters[locale][$eq]=en"
   ```

---

## 🌐 **CORS & Frontend Issues**

### ❌ **CORS errors in browser**

**Problem**: Frontend can't access API due to CORS.

**Solution**:

1. **Set CORS_ORIGINS variable**:
   ```bash
   # Railway Variables
   CORS_ORIGINS=https://your-frontend.vercel.app,https://localhost:3000
   ```

2. **Check server configuration**:
   ```javascript
   // config/env/production/server.js
   cors: {
     origin: env.array('CORS_ORIGINS', ['*'])
   }
   ```

3. **Test CORS**:
   ```bash
   curl -H "Origin: https://your-frontend.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS https://your-app.railway.app/api/health
   ```

### ❌ **Admin panel not loading**

**Problem**: Admin interface shows errors.

**Solution**:

1. **Check admin URL**:
   ```bash
   # Should work:
   https://your-app.railway.app/admin
   ```

2. **Verify admin configuration**:
   ```javascript
   // config/env/production/server.js
   admin: {
     url: '/admin',
     serveAdminPanel: true
   }
   ```

3. **Check build completed**:
   - Railway logs should show successful build
   - Admin panel files should be generated

---

## 🔤 **DeepL Integration Issues**

### ❌ **"DeepL translation failed"**

**Problem**: Translation API not working.

**Solution**:

1. **Check API key is set**:
   ```bash
   # Railway Variables
   DEEPL_API_KEY=your-deepl-key-here
   DEEPL_API_URL=https://api.deepl.com/v2
   ```

2. **Test DeepL endpoint**:
   ```bash
   curl -X POST https://your-app.railway.app/api/deepl/translate \
        -H "Content-Type: application/json" \
        -d '{"text":"Hello","targetLang":"PT"}'
   ```

3. **Check quota limits**:
   - DeepL Free: 500,000 chars/month
   - DeepL Pro: Based on plan

---

## 📊 **Performance Issues**

### ❌ **Slow response times**

**Problem**: API responses are slow (>5 seconds).

**Solution**:

1. **Check database performance**:
   ```javascript
   // Add database indices for common queries
   // Check slow query logs
   ```

2. **Optimize queries**:
   ```javascript
   // Use pagination
   // Limit populated relations
   // Add database indices
   ```

3. **Monitor Railway metrics**:
   - CPU usage
   - Memory usage
   - Network latency

### ❌ **Memory issues**

**Problem**: Application crashes due to memory.

**Solution**:

1. **Check memory usage**:
   ```bash
   curl https://your-app.railway.app/api/health/detailed
   # Check memory statistics
   ```

2. **Optimize memory usage**:
   ```javascript
   // Reduce database connection pool
   pool: { min: 1, max: 3 }
   
   // Disable unnecessary features
   cron: { enabled: false }
   ```

3. **Consider Railway plan upgrade** if needed

---

## 🔧 **General Debugging Steps**

### 1. **Check Railway Logs**

```bash
# In Railway Dashboard:
# 1. Go to your project
# 2. Click on service
# 3. Go to "Logs" tab
# 4. Look for error messages
```

### 2. **Test Locally First**

```bash
# Always test locally before deploying
npm run develop
npm run test:all
npm run health
```

### 3. **Use Verification Script**

```bash
# Test deployed application
npm run deploy:verify https://your-app.railway.app
```

### 4. **Check Environment Variables**

```bash
# Railway Dashboard → Variables
# Ensure all required variables are set
# No extra spaces or special characters
```

### 5. **Database Connection Test**

```bash
# Test database connection
curl https://your-app.railway.app/api/health
# Should show database: "connected"
```

---

## 🆘 **Getting Help**

### 📞 **Support Channels**

1. **Railway Discord**: https://discord.gg/railway
2. **Railway Documentation**: https://docs.railway.app
3. **Strapi Discord**: https://discord.strapi.io
4. **GitHub Issues**: Create issue in your repository

### 📋 **When Asking for Help**

Include:
1. **Error message** (exact text)
2. **Railway deployment logs**
3. **Steps to reproduce**
4. **Environment variables** (without values)
5. **URL of deployed app**

### 🔍 **Useful Commands**

```bash
# Generate deployment report
npm run deploy:verify https://your-app.railway.app

# Check local health
npm run health

# Generate production keys
npm run deploy:production-keys

# Run all tests
npm run test:all
```

---

**Most issues are related to environment variables or database connection. Start with those! 🔑**
