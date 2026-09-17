# CLAUDE.md - AstroQuiz

## Project Overview

AstroQuiz is a full-stack astronomy quiz app: **Strapi 5 backend** (TypeScript) + **React Native mobile app**. Deployed on Railway with PostgreSQL, Cloudinary, and Firebase Auth.

## Quick Reference

```bash
# Backend
npm run develop          # Dev server with auto-reload (port 1337)
npm run build            # Build Strapi
npm run start            # Production start
npm run health           # Health check (curl localhost:1337/api/health)

# Tests
npm test                 # All tests
npm run test:unit        # Unit tests (src/)
npm run test:api         # API integration tests
npm run test:services    # Service tests
npm run test:routes      # Route tests
npm run test:middlewares # Middleware tests
npm run test:coverage    # With coverage report

# Mobile app (from AstroQuizApp/)
npx react-native start   # Metro bundler
npx react-native run-ios  # iOS
npx react-native run-android # Android
```

**Node version**: 22 LTS (see `.nvmrc`)

## Architecture

```
/                          # Strapi backend (root)
  src/
    index.ts               # Bootstrap: Firebase init, route registration, rate limiting
    routes/                # Custom API routes (quiz, questions, user-profile, i18n, debug)
    services/              # Business logic (quiz-session, quiz-logic, firebase-auth, validation)
    middlewares/            # Auth (Firebase), rate-limit, cache, performance-monitor
    api/question/           # Strapi content-type schema
  config/
    database.ts            # DB config (SQLite dev, PostgreSQL prod)
    game-rules.js          # Scoring, phases, difficulty progression
  scripts/                 # Integration & performance tests
  docs/                    # API docs, deployment guides, troubleshooting

AstroQuizApp/              # React Native mobile app
  src/
    App.tsx                # Entry point (Sentry, Firebase, i18n, AppContext)
    screens/               # HomeScreen, QuizScreen, QuizResultScreen, LoginScreen, etc.
    services/              # api.ts, authService, quizService, analyticsService
    contexts/AppContext.tsx # Global state (user, quiz session, rules, locale)
    navigation/            # React Navigation setup
    components/            # Reusable UI components
    i18n/                  # i18next translations (pt, en, es, fr)
    config/                # theme.ts, sentry.ts
```

## Key Technical Details

### Database
- **Dev**: SQLite (`.tmp/data.db`). O `.env` local usa SQLite de proposito: ate 16/09/2026 ele apontava para o Postgres de producao, e `npm run develop` escrevia no banco real sem aviso.
- **Prod**: PostgreSQL via `DATABASE_URL` (Railway), pela **rede privada**. No servico AstroQuiz a variavel e uma referencia, nao uma string:
  `postgresql://${{Postgres.PGUSER}}:${{Postgres.POSTGRES_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}`
  - **Nunca colar uma URL literal nela.** A URL que o psql usa de fora (`yamabiko.proxy.rlwy.net:55170`) passa pelo proxy publico: funciona, mas e mais lenta, gasta banda de saida e expoe mais. Foi assim ate 17/09/2026. E uma string colada no painel foi o que derrubou producao por 8 horas em 16/09 (valor duplicado).
  - Com a referencia, trocar a senha do banco (`ALTER USER` + `POSTGRES_PASSWORD` no servico Postgres) chega ao backend sozinho no proximo deploy. `PGPASSWORD`, `DATABASE_URL` e `DATABASE_PUBLIC_URL` do servico Postgres ainda sao literais e precisam ser atualizadas a mao.
  - Para conferir por onde o backend chega: `select client_addr from pg_stat_activity`. Rede privada aparece como IPv6 `fd12:...`; proxy publico, como `100.64.x.x`.
- Custom routes use **Knex.js** directly (not Strapi entity service)
- Connection pool: 2-10 connections

### Authentication
- **Firebase Admin SDK** for token verification
- Three middleware levels: `createAuthMiddleware()` (required), `createOptionalAuthMiddleware()` (guest ok), `createAdminMiddleware()` (admin role)
- Quiz play works without auth (guest mode)

### API Routes (all under `/api/`)
- `quiz/*` - Session-based gameplay (start, question, answer, finish, pause, resume)
- `questions/*` - CRUD + bulk import + i18n import
- `user-profile/*` - Profile management with Firebase UID
- `i18n-setup/*` - Language configuration
- `leaderboard/*` - Ranking:
  - leitura publica: `all-time`, `weekly`, `phase`, `country/:country`. Com login (opcional), a resposta traz `me` — a posicao de quem perguntou, com `inBoard: false` e a posicao que teria para quem desligou "aparecer no ranking". Com `?score=N`, traz `hypotheticalPosition`: onde essa pontuacao entraria, que e o que o app mostra ao convidado.
  - com login: `GET me` (le as configuracoes e cria o cadastro se faltar), `PUT me` (apelido, pais, `showCountry`, `visible`), `POST me/pseudonym` (sorteia outro nome gerado), `DELETE me` (sai do ranking), `POST report` (denuncia de apelido)
  - admin: `POST admin/players/:playerId/restore-nickname`
  - conteudo do apelido em `src/services/nickname.ts`: formato, filtro (obscenity + listas pt/es/fr/en do naughty-words), `config/nickname-allowlist.json` (expressoes barradas por engano) e `config/nickname-reserved.json` (nomes que se passariam por oficiais)
  - regras de apelido em `src/services/leaderboard-settings.ts` (primeira definicao livre, troca a cada 7 dias, apelido deixado reservado 30 dias ao dono) e de denuncia em `src/services/leaderboard-reports.ts` (5 por dia por conta, oculta o apelido com 5 pendentes de contas distintas)
  - `DELETE me` apaga o cadastro, as reservas e as denuncias, mas **anonimiza** `phase_results` (`firebase_uid` nulo, `eligible` falso) em vez de apagar: as partidas saem do ranking e deixam de apontar para a pessoa, e as estatisticas de uso continuam. `DELETE /api/user-profile/me` (conta inteira) continua apagando as linhas.
