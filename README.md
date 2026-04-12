<div align="center">

# AstroQuiz

**Explore o universo, uma pergunta de cada vez.**

Quiz interativo de astronomia com 50 fases de dificuldade progressiva, sistema de pontuacao adaptativo e suporte a 4 idiomas.

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Strapi](https://img.shields.io/badge/Strapi-5.23-4945FF?logo=strapi&logoColor=white)](https://strapi.io/)
[![React Native](https://img.shields.io/badge/React_Native-0.73-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Sobre o Projeto

AstroQuiz e um app mobile de quiz de astronomia com backend headless CMS. O jogador avanca por 50 fases com dificuldade crescente, respondendo perguntas sobre o universo em ate 30 segundos cada. O sistema de pontuacao recompensa velocidade, sequencias de acertos e conhecimento avancado.

### Principais Features

- **50 fases progressivas** — de Iniciante (nivel 1) a Elite (nivel 5), com distribuicao inteligente de dificuldade
- **Sistema de pontuacao rico** — bonus de velocidade (ate 2x), streaks (+5 pts por acerto consecutivo), bonus de fase perfeita (1.5x)
- **Desafios especiais** — Time Attack, Perfect Only e Boss Battle nas fases Elite
- **4 idiomas** — Portugues, Ingles, Espanhol e Frances, com traducao automatica via DeepL
- **Perguntas com imagem** — suporte a questoes visuais com upload via Cloudinary
- **Modo convidado** — jogue sem precisar criar conta
- **Conquistas** — Perfeccionista, Speed Demon, Streak Master, Topic Expert e mais
- **Leaderboard semanal** — ranking por pontuacao, fases perfeitas, velocidade e sequencia

## Arquitetura

```
AstroQuiz/
├── src/                        # Backend (Strapi 5 + custom API)
│   ├── routes/                 #   Rotas: quiz, questions, user-profile, i18n
│   ├── services/               #   Logica: sessoes, scoring, Firebase auth, validacao
│   ├── middlewares/             #   Auth, rate-limit, cache, performance
│   └── plugins/deepl-translation/  #   Plugin de traducao automatica
├── config/
│   ├── database.ts             #   SQLite (dev) / PostgreSQL (prod)
│   └── game-rules.js           #   Regras do jogo, fases, scoring, achievements
├── AstroQuizApp/               # Mobile (React Native + TypeScript)
│   └── src/
│       ├── screens/            #   Home, Quiz, Results, Stats, Profile, Login
│       ├── services/           #   API client, auth, analytics, storage
│       ├── contexts/           #   Estado global (AppContext)
│       ├── components/         #   UI reutilizavel
│       └── i18n/               #   Traducoes (pt, en, es, fr)
└── docs/                       # Documentacao completa
```

### Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Mobile** | React Native 0.73, TypeScript, React Navigation, i18next |
| **Backend** | Strapi 5.23, Node.js 18, Knex.js (queries customizadas) |
| **Banco de dados** | SQLite (dev), PostgreSQL (prod) |
| **Autenticacao** | Firebase Admin SDK |
| **Uploads** | Cloudinary |
| **Traducao** | DeepL API |
| **Analytics** | Firebase Analytics + Sentry |
| **Deploy** | Railway (Nixpacks) |

## Quick Start

### Pre-requisitos

- Node.js 22.x LTS (`nvm use` para ativar via `.nvmrc`)
- npm 6+

### Backend

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variaveis de ambiente
cp env.example .env

# 3. Iniciar em modo desenvolvimento
npm run develop
```

O servidor sobe em `http://localhost:1337`. O painel admin fica em `/admin`.

### Mobile App

```bash
# 1. Instalar dependencias
cd AstroQuizApp
npm install

# 2. iOS (requer macOS)
cd ios && pod install && cd ..
npx react-native run-ios

# 3. Android
npx react-native run-android
```

### Verificar se esta funcionando

```bash
# Health check
curl http://localhost:1337/api/quiz/health

# Iniciar uma sessao de quiz
curl -X POST http://localhost:1337/api/quiz/start \
  -H "Content-Type: application/json" \
  -d '{"phaseNumber": 1, "locale": "pt"}'
```

## API

12 endpoints RESTful sob `/api/quiz/`:

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| `GET` | `/health` | Health check com stats do banco |
| `GET` | `/rules` | Configuracao do jogo |
| `POST` | `/start` | Iniciar sessao (phase + locale) |
| `GET` | `/question/:sessionId` | Proxima pergunta |
| `POST` | `/answer` | Submeter resposta |
| `POST` | `/pause/:sessionId` | Pausar sessao |
| `POST` | `/resume/:sessionId` | Retomar sessao |
| `POST` | `/finish/:sessionId` | Finalizar sessao |
| `GET` | `/session/:sessionId` | Status da sessao |
| `GET` | `/pool-stats` | Estatisticas do pool de perguntas |

CRUD completo de perguntas em `/api/questions/` (requer autenticacao admin).

> Documentacao detalhada da API em [`docs/quiz-engine-api.md`](docs/quiz-engine-api.md)

## Sistema de Jogo

### Progressao (50 fases)

| Tier | Fases | Niveis | Score Minimo |
|------|-------|--------|--------------|
| Iniciante | 1-10 | 1-2 | 60% |
| Novato | 11-20 | 1-3 | 65% |
| Intermediario | 21-30 | 2-4 | 70% |
| Avancado | 31-40 | 3-5 | 75% |
| Elite | 41-50 | 4-5 | 85% |

### Pontuacao

```
Score = (Base x Multiplicador de Velocidade) + Bonus de Streak

Base por nivel:     L1=10  L2=20  L3=30  L4=40  L5=50
Velocidade:         < 10s = 2.0x | < 15s = 1.5x | < 20s = 1.2x | < 30s = 1.0x
Streak:             +5 pts por acerto consecutivo (min 3, max 50 pts)
Fase perfeita:      1.5x multiplicador
Penalidades:        Erro = -5 | Timeout = -10 | Dica = -3
```

### Desafios Especiais (Elite)

- **Time Attack** — 5 perguntas em 60 segundos (2.0x bonus)
- **Perfect Only** — um erro encerra o desafio (3.0x bonus)
- **Boss Battle** — 15 perguntas nivel 5, 45s cada (2.5x bonus)

## Testes

```bash
npm test                 # Todos os testes
npm run test:unit        # Testes unitarios (src/)
npm run test:api         # Testes de integracao da API
npm run test:services    # Testes de servicos
npm run test:routes      # Testes de rotas
npm run test:middlewares # Testes de middleware
npm run test:coverage    # Relatorio de cobertura
npm run test:performance # Testes de carga
```

## Deploy

O projeto esta configurado para deploy no **Railway** com PostgreSQL:

```bash
# Build de producao
npm run railway:build

# Start de producao
npm run railway:start
```

Variaveis de ambiente necessarias em producao: `DATABASE_URL`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`.

> Guia completo em [`docs/RAILWAY_DEPLOY.md`](docs/RAILWAY_DEPLOY.md)

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| [`QUICK_START.md`](QUICK_START.md) | Guia rapido de setup |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Guia de contribuicao |
| [`COMO_ADICIONAR_PERGUNTAS.md`](COMO_ADICIONAR_PERGUNTAS.md) | Como adicionar perguntas ao quiz |
| [`docs/quiz-engine-api.md`](docs/quiz-engine-api.md) | Referencia completa da API |
| [`docs/usage-examples.md`](docs/usage-examples.md) | Exemplos de uso da API |
| [`docs/i18n-setup.md`](docs/i18n-setup.md) | Configuracao de idiomas |
| [`docs/deepl-integration.md`](docs/deepl-integration.md) | Integracao com DeepL |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Resolucao de problemas |

## Licenca

Este projeto esta licenciado sob a [MIT License](https://opensource.org/licenses/MIT).
