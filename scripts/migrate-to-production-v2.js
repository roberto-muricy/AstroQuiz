#!/usr/bin/env node
/**
 * Migra perguntas do banco SQLite local para produção (Railway)
 * Usa o endpoint POST /api/questions com entityService para que
 * as perguntas apareçam no Content Manager do Strapi
 *
 * Uso:
 *   node scripts/migrate-to-production-v2.js [--dry-run] [--locale=pt]
 *
 * Opções:
 *   --dry-run    Apenas simula, não envia para produção
 *   --locale=XX  Migra apenas um locale específico (pt, en, es, fr)
 *   --limit=N    Limita a N perguntas por locale (para teste)
 *   --clean      Limpa perguntas existentes antes de importar
 *   --token=XXX  Token de escrita para autenticação (ou use STRAPI_WRITE_TOKEN env)
 *   --url=XXX    URL do servidor de destino (default: produção Railway)
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const cleanFirst = args.includes('--clean');
const localeArg = args.find(a => a.startsWith('--locale='));
const limitArg = args.find(a => a.startsWith('--limit='));
const tokenArg = args.find(a => a.startsWith('--token='));
const urlArg = args.find(a => a.startsWith('--url='));

const targetLocale = localeArg ? localeArg.split('=')[1] : null;
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const writeToken = tokenArg ? tokenArg.split('=')[1] : process.env.STRAPI_WRITE_TOKEN;
const PRODUCTION_URL = urlArg ? urlArg.split('=')[1] : 'https://astroquiz-production.up.railway.app';
const QUESTIONS_ENDPOINT = `${PRODUCTION_URL}/api/questions`;
const IMPORT_V2_ENDPOINT = `${PRODUCTION_URL}/api/questions/import-v2`;
const BATCH_SIZE = 25; // Groups per request
const BATCH_DELAY = 300; // ms between batches

console.log('🚀 AstroQuiz - Migração para Produção (v2 - EntityService)\n');
console.log(`   URL: ${PRODUCTION_URL}`);
console.log(`   Dry Run: ${dryRun ? 'Sim' : 'Não'}`);
console.log(`   Limpar antes: ${cleanFirst ? 'Sim' : 'Não'}`);
console.log(`   Locale: ${targetLocale || 'Todos'}`);
console.log(`   Limite: ${limit || 'Sem limite'}`);
console.log(`   Token: ${writeToken ? '***configurado***' : 'Não configurado'}`);
console.log('');

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

async function checkExistingQuestions() {
  try {
    const response = await fetch(`${QUESTIONS_ENDPOINT}?limit=1`);
    const result = await response.json();
    return result.meta?.total || 0;
  } catch (error) {
    console.error('❌ Erro ao verificar perguntas existentes:', error.message);
    return -1;
  }
}

async function cleanAllQuestions() {
  console.log('🧹 Limpando perguntas existentes em produção...');
  
  // Get all question IDs
  let page = 1;
  let deleted = 0;
  const pageSize = 100;
  
  while (true) {
    const response = await fetch(`${QUESTIONS_ENDPOINT}?limit=${pageSize}&start=${(page - 1) * pageSize}`);
    const result = await response.json();
    
    if (!result.data || result.data.length === 0) break;
    
    for (const q of result.data) {
      try {
        const delResponse = await fetch(`${QUESTIONS_ENDPOINT}/${q.documentId || q.id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        
        if (delResponse.ok) {
          deleted++;
          if (deleted % 50 === 0) {
            console.log(`   Deletadas: ${deleted}...`);
          }
        }
      } catch (e) {
        // ignore delete errors
      }
      await sleep(50);
    }
    
    page++;
  }
  
  console.log(`   ✓ ${deleted} perguntas removidas\n`);
  return deleted;
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

async function migrate() {
  // 1. Check production status
  console.log('📡 Verificando banco de produção...');
  const existingCount = await checkExistingQuestions();

  if (existingCount === -1) {
    console.error('❌ Não foi possível conectar à produção');
    process.exit(1);
  }

  console.log(`   ✓ Conectado! ${existingCount} perguntas existem em produção\n`);

  // 2. Clean if requested
  if (cleanFirst && !dryRun && existingCount > 0) {
    await cleanAllQuestions();
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
    console.log(`   Execute sem --dry-run para migrar ${questions.length} perguntas.`);
    console.log(`   Use --clean para limpar perguntas existentes antes.\n`);
    db.close();
    return;
  }

  // 5. Group questions by baseId for proper i18n handling
  console.log('📤 Iniciando migração (usando Document Service API com i18n)...\n');

  // Group questions by baseId
  const questionsByBaseId = {};
  questions.forEach(q => {
    const key = q.base_id || `no_base_${q.id}`;
    if (!questionsByBaseId[key]) {
      questionsByBaseId[key] = {};
    }
    questionsByBaseId[key][q.locale] = q;
  });

  const baseIds = Object.keys(questionsByBaseId);
  console.log(`   📦 ${baseIds.length} grupos de perguntas (por baseId)\n`);

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

  let totalImported = 0;
  let totalErrors = 0;
  const allErrors = [];

  // Import in batches
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

  const errors = allErrors;

  // 6. Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 RELATÓRIO DE MIGRAÇÃO\n');
  console.log(`   ✅ Sucesso: ${totalImported}`);
  console.log(`   ❌ Erros: ${totalErrors}`);
  console.log(`   📊 Total: ${questions.length}`);

  if (errors.length > 5) {
    console.log(`\n   (${errors.length - 5} erros adicionais não mostrados)`);
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
