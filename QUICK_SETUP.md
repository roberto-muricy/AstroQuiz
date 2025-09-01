# ⚡ AstroQuiz - Quick Setup Guide

## 🚀 **Local Development Setup**

### 1. **Clone & Install**
```bash
git clone https://github.com/your-username/AstroQuiz.git
cd AstroQuiz/quiz-cms
npm install
```

### 2. **Generate Environment Variables**
```bash
npm run generate-keys
```
This creates a `.env` file with secure keys automatically.

### 3. **Start Development Server**
```bash
npm run develop
```

### 4. **Access Application**
- **Admin Panel**: http://localhost:1337/admin
- **API Health**: http://localhost:1337/api/health
- **Quiz Engine**: http://localhost:1337/api/quiz/health

---

## 🚂 **Railway Deployment**

### 1. **Push to GitHub**
```bash
git push origin main
```

### 2. **Deploy to Railway**
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add PostgreSQL database
4. Copy environment variables from local `.env`

### 3. **Environment Variables for Railway**
Copy these from your local `.env` file to Railway dashboard:

```bash
NODE_ENV=production
APP_KEYS=your-generated-keys
API_TOKEN_SALT=your-generated-salt
ADMIN_JWT_SECRET=your-generated-jwt
TRANSFER_TOKEN_SALT=your-generated-salt
JWT_SECRET=your-generated-jwt
DEEPL_API_KEY=9f331073-436a-407d-b9d8-d4076fc4415c:fx
STRAPI_TELEMETRY_DISABLED=true
```

### 4. **Verify Deployment**
```bash
curl https://your-app.railway.app/api/health
```

---

## 🧪 **Testing**

```bash
# Run all tests
npm run test:all

# Test specific components
npm run test:api          # API tests
npm run test:quiz         # Quiz Engine tests
npm run test:performance  # Performance tests
```

---

## 📚 **Available Scripts**

```bash
npm run develop          # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run generate-keys   # Generate secure environment keys
npm run test:all        # Run all tests
npm run health          # Check application health
```

---

## 🎮 **Quiz Engine Features**

✅ **50 Progressive Phases**  
✅ **Intelligent Question Selection**  
✅ **Advanced Scoring System**  
✅ **Real-time Session Management**  
✅ **Multilingual Support** (EN, PT, ES, FR)  
✅ **Comprehensive APIs**  
✅ **Performance Optimized**  

---

## 📖 **Documentation**

- **API Documentation**: `docs/quiz-engine-api.md`
- **Railway Deploy Guide**: `docs/railway-deploy-guide.md`
- **Implementation Details**: `docs/quiz-engine-summary.md`

---

## 🔧 **Troubleshooting**

### **Environment Issues**
```bash
# Regenerate keys if needed
npm run generate-keys

# Check environment
cat .env
```

### **Database Issues**
```bash
# Check database connection
npm run health
```

### **Railway Deploy Issues**
1. Verify all environment variables are set
2. Check Railway logs for errors
3. Ensure PostgreSQL database is connected

---

## 🎯 **Next Steps**

1. ✅ **Local Development**: Complete
2. ✅ **Railway Deployment**: Ready
3. 🔄 **Frontend Integration**: Next phase
4. 🔄 **Mobile App**: Future development

**Your AstroQuiz CMS is ready! 🎉**
