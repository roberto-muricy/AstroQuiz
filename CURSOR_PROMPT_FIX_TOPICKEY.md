# Prompt para Cursor: Corrigir Campo topicKey não aparece no Strapi Admin

## Contexto do Problema

Tenho um **Strapi v5** com PostgreSQL rodando no Railway. O campo `topicKey` (enumeration) das Questions **aparece via API** mas **NÃO aparece no Admin Panel**.

**Causa provável identificada:** Os dados foram inseridos via SQL direto (knex) e o campo `document_id` do Strapi v5 está NULL, vazio ou inválido. O Admin Panel depende do Document Service que usa `document_id` para carregar os registros.

## Sua Tarefa

### FASE 1: Diagnóstico

1. **Conecte ao banco PostgreSQL** do projeto AstroQuiz no Railway

2. **Execute estas queries de diagnóstico** e me mostre os resultados:

```sql
-- 1.1 Verificar se coluna document_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'questions'
  AND column_name = 'document_id';

-- 1.2 Contar registros com problemas
SELECT
  COUNT(*) as total_records,
  COUNT(CASE WHEN document_id IS NULL THEN 1 END) as null_document_id,
  COUNT(CASE WHEN document_id = '' THEN 1 END) as empty_document_id,
  COUNT(CASE WHEN LENGTH(document_id) != 24 THEN 1 END) as invalid_length,
  COUNT(CASE WHEN document_id IS NOT NULL AND document_id != '' AND LENGTH(document_id) = 24 THEN 1 END) as valid_document_id
FROM questions;

-- 1.3 Amostra de registros (ver estado atual)
SELECT
  id,
  document_id,
  LENGTH(document_id) as doc_id_length,
  topic_key,
  question_type,
  locale,
  CASE
    WHEN published_at IS NOT NULL THEN 'published'
    ELSE 'draft'
  END as status
FROM questions
ORDER BY id
LIMIT 10;

-- 1.4 Verificar registro específico mencionado
SELECT
  id,
  document_id,
  LENGTH(document_id) as doc_id_length,
  topic_key,
  question_type,
  locale,
  base_id
FROM questions
WHERE id = 12231;

-- 1.5 Ver distribuição de topic_key
SELECT
  COALESCE(topic_key, 'NULL') as topic_key_value,
  COUNT(*) as quantidade
FROM questions
GROUP BY topic_key
ORDER BY quantidade DESC;

-- 1.6 Verificar duplicatas de document_id (não deveria ter)
SELECT
  document_id,
  COUNT(*) as duplicatas
FROM questions
WHERE document_id IS NOT NULL AND document_id != ''
GROUP BY document_id
HAVING COUNT(*) > 1
LIMIT 10;
```

3. **Me reporte os resultados** antes de prosseguir para a correção.

---

### FASE 2: Correção (executar SOMENTE após diagnóstico)

**⚠️ IMPORTANTE:** Execute estas queries em **transação** e faça backup antes!

Se o diagnóstico confirmar que `document_id` está NULL, vazio ou com tamanho diferente de 24 caracteres:

