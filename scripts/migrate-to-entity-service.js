#!/usr/bin/env node
/**
 * Migrate SQL-inserted questions to Entity Service
 * This makes them visible in Content Manager
 */

require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;
const BATCH_SIZE = 50;

async function getAllQuestions() {
  const allQuestions = [];

  for (const locale of ['en', 'pt', 'es', 'fr']) {
    const response = await fetch(`${PRODUCTION_URL}/api/questions?locale=${locale}&limit=1000&published=all`);
    const result = await response.json();
    allQuestions.push(...result.data);
  }

  return allQuestions;
}

async function deleteQuestion(id) {
  return fetch(`${PRODUCTION_URL}/api/questions/${id}?locale=*`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${writeToken}`,
    },
  });
}

async function createQuestionViaEntityService(question) {
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
        explanation: question.explanation || '',
        topic: question.topic || 'Geral',
        topicKey: question.topicKey || null,
        level: question.level || 1,
        baseId: question.baseId,
        questionType: question.questionType || 'text',
        locale: question.locale,
        publishedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create');
  }

  return await response.json();
}

async function main() {
  console.log('🔄 Migrando perguntas SQL para Entity Service\n');
  console.log('   Isso fará as perguntas aparecerem no Content Manager\n');

  // 1. Get all questions
  console.log('📥 Carregando perguntas existentes...');
  const questions = await getAllQuestions();
  console.log(`   ✓ ${questions.length} perguntas encontradas\n`);

  // Group by documentId to avoid re-creating same question multiple times
  const byDocId = {};
  questions.forEach(q => {
    if (!byDocId[q.documentId]) {
      byDocId[q.documentId] = [];
    }
    byDocId[q.documentId].push(q);
  });

  const uniqueDocs = Object.keys(byDocId).length;
  console.log(`   📦 ${uniqueDocs} documentos únicos\n`);

  // 2. Delete all SQL questions
  console.log('🗑️  Deletando perguntas SQL...');
  let deleted = 0;

  for (const docId of Object.keys(byDocId)) {
    try {
      await deleteQuestion(docId);
      deleted++;
      if (deleted % 100 === 0) {
        console.log(`   Deletadas: ${deleted}/${uniqueDocs}...`);
      }
    } catch (e) {
      // continue
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`   ✓ ${deleted} documentos deletados\n`);

  // 3. Re-create via Entity Service
  console.log('📤 Recriando via Entity Service (aparecerão no Admin)...\n');

  let created = 0;
  let errors = 0;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    try {
      await createQuestionViaEntityService(question);
      created++;

      if (created % 100 === 0) {
        const pct = Math.round((created / questions.length) * 100);
        console.log(`   ✓ ${created}/${questions.length} criadas (${pct}%)`);
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.log(`   ✗ Erro ${question.baseId}/${question.locale}: ${error.message}`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n✅ Migração concluída!`);
  console.log(`   Criadas: ${created}`);
  console.log(`   Erros: ${errors}`);
  console.log(`\n   Acesse o Content Manager para verificar!`);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
