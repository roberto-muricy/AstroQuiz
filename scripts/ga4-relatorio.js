'use strict';

/**
 * Números de uso do GA4, só leitura.
 *
 *   node scripts/ga4-relatorio.js 2026-09-01 2026-09-21
 *
 * Autentica com a conta de serviço do Firebase (chave no Chaveiro do macOS, em
 * "AstroQuiz Firebase Admin SDK"), que tem acesso de Leitor à propriedade do
 * GA4 desde 21/09/2026. A API de dados do Analytics precisa estar ativa no
 * projeto do Google Cloud.
 *
 * Nada é escrito, e nenhuma credencial vai para a saída.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const { JWT } = require(path.join(RAIZ, 'node_modules/google-auth-library'));

const PROPRIEDADE = '496639394';
const [inicio, fim] = process.argv.slice(2);

let conta;
try {
  conta = JSON.parse(Buffer.from(execFileSync('security', ['find-generic-password', '-s', 'AstroQuiz Firebase Admin SDK', '-w'], { encoding: 'utf8' }).trim(), 'base64').toString('utf8'));
} catch { console.log('sem credencial'); process.exit(1); }

const pedir = async (token, corpo) => {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPRIEDADE}:runReport`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateRanges: [{ startDate: inicio, endDate: fim }], ...corpo }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.error) { console.log('  erro:', j.error.status, '-', (j.error.message || '').slice(0, 140)); return []; }
  return (j.rows || []).map((l) => [...(l.dimensionValues || []).map((d) => d.value), ...(l.metricValues || []).map((m) => m.value)]);
};

(async () => {
  const token = (await new JWT({ email: conta.client_email, key: conta.private_key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] }).getAccessToken()).token;

  console.log('=== por dia (usuários ativos / novos / sessões)');
  for (const l of await pedir(token, { dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }))
    console.log('  ', l[0].slice(6) + '/' + l[0].slice(4, 6), '|', l[1], '|', l[2], '|', l[3]);

  console.log('=== por plataforma');
  for (const l of await pedir(token, { dimensions: [{ name: 'platform' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }] }))
    console.log('  ', l[0].padEnd(10), 'usuários', l[1], '| sessões', l[2]);

  console.log('=== por versão do app');
  for (const l of await pedir(token, { dimensions: [{ name: 'appVersion' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 }))
    console.log('  ', (l[0] || '(sem versão)').padEnd(10), l[1]);

  console.log('=== por país (top 8)');
  for (const l of await pedir(token, { dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 }))
    console.log('  ', (l[0] || '(sem país)').padEnd(22), l[1]);

  console.log('=== eventos (top 15)');
  for (const l of await pedir(token, { dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 15 }))
    console.log('  ', l[0].padEnd(28), 'vezes', String(l[1]).padStart(5), '| pessoas', l[2]);

  console.log('=== engajamento');
  for (const l of await pedir(token, { metrics: [{ name: 'engagedSessions' }, { name: 'averageSessionDuration' }, { name: 'screenPageViews' }, { name: 'userEngagementDuration' }] }))
    console.log('   sessões engajadas', l[0], '| duração média', Math.round(+l[1]), 's | telas vistas', l[2], '| tempo total', Math.round(+l[3] / 60), 'min');
})();
