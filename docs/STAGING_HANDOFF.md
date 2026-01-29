# 🧪 Staging Handoff (Strapi + Railway + PostgreSQL)

Este documento descreve como preparar um ambiente **staging profissional** e como conceder acesso a um dev para debugar problemas de **Strapi + Banco** sem expor produção.

## O que você vai entregar ao dev

- **URL do Staging** (Railway): `https://<app>.railway.app`
- **Admin do Strapi**: `https://<app>.railway.app/admin`
- **Acesso Railway (recomendado)**: logs, deployments, variáveis, métricas
- **Acesso ao PostgreSQL** (via Railway): connection string / credenciais
- **Reprodução do bug**: passos + logs/prints + (opcional) dump do banco

## 1) Subir o staging (Railway)

Siga o guia do repo:
- `docs/RAILWAY_DEPLOY.md`
- `docs/RAILWAY_VARIABLES_SETUP.md`

### Gerar variáveis de staging (segredos)

Rode localmente:

```bash
npm run deploy:staging-keys
```

Isso gera `railway-staging.env` (arquivo **gitignored**) para você copiar no Railway → Variables.

## 2) Acesso do dev (recomendado)

- **Railway**: convide o dev para o projeto Railway (melhor para debug).
  - Ele terá acesso a **logs** e poderá ver falhas de conexão/migration/queries.
- **Strapi Admin**: crie um usuário admin para o dev (ou deixe ele criar).

## 3) Acesso ao banco (PostgreSQL)

O Railway cria `DATABASE_URL`. Para dar acesso ao dev:

- **Opção segura**: crie um usuário **read-only** para investigação (quando possível).
- **Opção prática**: compartilhe o `DATABASE_URL` via cofre de segredos (1Password/Bitwarden).

## 4) Dados: como reproduzir o problema sem usar produção

Escolha uma estratégia:

- **Staging limpo**: ótimo para bugs de conexão/migration/config.
- **Staging com dados**: necessário quando o bug depende de conteúdo.
  - Preferir **dump anonimizado** (remover PII).
  - Carregar via `pg_dump`/`psql` (ou pela ferramenta de DB que você usar).

## 5) Checklist rápido de handoff

- [ ] URL do staging
- [ ] Login do admin do Strapi (ou convite Railway)
- [ ] Acesso ao Postgres (read-only se possível)
- [ ] Logs/prints do erro (Railway logs + Strapi logs)
- [ ] Passos para reproduzir
- [ ] (Opcional) dump do banco / dataset mínimo

## 6) Segurança (importante)

- **Não use produção** para debug com terceiros.
- **Não comite segredos** (`railway-*.env`, `.env` etc).
- Se algum segredo foi exposto, **gere novos** e atualize no Railway.

