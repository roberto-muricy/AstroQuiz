# 🎮 Quiz Engine API

## 📋 Estrutura Implementada

### Services
- **scoring.js** - Cálculo de pontuação, bônus e penalidades
- **selector.js** - Seleção inteligente de perguntas
- **session.js** - Gerenciamento de sessões de quiz

### Controller
- **quiz.js** - Todos os endpoints da API do quiz

### Routes
- **quiz.js** - Definição de todas as rotas

## 🚀 Endpoints Disponíveis

### POST `/api/quiz/start`
Inicia uma nova sessão de quiz
```json
{
  "phaseNumber": 1,
  "locale": "pt",
  "userId": "optional"
}
```

### GET `/api/quiz/question/:sessionId`
Obtém a pergunta atual da sessão

### POST `/api/quiz/answer`
Submete uma resposta
```json
{
  "sessionId": "quiz_xxx",
  "selectedOption": "A",
  "timeUsed": 15000
}
```

### POST `/api/quiz/finish/:sessionId`
Finaliza a sessão e retorna resultados

### POST `/api/quiz/pause/:sessionId`
Pausa a sessão

### POST `/api/quiz/resume/:sessionId`
Retoma a sessão pausada

### GET `/api/quiz/session/:sessionId`
Obtém status e estatísticas da sessão

### GET `/api/quiz/rules`
Obtém regras do jogo (opcional: `?phaseNumber=1`)

### GET `/api/quiz/pool-stats`
Estatísticas do pool de perguntas (`?phaseNumber=1&locale=pt`)

### GET `/api/quiz/health`
Health check do serviço

## 📝 Notas

- As sessões são armazenadas em memória (Map)
- Limpeza automática de sessões expiradas a cada minuto
- Integração completa com o Content Type `question`
- Suporte a i18n (pt, en, es, fr)
- Sistema de pontuação com bônus de velocidade e streak
- Seleção inteligente de perguntas baseada em distribuição e cooldown

## 🔧 Configuração

As regras do jogo estão em `config/game-rules.js`


