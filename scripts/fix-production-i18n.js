#!/usr/bin/env node
/**
 * Script para corrigir importação incorreta em produção
 *
 * Problema identificado:
 * - 1044 perguntas em produção (deveria ter 522)
 * - Perguntas duplicadas (2x cada baseId no mesmo locale)
 * - Perguntas não estão vinculadas corretamente via i18n do Strapi
 *
 * Solução:
 * 1. Limpa TODAS as perguntas da produção
 * 2. Reimporta usando o endpoint /api/questions/import-v2 (Document Service API)
 * 3. Verifica a integridade após importação
 *
 * Uso:
 *   node scripts/fix-production-i18n.js [--dry-run] [--skip-clean]
 *
 * Opções:
 *   --dry-run      Apenas simula, não faz alterações reais
 *   --skip-clean   Não limpa antes (assume produção vazia)
 *   --token=XXX    Token de escrita (ou use STRAPI_WRITE_TOKEN env)
 *   --url=XXX      URL do servidor (default: Railway)
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipClean = args.includes('--skip-clean');
const tokenArg = args.find(a => a.startsWith('--token='));
const urlArg = args.find(a => a.startsWith('--url='));

const writeToken = tokenArg ? tokenArg.split('=')[1] : process.env.STRAPI_WRITE_TOKEN;
const PRODUCTION_URL = urlArg ? urlArg.split('=')[1] : 'https://astroquiz-production.up.railway.app';
const IMPORT_V2_ENDPOINT = `${PRODUCTION_URL}/api/questions/import-v2`;
const QUESTIONS_ENDPOINT = `${PRODUCTION_URL}/api/questions`;
const BATCH_SIZE = 25; // Question groups per request
const BATCH_DELAY = 300; // ms between batches

console.log('🔧 AstroQuiz - Correção de I18n em Produção\n');
console.log(`   URL: ${PRODUCTION_URL}`);
console.log(`   Dry Run: ${dryRun ? 'Sim' : 'Não'}`);
console.log(`   Limpar antes: ${skipClean ? 'Não' : 'Sim'}`);
console.log(`   Token: ${writeToken ? '***configurado***' : 'Não configurado'}`);
console.log('');

if (!writeToken) {
  console.error('❌ Token de escrita não configurado!');
  console.error('   Configure STRAPI_WRITE_TOKEN no .env ou use --token=XXX');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (writeToken) {
    headers['Authorization'] = `Bearer ${writeToken}`;
  }
  return headers;
}

async function getQuestionCount() {
  try {
    const response = await fetch(`${QUESTIONS_ENDPOINT}?limit=1`);
    const result = await response.json();
    return result.meta?.total || 0;
  } catch (error) {
    console.error('❌ Erro ao verificar perguntas:', error.message);
    return -1;
  }
}

async function cleanAllQuestions() {
  console.log('🧹 ETAPA 1: Limpando perguntas existentes...\n');

  if (dryRun) {
    console.log('   [DRY RUN] Pulando limpeza\n');
    return 0;
  }

  let deleted = 0;
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    // Always get first page since we're deleting
    const response = await fetch(`${QUESTIONS_ENDPOINT}?limit=100`);
    const result = await response.json();

    if (!result.data || result.data.length === 0) break;

    for (const q of result.data) {
      const id = q.documentId || q.id;
      try {
        const delRes = await fetch(`${QUESTIONS_ENDPOINT}/${id}?locale=*`, {
          method: 'DELETE',
          headers: getHeaders(),
        });

        if (delRes.ok) {
          deleted++;
          if (deleted % 100 === 0) {
            console.log(`   Deletadas: ${deleted}...`);
          }
        }
      } catch (e) {
        // Continue on error
      }
      await sleep(50);
    }

    attempts++;
  }

  console.log(`   ✓ ${deleted} perguntas removidas\n`);
  return deleted;
}

async function loadLocalQuestions() {
  console.log('📂 ETAPA 2: Carregando perguntas do banco local...\n');

  const dbPath = path.resolve(__dirname, '../.tmp/data.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco local:', err.message);
      process.exit(1);
    }
  });

  const query = `
    SELECT
      question, option_a, option_b, option_c, option_d,
      correct_option, explanation, topic, topic_key, level, base_id, locale, question_type
    FROM questions
    ORDER BY base_id, locale
  `;

  const questions = await new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  db.close();

  console.log(`   ✓ ${questions.length} perguntas carregadas\n`);

  // Group by locale
  const byLocale = {};
  questions.forEach(q => {
    byLocale[q.locale] = (byLocale[q.locale] || 0) + 1;
  });

  Object.entries(byLocale).forEach(([locale, count]) => {
    console.log(`      ${locale.toUpperCase()}: ${count} perguntas`);
  });
  console.log('');

  return questions;
}

function groupQuestionsByBaseId(questions) {
  const questionsByBaseId = {};

  questions.forEach(q => {
    const key = q.base_id || `no_base_${q.locale}_${Math.random()}`;
    if (!questionsByBaseId[key]) {
      questionsByBaseId[key] = {};
    }
    questionsByBaseId[key][q.locale] = q;
  });

  const baseIds = Object.keys(questionsByBaseId);
  console.log(`   📦 ${baseIds.length} grupos únicos (por baseId)\n`);

  // Convert to format expected by import-v2 endpoint
  const questionGroups = baseIds.map(baseId => {
    const locales = {};
    for (const [locale, q] of Object.entries(questionsByBaseId[baseId])) {
      locales[locale] = {
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
        questionType: q.question_type || 'text',
      };
    }
    return { baseId, locales };
  });

  return questionGroups;
}

async function importBatch(questionGroups) {
  const response = await fetch(IMPORT_V2_ENDPOINT, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questions: questionGroups }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || result.message || JSON.stringify(result));
  }

  return result;
}

async function importQuestions(questionGroups) {
  console.log('📤 ETAPA 3: Importando com i18n correto...\n');

  if (dryRun) {
    console.log('   [DRY RUN] Pulando importação');
    console.log(`   Seriam importados ${questionGroups.length} grupos\n`);
    return { imported: 0, errors: 0 };
  }

  let totalImported = 0;
  let totalErrors = 0;
  const allErrors = [];

  const totalBatches = Math.ceil(questionGroups.length / BATCH_SIZE);

  for (let i = 0; i < questionGroups.length; i += BATCH_SIZE) {
    const batch = questionGroups.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const result = await importBatch(batch);
      totalImported += result.data.imported;
      totalErrors += result.data.errors;

      if (result.data.errorDetails?.length > 0) {
        allErrors.push(...result.data.errorDetails);
      }

      const pct = Math.round((i + batch.length) / questionGroups.length * 100);
      console.log(`   ✓ Batch ${batchNum}/${totalBatches}: ${result.data.imported} importadas (${pct}%)`);

      await sleep(BATCH_DELAY);
    } catch (error) {
      console.log(`   ✗ Batch ${batchNum}: ${error.message}`);
      totalErrors += batch.length * 4; // Assume 4 locales per group
    }
  }

  console.log('');
  return { imported: totalImported, errors: totalErrors, errorDetails: allErrors };
}

async function verifyImport(expectedGroups) {
  console.log('🔍 ETAPA 4: Verificando integridade...\n');

  if (dryRun) {
    console.log('   [DRY RUN] Pulando verificação\n');
    return;
  }

  // Check total by locale
  const locales = ['en', 'pt', 'es', 'fr'];
  const counts = {};

  for (const locale of locales) {
    const response = await fetch(`${QUESTIONS_ENDPOINT}?locale=${locale}&limit=1`);
    const result = await response.json();
    counts[locale] = result.meta?.total || 0;
  }

  console.log('   Perguntas por locale:');
  Object.entries(counts).forEach(([locale, count]) => {
    const expected = expectedGroups;
    const status = count === expected ? '✓' : '✗';
    console.log(`      ${status} ${locale.toUpperCase()}: ${count} (esperado: ${expected})`);
  });

  // Check for duplicates
  console.log('\n   Verificando duplicatas...');
  const response = await fetch(`${QUESTIONS_ENDPOINT}?baseId=q0001&limit=10`);
  const result = await response.json();
  const uniqueDocIds = new Set(result.data.map(q => q.documentId));
  const uniqueLocales = new Set(result.data.map(q => q.locale));

  console.log(`      Pergunta q0001: ${result.data.length} registros, ${uniqueDocIds.size} documentId(s), ${uniqueLocales.size} locale(s)`);

  if (uniqueDocIds.size === 1 && uniqueLocales.size === 4) {
    console.log('      ✓ I18n configurado corretamente!');
  } else if (result.data.length > 4) {
    console.log('      ✗ ATENÇÃO: Ainda há duplicatas!');
  }

  console.log('');
}

async function main() {
  const startTime = Date.now();

  // Check initial state
  const initialCount = await getQuestionCount();
  if (initialCount === -1) {
    console.error('❌ Não foi possível conectar à produção');
    process.exit(1);
  }

  console.log(`📊 Estado inicial: ${initialCount} perguntas em produção\n`);
  console.log('='.repeat(60) + '\n');

  // Step 1: Clean existing questions
  let deleted = 0;
  if (!skipClean) {
    deleted = await cleanAllQuestions();
  } else {
    console.log('⏭️  ETAPA 1: Pulada (--skip-clean)\n');
  }

  // Step 2: Load local questions
  const localQuestions = await loadLocalQuestions();

  // Group by baseId
  const questionGroups = groupQuestionsByBaseId(localQuestions);

  // Step 3: Import with proper i18n
  const importResult = await importQuestions(questionGroups);

  // Step 4: Verify
  await verifyImport(questionGroups.length);

  // Final report
  const finalCount = await getQuestionCount();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('='.repeat(60));
  console.log('📊 RELATÓRIO FINAL\n');
  console.log(`   ⏱️  Tempo: ${elapsed}s`);
  console.log(`   🧹 Deletadas: ${deleted}`);
  console.log(`   ✅ Importadas: ${importResult.imported}`);
  console.log(`   ❌ Erros: ${importResult.errors}`);
  console.log(`   📈 Total em produção: ${initialCount} → ${finalCount}`);

  const expectedTotal = questionGroups.length;
  if (finalCount === expectedTotal) {
    console.log(`\n   ✅ Sucesso! ${finalCount} documentos únicos com 4 locales cada.`);
  } else {
    console.log(`\n   ⚠️  Atenção: Esperado ${expectedTotal}, encontrado ${finalCount}`);
  }

  if (importResult.errorDetails?.length > 0) {
    console.log('\n   Primeiros erros:');
    importResult.errorDetails.slice(0, 5).forEach(e => {
      console.log(`   - [${e.baseId}/${e.locale}]: ${e.error}`);
    });
  }

  console.log('='.repeat(60) + '\n');

  if (dryRun) {
    console.log('🔍 Modo DRY RUN - Nenhuma alteração foi feita');
    console.log('   Execute sem --dry-run para aplicar as mudanças\n');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
