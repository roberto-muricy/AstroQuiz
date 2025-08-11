# 🚀 Deploy do Painel Admin - Firebase Hosting

## 📋 Pré-requisitos

1. **Node.js** instalado
2. **Firebase CLI** instalado
3. **Conta Google** com projeto Firebase

## 🔧 Instalação do Firebase CLI

```bash
npm install -g firebase-tools
```

## 🔐 Login no Firebase

```bash
firebase login
```

## 🏗️ Inicializar Firebase no Projeto

```bash
cd AstroQuiz_Admin
firebase init hosting
```

### Configurações:
- **Public directory:** `build`
- **Single-page app:** `Yes`
- **Overwrite index.html:** `No`

## 📦 Build do Projeto

```bash
npm run build
```

## 🚀 Deploy

```bash
firebase deploy
```

## 🌐 URLs de Acesso

- **Produção:** https://astroquiz-3a316.web.app
- **Preview:** https://astroquiz-3a316.firebaseapp.com

## 🔄 Deploy Automático

Para deploy automático a cada push:

```bash
firebase init hosting:github
```

## 📝 Scripts Úteis

Adicione ao `package.json`:

```json
{
  "scripts": {
    "build": "react-scripts build",
    "deploy": "npm run build && firebase deploy",
    "deploy:preview": "npm run build && firebase hosting:channel:deploy preview"
  }
}
```

## 🔒 Configurações de Segurança

### firebase.json
```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

## 🎯 Próximos Passos

1. **Configurar domínio personalizado** (opcional)
2. **Configurar CI/CD** com GitHub Actions
3. **Configurar monitoramento** e analytics
