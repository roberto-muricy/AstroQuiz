#!/usr/bin/env node
/**
 * Importa question-bank.json direto na API Strapi.
 * Usa question-bank.json no mesmo diretório por padrão.
 * Suporta token (Bearer) via env API_TOKEN.
 *
 * Uso:
 *   API_URL=http://localhost:1337 API_TOKEN=seu_token node scripts/import-question-bank-json.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:1337';
const TOKEN = process.env.API_TOKEN || '';
const FILE = path.join(__dirname, 'question-bank.json');

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`❌ question-bank.json não encontrado em ${FILE}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`📦 Importando ${questions.length} perguntas para ${API_URL}/api/questions`);

  let ok = 0;
  let err = 0;

  for (const [idx, q] of questions.entries()) {
    const payload = { data: { ...q, publishedAt: new Date().toISOString() } };
    try {
      await axios.post(`${API_URL}/api/questions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        },
        timeout: 15000,
      });
      ok++;
      if ((ok + err) % 25 === 0) {
        console.log(`   Progresso: ${ok + err}/${questions.length}`);
      }
    } catch (e) {
      err++;
      console.warn(
        `   Falha ${idx + 1}/${questions.length} (${q.baseId || 'sem baseId'}):`,
        e.response?.data || e.message
      );
    }
  }

  console.log(`\n✅ Concluído. Sucesso: ${ok} | Erros: ${err} | Total: ${questions.length}`);
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e.message);
  process.exit(1);
});
