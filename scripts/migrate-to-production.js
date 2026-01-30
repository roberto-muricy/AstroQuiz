#!/usr/bin/env node
/**
 * Migra perguntas do banco SQLite local para produção (Railway)
 * Usa o endpoint /api/questions/import para importação em bulk
 *
 * Uso:
 *   node scripts/migrate-to-production.js [--dry-run] [--locale=pt]
 *
 * Opções:
 *   --dry-run    Apenas simula, não envia para produção
 *   --locale=XX  Migra apenas um locale específico (pt, en, es, fr)
 *   --limit=N    Limita a N perguntas por locale (para teste)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const IMPORT_ENDPOINT = `${PRODUCTION_URL}/api/questions/import`;
const BATCH_SIZE = 50; // Questions per request

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localeArg = args.find(a => a.startsWith('--locale='));
const limitArg = args.find(a => a.startsWith('--limit='));
const targetLocale = localeArg ? localeArg.split('=')[1] : null;
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

console.log('🚀 AstroQuiz - Migração para Produção\n');
console.log(`   URL: ${PRODUCTION_URL}`);
console.log(`   Dry Run: ${dryRun ? 'Sim' : 'Não'}`);
console.log(`   Locale: ${targetLocale || 'Todos'}`);
console.log(`   Limite: ${limit || 'Sem limite'}`);
console.log(`   Batch: ${BATCH_SIZE} perguntas/request\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function importBatch(questions) {
  const response = await fetch(IMPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questions }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Erro desconhecido');
  }

  return result;
}

async function checkExistingQuestions() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/questions?limit=1`);
    const result = await response.json();
    return result.meta?.total || 0;
  } catch (error) {
    console.error('❌ Erro ao verificar perguntas existentes:', error.message);
    return -1;
  }
}

async function checkImportEndpoint() {
  try {
    const response = await fetch(IMPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: [] }),
    });
    const result = await response.json();
    // Should return error about no questions, not 404
    return response.status !== 404;
  } catch (error) {
    return false;
  }
}

async function migrate() {
  // 1. Check if import endpoint exists
  console.log('📡 Verificando endpoint de import...');
  const endpointExists = await checkImportEndpoint();

  if (!endpointExists) {
    console.error('❌ Endpoint /api/questions/import não encontrado!');
    console.error('   Aguarde o deploy finalizar no Railway e tente novamente.');
    process.exit(1);
  }
  console.log('   ✓ Endpoint disponível!\n');

  // 2. Check production status
  console.log('📡 Verificando banco de produção...');
  const existingCount = await checkExistingQuestions();

  if (existingCount === -1) {
    console.error('❌ Não foi possível conectar à produção');
    process.exit(1);
  }

  console.log(`   ✓ Conectado! ${existingCount} perguntas já existem em produção\n`);

  if (existingCount > 0 && !dryRun) {
    console.log('⚠️  ATENÇÃO: Já existem perguntas em produção!');
    console.log('   O script vai adicionar novas perguntas (pode criar duplicatas).\n');

    console.log('   Continuando em 3 segundos... (Ctrl+C para cancelar)\n');
    await sleep(3000);
  }

  // 3. Open local database
  const dbPath = path.resolve(__dirname, '../.tmp/data.db');
  console.log(`📂 Abrindo banco local: ${dbPath}\n`);

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco local:', err.message);
      process.exit(1);
    }
  });

  // 4. Read questions from local database
  let query = `
    SELECT
      question, option_a, option_b, option_c, option_d,
      correct_option, explanation, topic, topic_key, level, base_id, locale, question_type
    FROM questions
    WHERE 1=1
  `;

  if (targetLocale) {
    query += ` AND locale = '${targetLocale}'`;
  }

  query += ' ORDER BY locale, level, id';

  if (limit) {
    query += ` LIMIT ${limit * (targetLocale ? 1 : 4)}`;
  }

  const questions = await new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`📊 Encontradas ${questions.length} perguntas para migrar\n`);

  // Group by locale for reporting
  const byLocale = {};
  questions.forEach(q => {
    byLocale[q.locale] = (byLocale[q.locale] || 0) + 1;
  });

  Object.entries(byLocale).forEach(([locale, count]) => {
    console.log(`   ${locale.toUpperCase()}: ${count} perguntas`);
  });
  console.log('');

  if (dryRun) {
    console.log('🔍 Modo DRY RUN - nenhuma pergunta será enviada\n');

    console.log('📝 Amostra das perguntas:');
    questions.slice(0, 3).forEach((q, i) => {
      console.log(`\n   ${i + 1}. [${q.locale}] ${q.question.substring(0, 60)}...`);
      console.log(`      Nível: ${q.level} | Tópico: ${q.topic}`);
    });

    console.log('\n✅ Dry run concluído!');
    console.log(`   Execute sem --dry-run para migrar ${questions.length} perguntas.\n`);
    db.close();
    return;
  }

  // 5. Convert to API format
  const formattedQuestions = questions.map(q => ({
    question: q.question,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    correctOption: q.correct_option,
    explanation: q.explanation || '',
    topic: q.topic || 'Geral',
    topicKey: q.topic_key || null,
    level: q.level || 1,
    baseId: q.base_id || null,
    locale: q.locale,
    questionType: q.question_type || 'text',
  }));

  // 6. Import in batches
  console.log('📤 Iniciando migração em batches...\n');

  let totalImported = 0;
  let totalErrors = 0;
  const allErrors = [];

  for (let i = 0; i < formattedQuestions.length; i += BATCH_SIZE) {
    const batch = formattedQuestions.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(formattedQuestions.length / BATCH_SIZE);

    try {
      const result = await importBatch(batch);
      totalImported += result.data.imported;
      totalErrors += result.data.errors;

      if (result.data.errorDetails?.length > 0) {
        allErrors.push(...result.data.errorDetails);
      }

      const pct = Math.round((i + batch.length) / formattedQuestions.length * 100);
      console.log(`   ✓ Batch ${batchNum}/${totalBatches}: ${result.data.imported}/${batch.length} importadas (${pct}%)`);

      // Small delay between batches
      await sleep(200);

    } catch (error) {
      console.log(`   ✗ Batch ${batchNum}: ${error.message}`);
      totalErrors += batch.length;
    }
  }

  // 7. Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 RELATÓRIO DE MIGRAÇÃO\n');
  console.log(`   ✅ Sucesso: ${totalImported}`);
  console.log(`   ❌ Erros: ${totalErrors}`);
  console.log(`   📊 Total: ${questions.length}`);

  if (allErrors.length > 0) {
    console.log('\n   Primeiros erros:');
    allErrors.slice(0, 5).forEach(e => {
      console.log(`   - Index ${e.index}: ${e.error}`);
    });
  }

  // Verify final count
  const finalCount = await checkExistingQuestions();
  console.log(`\n   📈 Perguntas em produção: ${existingCount} → ${finalCount}`);
  console.log('='.repeat(50) + '\n');

  db.close();
}

migrate().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