```sql
-- 2.1 BACKUP - Exportar dados críticos
-- Salve o resultado desta query em um arquivo CSV antes de prosseguir:
SELECT id, document_id, base_id, topic_key, question_type, locale, published_at
FROM questions
ORDER BY id;

-- 2.2 Contar quantos serão corrigidos
SELECT COUNT(*) as registros_a_corrigir
FROM questions
WHERE document_id IS NULL
   OR document_id = ''
   OR LENGTH(document_id) != 24;

-- 2.3 CORREÇÃO - Gerar document_id válido
-- Formato Strapi v5: 24 caracteres alfanuméricos lowercase (base64url-like)
BEGIN;

-- Atualizar registros sem document_id válido
UPDATE questions
SET
  document_id = LOWER(
    SUBSTRING(
      REGEXP_REPLACE(
        ENCODE(
          GEN_RANDOM_BYTES(16),
          'base64'
        ),
        '[^a-zA-Z0-9]',
        '',
        'g'
      ),
      1,
      24
    )
  ),
  updated_at = NOW()
WHERE document_id IS NULL
   OR document_id = ''
   OR LENGTH(document_id) != 24;

-- PostgreSQL mostrará quantas linhas foram atualizadas
-- Exemplo: UPDATE 522

-- 2.4 Verificar resultado ANTES de commitar
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN document_id IS NOT NULL AND LENGTH(document_id) = 24 THEN 1 END) as com_doc_id_valido,
  COUNT(CASE WHEN document_id IS NULL OR document_id = '' OR LENGTH(document_id) != 24 THEN 1 END) as ainda_invalidos
FROM questions;

-- 2.5 Verificar que não criamos duplicatas
SELECT document_id, COUNT(*) as duplicatas
FROM questions
GROUP BY document_id
HAVING COUNT(*) > 1;

-- Se tudo estiver OK (0 inválidos, 0 duplicatas):
COMMIT;

-- Se algo deu errado:
-- ROLLBACK;

-- 2.6 Verificar amostra após commit
SELECT
  id,
  document_id,
  LENGTH(document_id) as len,
  topic_key,
  locale
FROM questions
WHERE id IN (12231, 12229, 12227)
ORDER BY id;
```

---

### FASE 3: Verificação no Strapi (se ainda não funcionar)

Se após a correção do `document_id` o Admin ainda não mostrar o `topicKey`:

#### 3.1 Verificar o schema

```bash
# No terminal do projeto
cat src/api/question/content-types/question/schema.json | grep -A 15 "topicKey"
```

O campo deve estar assim:
```json
"topicKey": {
  "type": "enumeration",
  "enum": [
    "Galaxies & Cosmology",
    "General Curiosities",
    "Relativity & Fundamental Physics",
    "Scientists",
    "Small Solar System Bodies",
    "Solar System",
    "Space Missions",
    "Space Observation",
    "Stellar Objects",
    "Worlds Beyond"
  ],
  "pluginOptions": {
    "i18n": {
      "localized": false
    }
  }
}
```

#### 3.2 Limpar cache e rebuild

```bash
# No diretório do projeto
rm -rf .cache build dist
npm run build

# Para Railway, fazer push:
git add -A
git commit -m "Fix document_id for Strapi Admin compatibility"
git push origin main
```

#### 3.3 Verificar permissões no Admin

1. Login no Admin Panel
2. Settings → Roles → Admin/Author/Editor
3. Verificar se `topicKey` está com permissão de leitura/escrita
4. Salvar se necessário

#### 3.4 Criar endpoint de teste Document Service

Adicione este código temporário:

```typescript
// src/api/question/controllers/question.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::question.question', ({ strapi }) => ({

  // Adicione este método para teste
  async testDocumentService(ctx) {
    try {
      const { id } = ctx.params;
      const knex = strapi.db.connection;

      // 1. Buscar via SQL
      const sqlResult = await knex('questions')
        .select('id', 'document_id', 'topic_key', 'question_type', 'locale')
        .where('id', id)
        .first();

      if (!sqlResult) {
        return ctx.notFound('Question not found');
      }

      if (!sqlResult.document_id) {
        return ctx.body = {
          error: 'Registro sem document_id válido',
          sqlResult
        };
      }

      // 2. Buscar via Document Service (o que o Admin usa)
      let docResult = null;
      try {
        docResult = await strapi.documents('api::question.question').findOne({
          documentId: sqlResult.document_id,
          locale: sqlResult.locale || 'en',
        });
      } catch (e) {
        docResult = { error: e.message };
      }

      // 3. Comparar
      ctx.body = {
        success: true,
        viaSql: {
          id: sqlResult.id,
          documentId: sqlResult.document_id,
          topicKey: sqlResult.topic_key,
          questionType: sqlResult.question_type,
          locale: sqlResult.locale,
        },
        viaDocumentService: docResult ? {
          documentId: docResult.documentId,
          topicKey: docResult.topicKey,
          questionType: docResult.questionType,
          locale: docResult.locale,
        } : null,
        matches: {
          topicKey: sqlResult.topic_key === docResult?.topicKey,
          questionType: sqlResult.question_type === docResult?.questionType,
        }
      };

    } catch (error) {
      ctx.throw(500, error.message);
    }
  }

}));
```

