# 🚀 Deploy do Painel Admin - Vercel

## 📋 Pré-requisitos

1. **Conta GitHub** com o projeto
2. **Conta Vercel** (gratuita)

## 🔗 Conectar com GitHub

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione o repositório `AstroQuiz`

## ⚙️ Configurações do Projeto

### Framework Preset
- **Framework:** Create React App

### Build Settings
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Install Command:** `npm install`

### Environment Variables
```
REACT_APP_FIREBASE_API_KEY=AIzaSyCGHqsDfZklIGfSFVQCAFTuaqA8dJRE9Tw
REACT_APP_FIREBASE_AUTH_DOMAIN=astroquiz-3a316.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=astroquiz-3a316
REACT_APP_FIREBASE_STORAGE_BUCKET=astroquiz-3a316.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=473888146350
REACT_APP_FIREBASE_APP_ID=1:473888146350:web:5381e61b07b74abe0dfe3f
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WNNXRM88XS
```

## 🚀 Deploy

1. Clique em "Deploy"
2. Aguarde o build (2-3 minutos)
3. Acesse a URL gerada

## 🔄 Deploy Automático

- **Push para `main`:** Deploy automático
- **Pull Request:** Preview automático
- **Branch personalizada:** Deploy manual

## 🌐 URLs

- **Produção:** https://astroquiz-admin.vercel.app
- **Preview:** https://astroquiz-admin-git-feature.vercel.app

## 📝 Configuração Avançada

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🎯 Vantagens do Vercel

- **🚀 Deploy instantâneo**
- **🌍 CDN global**
- **📊 Analytics integrado**
- **🔒 HTTPS automático**
- **📱 PWA ready**
- **🔄 Preview automático**

## 🔧 Comandos Úteis

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy manual
vercel

# Deploy para produção
vercel --prod

# Listar projetos
vercel ls
```
