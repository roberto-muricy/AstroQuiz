#!/usr/bin/env node
/**
 * Republish all questions using Strapi Entity Service
 * This makes them visible in Content Manager
 *
 * Strategy:
 * 1. Read all questions from database (inserted via SQL)
 * 2. Delete them
 * 3. Re-create using entityService.create() for proper Strapi indexing
 */

require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;

async function fetchAllQuestions() {
  const questions = [];

  for (const locale of ['en', 'pt', 'es', 'fr']) {
    const response = await fetch(`${PRODUCTION_URL}/api/questions?locale=${locale}&limit=1000`);
    const result = await response.json();
    questions.push(...result.data);
  }

  return questions;
}

async function createQuestionViaAPI(question) {
  const response = await fetch(`${PRODUCTION_URL}/api/questions?publish=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${writeToken}`,
    },
    body: JSON.stringify({
      data: {
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
        explanation: question.explanation,
        topic: question.topic,
        topicKey: question.topicKey,
        level: question.level,
        baseId: question.baseId,
        questionType: question.questionType,
        locale: question.locale,
        publishedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create question');
  }

  return await response.json();
}

async function deleteAllQuestions() {
  console.log('🗑️  Deletando perguntas existentes...\n');

  let deleted = 0;
  while (true) {
    const response = await fetch(`${PRODUCTION_URL}/api/questions?limit=100`);
    const result = await response.json();

    if (!result.data || result.data.length === 0) break;

    for (const q of result.data) {
      const id = q.documentId || q.id;
      try {
        await fetch(`${PRODUCTION_URL}/api/questions/${id}?locale=*`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${writeToken}`,
          },
        });
        deleted++;
        if (deleted % 100 === 0) {
          console.log(`   Deletadas: ${deleted}...`);
        }
      } catch (e) {
        // continue
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`   ✓ ${deleted} perguntas deletadas\n`);
}

async function main() {
  console.log('🔄 Republicando perguntas via Entity Service\n');

  // 1. Fetch all existing questions
  console.log('📥 Carregando perguntas existentes...');
  const questions = await fetchAllQuestions();
  console.log(`   ✓ ${questions.length} perguntas carregadas\n`);

  // Group by baseId and documentId
  const byDocument = {};
  questions.forEach(q => {
    const key = q.documentId;
    if (!byDocument[key]) {
      byDocument[key] = [];
    }
    byDocument[key].push(q);
  });

  console.log(`   📦 ${Object.keys(byDocument).length} documentos únicos\n`);

  // 2. Delete all
  await deleteAllQuestions();

  // 3. Re-create using Entity Service (via POST /api/questions)
  console.log('📤 Recriando perguntas via Entity Service...\n');

  let created = 0;
  let errors = 0;
  const documents = Object.values(byDocument);

  for (let i = 0; i < documents.length; i++) {
    const locales = documents[i];

    // Create each locale separately (Entity Service will handle linking)
    for (const question of locales) {
      try {
        await createQuestionViaAPI(question);
        created++;

        if (created % 100 === 0) {
          const pct = Math.round((created / questions.length) * 100);
          console.log(`   ✓ ${created}/${questions.length} criadas (${pct}%)`);
        }
      } catch (error) {
        console.log(`   ✗ Erro: ${question.baseId}/${question.locale}: ${error.message}`);
        errors++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Concluído!`);
  console.log(`   Criadas: ${created}`);
  console.log(`   Erros: ${errors}`);
  console.log(`\nAgora as perguntas devem aparecer no Content Manager.`);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