```typescript
// src/api/question/routes/custom-routes.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/questions/test-document-service/:id',
      handler: 'question.testDocumentService',
      config: { auth: false },
    },
  ],
};
```

Depois teste:
```bash
curl "https://astroquiz-production.up.railway.app/api/questions/test-document-service/12231"
```

---

### FASE 4: Última Tentativa - Forçar atualização via Document Service

Se tudo acima falhar, force a atualização de todos os registros via Document Service:

```typescript
// Script para rodar localmente ou via endpoint
async function forceUpdateViaDocumentService() {
  const knex = strapi.db.connection;

  // Buscar todos os registros
  const questions = await knex('questions')
    .select('id', 'document_id', 'topic_key', 'question_type', 'locale')
    .whereNotNull('document_id')
    .andWhere('document_id', '!=', '')
    .limit(100); // Fazer em batches de 100

  for (const q of questions) {
    try {
      await strapi.documents('api::question.question').update({
        documentId: q.document_id,
        locale: q.locale || 'en',
        data: {
          topicKey: q.topic_key,
          questionType: q.question_type,
        },
      });
      console.log(`✅ Updated ${q.document_id}`);
    } catch (e) {
      console.error(`❌ Failed ${q.document_id}:`, e.message);
    }
  }
}
```

---

## Informações do Ambiente

- **Strapi Version:** v5.6.0
- **Database:** PostgreSQL no Railway
- **URL Produção:** https://astroquiz-production.up.railway.app
- **Tabela:** `questions`
- **Campos problema:**
  - `topic_key` (no banco) → `topicKey` (no schema/admin)
  - `question_type` (no banco) → `questionType` (no schema/admin)
- **Total de registros:** 522 perguntas × 4 locales = ~2088 registros
- **Locales:** en, pt, fr, es
- **Formato esperado document_id:** 24 caracteres alfanuméricos lowercase

## Resultado Esperado

Após a correção:
1. ✅ Todos os registros terão `document_id` válido (24 caracteres)
2. ✅ O Admin Panel mostrará os campos `topicKey` e `questionType` com valores corretos
3. ✅ A API customizada continuará funcionando normalmente
4. ✅ Nenhuma perda de dados

## Notas Importantes

- **NÃO deletar dados** - apenas atualizar/adicionar `document_id`
- Use **transação** (BEGIN/COMMIT/ROLLBACK) para segurança
- Faça **backup** da tabela antes de executar UPDATE
- O `document_id` no Strapi v5 é gerado como: base64url de 16 bytes random = 24 chars
- Após correção no banco, pode ser necessário:
  - Logout/login no Admin
  - Limpar cache do browser (Ctrl+Shift+Delete → All time + Cookies)
  - Rebuild do Strapi (`npm run build`)
- Se estiver usando Redis/cache externo, limpar também

## Checklist de Execução

- [ ] FASE 1: Diagnóstico completo
- [ ] Backup da tabela `questions` feito
- [ ] FASE 2: Correção do `document_id` executada em transação
- [ ] Verificação: 0 registros com `document_id` inválido
- [ ] Verificação: 0 duplicatas de `document_id`
- [ ] FASE 3: Rebuild do Strapi e push para produção
- [ ] Teste: Abrir Admin Panel e verificar campo `topicKey`
- [ ] Teste: Endpoint `/questions/test-document-service/12231`
- [ ] Se necessário: FASE 4 (atualização forçada via Document Service)

## Contato para Dúvidas

Se encontrar algum problema ou precisar de esclarecimentos durante a execução, pare e reporte os erros exatos antes de continuar.
