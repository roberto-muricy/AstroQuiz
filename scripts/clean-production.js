#!/usr/bin/env node
/**
 * Limpa todas as perguntas da produção
 * Usa DELETE /api/questions/:id para cada pergunta
 */

require('dotenv').config();

const args = process.argv.slice(2);
const tokenArg = args.find(a => a.startsWith('--token='));
const urlArg = args.find(a => a.startsWith('--url='));
const dryRun = args.includes('--dry-run');

const writeToken = tokenArg ? tokenArg.split('=')[1] : process.env.STRAPI_WRITE_TOKEN;
const PRODUCTION_URL = urlArg ? urlArg.split('=')[1] : 'https://astroquiz-production.up.railway.app';

console.log('🧹 AstroQuiz - Limpeza de Produção\n');
console.log(`   URL: ${PRODUCTION_URL}`);
console.log(`   Dry Run: ${dryRun ? 'Sim' : 'Não'}`);
console.log('');

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (writeToken) {
    headers['Authorization'] = `Bearer ${writeToken}`;
  }
  return headers;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clean() {
  // Get total count
  const countRes = await fetch(`${PRODUCTION_URL}/api/questions?limit=1`);
  const countData = await countRes.json();
  const total = countData.meta?.total || 0;

  console.log(`📊 ${total} perguntas encontradas em produção\n`);

  if (total === 0) {
    console.log('✅ Produção já está limpa!');
    return;
  }

  if (dryRun) {
    console.log('🔍 Modo DRY RUN - nenhuma pergunta será deletada');
    console.log(`   Execute sem --dry-run para deletar ${total} perguntas.\n`);
    return;
  }

  let deleted = 0;
  let page = 0;
  const pageSize = 100;

  while (true) {
    // Always get first page since we're deleting
    const response = await fetch(`${PRODUCTION_URL}/api/questions?limit=${pageSize}`);
    const result = await response.json();

    if (!result.data || result.data.length === 0) break;

    for (const q of result.data) {
      const id = q.documentId || q.id;
      try {
        const delRes = await fetch(`${PRODUCTION_URL}/api/questions/${id}?locale=*`, {
          method: 'DELETE',
          headers: getHeaders(),
        });

        if (delRes.ok) {
          deleted++;
          if (deleted % 50 === 0) {
            console.log(`   Deletadas: ${deleted}/${total}...`);
          }
        } else {
          const err = await delRes.json();
          console.log(`   ✗ Erro ao deletar ${id}: ${err.error?.message || 'unknown'}`);
        }
      } catch (e) {
        console.log(`   ✗ Erro: ${e.message}`);
      }
      await sleep(50);
    }

    page++;
    if (page > 100) break; // Safety limit
  }

  console.log(`\n✅ ${deleted} perguntas deletadas!`);
}

clean().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
