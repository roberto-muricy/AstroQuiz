// Configuração do serviço AstroQuiz no Railway (Infrastructure as Code).
//
// Substitui o railway.json (Config as Code, descontinuado em 01/12/2026).
// Gerado com `railway config pull` em 23/10/2026 e reduzido ao serviço do
// backend:
//
//   - O Postgres e o volume dele ficam de FORA de propósito. O pull os
//     trazia junto, e o plano passava a trocar a imagem do banco para
//     postgres:18 — uma troca de versão principal no banco de produção não
//     pode acontecer como efeito colateral de um arquivo de deploy.
//   - As variáveis são `preserve()`: o arquivo declara que elas existem, mas
//     os valores continuam só no Railway. Tirar uma daqui faz o `apply`
//     APAGÁ-LA em produção — o primeiro rascunho, gerado pelo `config
//     migrate`, não tinha a lista e apagaria as 17, chaves do Firebase e
//     endereço do banco inclusive.
//   - O builder (Railpack) não tem campo aqui: está no painel do serviço,
//     gravado pela API em 23/10/2026. É ele que garante o Node exato de
//     engines.node / .nvmrc. Conferir no log de start: "node v22.23.4".
//
// Antes de qualquer `railway config apply`, rodar `railway config plan` e
// ler a lista: nada de "Delete variable" nem troca de source.

import { defineRailway, github, preserve, project, service } from "railway/iac";

export const partial = "AstroQuiz";

export default defineRailway(() => {
  const AstroQuiz = service("AstroQuiz", {
    source: github("roberto-muricy/AstroQuiz", { checkSuites: false }),
    build: "npm run railway:build",
    start: "npm run start",
    healthcheck: "/api/quiz/health",
    healthcheckTimeout: 300,
    replicas: { "us-east4-eqdc4a": 1 },
    deploy: { restartPolicyMaxRetries: 5 },
    networking: { privateNetworkEndpoint: "astroquiz" },
    env: {
      ADMIN_JWT_SECRET: preserve(),
      API_TOKEN_SALT: preserve(),
      APP_KEYS: preserve(),
      CLOUDINARY_KEY: preserve(),
      CLOUDINARY_NAME: preserve(),
      CLOUDINARY_SECRET: preserve(),
      CORS_ORIGINS: preserve(),
      DATABASE_CLIENT: preserve(),
      DATABASE_URL: preserve(),
      DEEPL_API_KEY: preserve(),
      FIREBASE_PROJECT_ID: preserve(),
      FIREBASE_SERVICE_ACCOUNT_JSON: preserve(),
      JWT_SECRET: preserve(),
      NODE_ENV: preserve(),
      STRAPI_TELEMETRY_DISABLED: preserve(),
      STRAPI_WRITE_TOKEN: preserve(),
      TRANSFER_TOKEN_SALT: preserve(),
    },
  });

  return project("AstroQuiz", {
    resources: [AstroQuiz],
  });
});
