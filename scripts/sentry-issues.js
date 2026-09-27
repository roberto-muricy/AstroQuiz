'use strict';

/**
 * Erros abertos do AstroQuiz no Sentry, só leitura.
 *
 *   node scripts/sentry-issues.js [dias] [projeto]
 *
 * Padrão: 14 dias, projeto "react-native" (o do AstroQuiz; o "glype" é de
 * outro app da mesma organização). O token vem do Chaveiro, item
 * "AstroQuiz Sentry Leitura" — uma Internal Integration com escopos só de
 * leitura (Organization, Project, Issue & Event). Ele enxerga a organização
 * inteira, por isso o script sempre pede um projeto.
 *
 * Nunca imprime o token.
 */

const { execFileSync } = require('child_process');

const ORG = 'loopwise';
const dias = Number(process.argv[2]) || 14;
const projeto = process.argv[3] || 'react-native';

let token;
try {
  token = execFileSync('security', ['find-generic-password', '-s', 'AstroQuiz Sentry Leitura', '-w'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  console.log('token do Sentry não encontrado no Chaveiro ("AstroQuiz Sentry Leitura")');
  process.exit(1);
}

const get = async (caminho) => {
  const r = await fetch(`https://sentry.io/api/0${caminho}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

(async () => {
  try {
    const p = await get(`/projects/${ORG}/${projeto}/`);
    console.log(`projeto ${p.slug} (id ${p.id}) — últimos ${dias} dias, só abertos\n`);

    const issues = await get(`/projects/${ORG}/${projeto}/issues/?query=is:unresolved&statsPeriod=${dias}d&limit=50&sort=freq`);
    if (!issues.length) console.log('nenhum erro aberto.');
    for (const i of issues) {
      const nome = (i.metadata?.type ? i.metadata.type + ': ' : '') + (i.metadata?.value || i.title);
      console.log(`${i.shortId} | ${i.count} eventos, ${i.userCount} pessoas | visto ${i.lastSeen.slice(0, 10)} (1º ${i.firstSeen.slice(0, 10)})`);
      console.log(`   ${nome.slice(0, 110)}`);
    }
  } catch (e) {
    console.log('falha ao consultar o Sentry:', e.message);
    process.exit(1);
  }
})();
