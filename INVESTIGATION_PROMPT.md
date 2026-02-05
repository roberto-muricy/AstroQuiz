# Prompt para Cursor: Corrigir Campo topicKey não aparece no Strapi Admin

**ATENÇÃO:** Este prompt substitui o anterior. A causa raiz identificada é `document_id` NULL/inválido.

---

# Prompt Original (para contexto histórico)

## Prompt para Investigação: Strapi v5 Admin não mostra campo topicKey

## Contexto

Tenho um **Strapi v5** com PostgreSQL em produção (Railway) com um content-type **Question** que tem um campo `topicKey` (type: enumeration, localized: false).

## Problema

O campo `topicKey` **NÃO aparece** no Strapi Admin Panel (Content Manager), mas **APARECE** via API customizada.

## Arquitetura

### Schema (src/api/question/content-types/question/schema.json)
```json
{
  "topicKey": {
    "type": "enumeration",
    "pluginOptions": {
      "i18n": {
        "localized": false
      }
    },
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
    ]
  }
}
```

### Controllers/Services
- **Criados recentemente**: `src/api/question/controllers/question.ts` e `services/question.ts`
- Usam `factories.createCoreController/Service('api::question.question')`

### Como os dados foram inseridos
Os dados foram inseridos via **SQL direto** (knex):
```javascript
await knex('questions').insert({
  topic_key: 'Solar System',
  // ... outros campos
});
```

Posteriormente tentamos atualizar via:
```javascript
await knex('questions').update({ topic_key: 'Solar System' });
```

## O que FUNCIONA ✅

### 1. API Customizada
```bash
curl "https://astroquiz-production.up.railway.app/api/questions/12231" \
  -H "Authorization: Bearer TOKEN"
```
**Retorna:**
```json
{
  "id": 12231,
  "topicKey": "Solar System",
  "topic": "Solar System"
}
```

### 2. SQL Direto
```sql
SELECT id, topic_key FROM questions WHERE id = 12231;
-- Retorna: topic_key = 'Solar System'
```

### 3. Update via API funciona
```bash
curl -X PUT "https://astroquiz-production.up.railway.app/api/questions/12231" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {"topicKey": "Solar System"}}'
# Retorna 200 OK com topicKey atualizado
```

## O que NÃO FUNCIONA ❌

### Strapi Admin Panel
1. Acessando Content Manager → Question
2. Abrindo qualquer pergunta
3. O campo `topicKey` aparece **VAZIO** (dropdown sem valor selecionado)
4. Mesmo após:
   - Logout/login
   - Clear cache do browser (All time + Cookies + Cached images)
   - Abrir em janela anônima
   - Testar em browsers diferentes

## Tentativas de Solução

### 1. ✅ Criados Controllers/Services padrão
```typescript
// src/api/question/controllers/question.ts
export default factories.createCoreController('api::question.question');

// src/api/question/services/question.ts
export default factories.createCoreService('api::question.question');
```

### 2. ✅ Endpoint usando Documents API (Strapi v5)
```typescript
await strapi.documents('api::question.question').update({
  documentId: doc.documentId,
  locale: doc.locale,
  data: { topicKey: doc.topicKey },
});
```
Funciona sem erro mas Admin continua não mostrando.

### 3. ✅ Endpoint usando Entity Service
```typescript
await strapi.entityService.update('api::question.question', id, {
  data: { topicKey: 'Solar System' }
});
```

## Endpoints de Debug Criados

```
GET /api/questions/debug-all-methods/:id
```
Compara 4 métodos de leitura:
1. Raw SQL
2. Knex com mapeamento
3. Entity Service
4. Documents API

## Hipóteses

1. **Metadata faltando**: Inserção via SQL direto não criou estruturas internas do Strapi
2. **Cache interno do Strapi**: Não apenas browser cache, mas cache do Entity Service
3. **Relações/Join tables**: Campo enum pode precisar de registros em outras tabelas
4. **Schema mismatch**: Diferença entre schema.json e estrutura real do DB

## Pergunta Principal

**Como fazer o Strapi v5 Admin Panel reconhecer e mostrar corretamente um campo que foi inserido via SQL direto (knex)?**

## Estrutura do Banco

- **Tabela**: `questions`
- **Coluna**: `topic_key` (varchar/text no PostgreSQL)
- **Valor**: String (ex: "Solar System")
- **522 perguntas** com `topic_key` populado
- **4 locales**: en, pt, fr, es (topic_key não é localizado)

## Próximos Passos Sugeridos

1. Investigar o que o Entity Service realmente retorna
2. Verificar se há tabelas de metadados/componentes que precisam ser criadas
3. Comparar uma questão inserida via Admin vs via SQL
4. Verificar logs do Strapi para erros silenciosos
5. Testar se outros campos enum funcionam
6. Verificar permissões do campo no Admin

## Endpoint de Teste

Após deploy (aguarde 2min), teste:
```bash
curl "https://astroquiz-production.up.railway.app/api/questions/debug-all-methods/12231"
```

Isso deve mostrar como cada método (SQL, knex, Entity Service, Documents API) lê o campo topicKey.
