# 🚀 Quick Start - Quiz Engine

## Passo 1: Iniciar o Strapi

```bash
cd astroquiz-backend
npm run develop
```

Aguarde o Strapi iniciar completamente. Você verá algo como:
```
[2024-01-01 12:00:00.000] info: Server started on http://localhost:1337
```

## Passo 2: Verificar se o Quiz Engine está funcionando

Abra um novo terminal e teste o health check:

```bash
curl http://localhost:1337/api/quiz/health
```

Você deve receber uma resposta como:
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "activeSessions": 0,
    "version": "1.0.0"
  }
}
```

## Passo 3: Verificar se há perguntas no banco

Antes de testar o quiz, você precisa ter perguntas cadastradas. Acesse:

1. **Admin Panel**: http://localhost:1337/admin
2. Vá em **Content Manager** → **Question**
3. Verifique se há perguntas cadastradas

### Se não houver perguntas:

Você pode importar perguntas do CSV que está no projeto:
- `AstroQuiz Questions import.csv`

Ou criar perguntas manualmente pelo admin panel.

## Passo 4: Testar o Quiz Engine

### 4.1 Iniciar uma sessão de quiz

```bash
curl -X POST http://localhost:1337/api/quiz/start \
  -H "Content-Type: application/json" \
  -d '{
    "phaseNumber": 1,
    "locale": "pt"
  }'
```

Você receberá um `sessionId` como resposta.

### 4.2 Obter a primeira pergunta

```bash
curl http://localhost:1337/api/quiz/question/{SESSION_ID}
```

Substitua `{SESSION_ID}` pelo sessionId recebido no passo anterior.

### 4.3 Submeter uma resposta

```bash
curl -X POST http://localhost:1337/api/quiz/answer \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{SESSION_ID}",
    "selectedOption": "A",
    "timeUsed": 15000
  }'
```

### 4.4 Finalizar o quiz

```bash
curl -X POST http://localhost:1337/api/quiz/finish/{SESSION_ID}
```

## Passo 5: Testar o App Mobile

1. Certifique-se de que o Strapi está rodando em `http://localhost:1337`
2. No app mobile, atualize a URL da API em `src/utils/constants.ts` se necessário
3. Inicie o app mobile:

```bash
cd astroquiz-mobile
npm start
```

## 🐛 Troubleshooting

### Erro: "Route not found"
- Certifique-se de que o Strapi foi reiniciado após criar os arquivos
- Verifique se os arquivos estão em `src/api/quiz-engine/`

### Erro: "No questions available"
- Verifique se há perguntas cadastradas no Content Manager
- Certifique-se de que as perguntas estão publicadas
- Verifique se há perguntas no idioma solicitado (locale)

### Erro: "Session not found"
- As sessões expiram após 1 hora
- Inicie uma nova sessão

## 📚 Documentação Completa

- **API Docs**: `docs/quiz-engine-api.md`
- **Resumo**: `docs/quiz-engine-summary.md`
- **Regras do Jogo**: `config/game-rules.js`


