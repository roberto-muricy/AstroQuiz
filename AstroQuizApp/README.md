# 🚀 AstroQuiz Mobile App

<p align="center">
  <img src="./src/assets/images/target.png" alt="AstroQuiz" width="120"/>
</p>

<p align="center">
  <strong>Quiz interativo de astronomia com design baseado no Figma</strong>
</p>

---

## 📱 Sobre o Projeto

O **AstroQuiz** é um aplicativo mobile educativo de quiz de astronomia, desenvolvido em **React Native** com **TypeScript**, que consome a API do backend Strapi.

### ✨ Características

- 🎯 **Sistema de Quiz Adaptativo**: Dificuldade ajustada dinamicamente
- 🔥 **Sistema de Streaks**: Bônus por respostas consecutivas corretas
- 📊 **Estatísticas Detalhadas**: Acompanhe seu progresso
- 🌍 **Multi-idioma (i18n)**: Suporte para PT, EN, ES, FR
- 🎨 **Design Moderno**: Baseado no design system do Figma
- 🏆 **Sistema de Níveis**: Progresso gamificado

---

## 🏗️ Arquitetura

```
AstroQuizApp/
├── src/
│   ├── assets/          # Imagens e ícones do Figma
│   ├── components/      # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── QuestionCard.tsx
│   │   └── LevelCard.tsx
│   ├── contexts/        # Context API (Global State)
│   │   └── AppContext.tsx
│   ├── navigation/      # Navegação (React Navigation)
│   │   ├── RootNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── screens/         # Telas principais
│   │   ├── HomeScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/        # API e serviços
│   │   ├── api.ts       # Axios instance
│   │   └── quizService.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── theme/           # Design tokens
│   │   └── index.ts
│   └── App.tsx          # Entry point
├── android/             # Projeto Android
├── ios/                 # Projeto iOS
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Node.js**: >= 18
- **npm** ou **yarn**
- **React Native CLI**: `npm install -g react-native-cli`
- **Android Studio** (para Android)
- **Xcode** (para iOS - apenas macOS)
- **Backend Strapi rodando** em `http://localhost:1337`

### 📦 Instalação

```bash
# 1. Clone o repositório
cd AstroQuizApp

# 2. Instale as dependências
npm install

# 3. Configure o .env (crie o arquivo)
echo "API_BASE_URL=http://localhost:1337/api" > .env

# 4. (iOS) Instale os pods
cd ios && pod install && cd ..

# 5. Link os assets
npx react-native-asset
```

### ▶️ Executar

```bash
# Android
npm run android

# iOS (apenas macOS)
npm run ios

# Iniciar Metro Bundler separadamente
npm start
```

### 🔧 Scripts Úteis

```bash
# Limpar cache Android
npm run clean

# Limpar cache iOS
npm run clean-ios

# Resetar completamente
npm run reset

# Lint
npm run lint

# Testes
npm test
```

---

## 🎨 Design System

### Cores Principais

```typescript
colors: {
  // Primárias
  purple: '#5E4A8B',
  purpleLight: '#7B6BA8',
  orange: '#FFA726',
  red: '#DE2F24',
  
  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  
  // Neutras
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  
  // Background
  darkPurple: '#2C1B47',
  background: 'linear-gradient(180deg, #2C1B47 0%, #1A0F2E 100%)',
}
```

### Componentes Disponíveis

- **Button**: Botão com variantes (primary, secondary, ghost, purple, danger)
- **Card**: Card com gradientes customizados
- **ProgressBar**: Barra de progresso animada
- **QuestionCard**: Card de pergunta com opções
- **LevelCard**: Card de nível com progresso

---

## 🔌 Integração com API

### Configuração

O arquivo `src/services/api.ts` configura o Axios:

```typescript
const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:1337/api',
  timeout: 10000,
});
```

### Serviços Disponíveis

- **quizService**: Gerencia sessões de quiz
  - `startQuiz()`: Inicia nova sessão
  - `getCurrentQuestion()`: Pega próxima questão
  - `submitAnswer()`: Envia resposta
  - `getGameRules()`: Busca regras do jogo

---

## 📂 Assets Utilizados

Os assets foram copiados do **design Figma** em:

- **Imagens**: `src/assets/images/`
  - `home.png`, `quiz.png`, `stats.png`, `profile.png`
  - `target.png`, `play.png`, `achievements.png`
  
- **Ícones**: `src/assets/icons/`
  - SVGs do tab bar e telas

### Como Adicionar Novos Assets

1. Coloque os arquivos em `src/assets/images/` ou `src/assets/icons/`
2. Adicione no `src/assets/index.ts`:
   ```typescript
   export const Images = {
     novoAsset: require('./images/novo-asset.png'),
   };
   ```
3. Rode `npx react-native-asset` para linkar

---

## 🧪 Testes

```bash
# Rodar testes
npm test

# Testes com coverage
npm test -- --coverage

# Testes em watch mode
npm test -- --watch
```

---

## 📱 Telas Implementadas

### 1️⃣ Home Screen
- Header com nome do usuário e nível
- Card de Desafio Diário (com imagem do target)
- Card de progresso de nível
- Lista de fases/níveis disponíveis

### 2️⃣ Quiz Screen
- Timer dinâmico
- QuestionCard com 4 opções
- Sistema de feedback visual
- Score e streak em tempo real

### 3️⃣ Stats Screen
- Estatísticas gerais (acertos, média, etc)
- Gráfico de progresso por tópico
- Histórico de sessões

### 4️⃣ Profile Screen
- Informações do usuário
- Configurações de idioma
- Histórico de conquistas
- Botão de logout

---

## 🌍 Internacionalização (i18n)

O app está preparado para multi-idioma:

```typescript
const { locale, setLocale } = useApp();

// Trocar idioma
setLocale('pt-BR'); // ou 'en', 'es', 'fr'
```

---

## 🔐 Autenticação

Por enquanto, o app usa **autenticação simplificada**. Para integrar com Strapi Auth:

1. Configure JWT no backend Strapi
2. Atualize `src/services/api.ts` para incluir token:
   ```typescript
   api.interceptors.request.use((config) => {
     const token = await AsyncStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```

---

## 🐛 Troubleshooting

### Erro: "Command not found: react-native"

```bash
npm install -g react-native-cli
```

### Erro: "Unable to resolve module"

```bash
npm run reset
```

### Android: "SDK location not found"

Crie `android/local.properties`:
```
sdk.dir=/Users/SEU_USUARIO/Library/Android/sdk
```

### iOS: "Pod install failed"

```bash
cd ios
pod deintegrate
pod install
cd ..
```

---

## 📝 TODO

- [ ] Implementar autenticação completa
- [ ] Adicionar testes E2E (Detox)
- [ ] Adicionar animações Lottie
- [ ] Implementar push notifications
- [ ] Modo offline com cache
- [ ] Adicionar som/música
- [ ] Dark mode toggle

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'Add nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é propriedade privada. Todos os direitos reservados.

---

## 🔗 Links Úteis

- **Backend Strapi**: `../AstroQuiz/`
- **Documentação API**: `../AstroQuiz/docs/api-documentation.md`
- **Design Figma**: Solicite acesso ao time de design

---

## 👥 Time

Desenvolvido com ❤️ para o projeto AstroQuiz

---

**Última atualização**: Outubro 2025