- `debug/*` - Dev-only tools

### Estado em memoria (vale para uma instancia so)
- **Cache do ranking** (`src/services/leaderboard-service.ts`): fica na memoria do processo, por 30 s. A invalidacao (`limparCacheDoRanking`, chamada quando uma fase e gravada) so limpa o cache da instancia que gravou; com mais de uma instancia, as outras podem servir o ranking antigo por ate 30 s.
- Tambem sao por instancia: o rate limit (`src/middlewares/rate-limit.ts`) e a trava por sessao do quiz (`comTravaDaSessao` em `src/services/quiz-session.ts`).
- Hoje o Railway roda uma instancia. Antes de escalar, mover isso para o banco ou para um store compartilhado.

### API Response Format
```typescript
{ success: boolean, message?: string, data: any, error?: { status, name, message } }
```

### Game Mechanics
- 50 phases, 10 questions each, 45s per question (`SCORING.timePerQuestion`)
- Difficulty scales: Phase 1-3 = Level 1 only, Phase 46-50 = Level 5 only
- Scoring: base points (10-50 by level) x speed multiplier (1.0-2.0x) + streak bonus
- Sessions expire after 6 hours
- Locales: en, pt, es, fr

### Testing
- **Jest 29** + **ts-jest** + **Supertest**
- Test files: `src/**/*.test.ts`, `src/**/__tests__/**`, `scripts/**/*.test.js`
- Coverage collected from `src/**/*.ts`

### Deployment
- **Railway** with Nixpacks (no Dockerfile), configurado em `railway.json`:
  - Build: `npm run railway:build` → `rm -rf dist build .cache && npm run build` (`strapi build`)
  - Start: `npm run start` → `strapi start`. O `nixpacks.toml` declara `npm run railway:start`, mas o `startCommand` do `railway.json` prevalece; mantenha os dois coerentes ao mudar.
- Health check: `GET /api/quiz/health`, declarado em `railway.json` (`healthcheckPath`). Devolve **503** quando o banco nao responde (`select 1`, limite de 2 s) e 200 so quando ele responde. Ate 16/09/2026 devolvia 200 sempre: uma instancia com o banco fora passava por saudavel, e uma queda de producao durou horas sem ninguem ser avisado.
- **`dist/` nunca deve voltar a ser versionado.** Ate 14/09/2026 o git guardava um `dist/src/index.js` de fevereiro que, em producao, prevalecia sobre o compilado: a inicializacao nova nao rodava e rotas novas davam 404, sem nenhum erro. `dist/` esta no `.gitignore`; `git ls-files dist` deve sair vazio.
- Tabelas novas: migracao do Strapi em `database/migrations/*.js`, idempotente (`hasTable`). Ela roda na sincronizacao do schema, antes da inicializacao, e fica registrada em `strapi_migrations`.

## Code Conventions

- **Backend**: TypeScript (gradual migration from JS). Kebab-case files (`quiz-routes.ts`). Factory functions for middleware (`createAuthMiddleware()`). Async/await everywhere.
- **Frontend**: TypeScript. PascalCase components (`QuizScreen.tsx`). Functional components + hooks. Context API for state. React Native StyleSheet (no CSS libs).
- **Naming**: Services end in `-service.ts`, routes in `-routes.ts`, tests in `.test.ts` or `__tests__/` dirs.

## Security Rules

**Nunca introduzir vulnerabilidades de seguranca criticas ou altas.** Ao escrever ou modificar codigo, verificar:

- **Sem segredos expostos**: nunca logar, retornar em responses ou hardcodar tokens, senhas, chaves API ou credenciais. Debug endpoints so existem em dev (`NODE_ENV !== 'production'`).
- **Sem injection**: sempre usar queries parametrizadas (Knex query builder). Nunca interpolar input do usuario em SQL, comandos shell ou HTML.
- **Sem vazamento de erros**: catch blocks devem retornar mensagens genericas ao cliente (`'Internal server error'`). Detalhes vao para `strapi.log.error()`, nunca para `ctx.throw(500, error.message)`.
- **IDs e tokens seguros**: usar `crypto.randomBytes()` para gerar IDs. Nunca `Math.random()`. Comparar tokens com `crypto.timingSafeEqual()`, nunca com `===`.
- **Validar input**: validar e sanitizar toda entrada do usuario nas bordas da API. Usar as funcoes de `src/services/validation.ts`.
- **Rate limiting**: todo endpoint publico deve estar coberto pelo rate limiter. Nao confiar em headers `X-Forwarded-For` do cliente — usar `ctx.request.ip`.
- **Auth por padrao**: novos endpoints devem exigir autenticacao. Usar `auth: false` apenas quando explicitamente necessario (health, rules, quiz play).
- **Dependencias**: manter `npm audit` com 0 vulnerabilidades criticas. Usar `overrides` no package.json para forcar versoes seguras em dependencias transitivas quando necessario.

## Environment Variables

See `env.example` for full list. Key ones:
- `DATABASE_CLIENT` (sqlite/postgres), `DATABASE_URL` (prod)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET` (security)
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `STRAPI_WRITE_TOKEN` (integrations)
- `CLOUDINARY_NAME/KEY/SECRET` (file uploads)
