#!/usr/bin/env node
/**
 * Alinha os topicos dos outros idiomas ao portugues.
 *
 * Depois da consolidacao e da classificacao, o portugues ficou com exatamente
 * 10 topicos. Ingles, espanhol e frances nao: sobraram 13, 14 e 14, por causa
 * de variacoes que nenhum dos dois scripts anteriores tocou.
 *
 * Eles decidiam pelo topico em PORTUGUES e so reescreviam as perguntas cuja
 * origem estava na lista. Perguntas ja corretas em portugues, mas escritas de
 * outro jeito nos demais idiomas, passaram intocadas:
 *
 *   fr  "Étoiles" convivendo com "Objets stellaires"
 *   fr  "Voie lactée" ainda separado de "Galaxies et cosmologie"
 *   es  "Cuerpos menores del Sistema Solar" vs "Cuerpos pequeños..."
 *   es  "Observación del espacio" vs "Observación espacial"
 *   en  "Stars" convivendo com "Stellar Objects", e 4 perguntas em "Geral"
 *
 * Isso importa pelo mesmo motivo de sempre: diversifyTopics() limita 3
 * perguntas do mesmo topico por fase, e duas grafias contam como dois
 * assuntos. Quem joga em frances tem a regra enfraquecida.
 *
 * Aqui nao ha heuristica nem decisao: o portugues virou a referencia limpa, e
 * o script so aplica a tabela de traducao. Se uma pergunta tiver em portugues
 * um topico fora dos 10, ela e listada e NAO tocada — seria sinal de que algo
 * anterior falhou.
 *
 * Uso:
 *   node scripts/normalizar-topicos-idiomas.js              # simula
 *   node scripts/normalizar-topicos-idiomas.js --aplicar    # pergunta o token e grava
 */

const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';
const APLICAR = process.argv.includes('--aplicar');

/** Os dez topicos, com a grafia canonica de cada idioma. */
const TRADUCOES = {
  'Sistema solar': { en: 'Solar System', es: 'Sistema Solar', fr: 'Système solaire' },
  'Objetos estelares': { en: 'Stellar Objects', es: 'Objetos estelares', fr: 'Objets stellaires' },
  'Galáxias e Cosmologia': { en: 'Galaxies & Cosmology', es: 'Galaxias y cosmología', fr: 'Galaxies et cosmologie' },
  'Missões espaciais': { en: 'Space Missions', es: 'Misiones espaciales', fr: 'Missions spatiales' },
  'Observação do espaço': { en: 'Space Observation', es: 'Observación espacial', fr: "Observation de l'espace" },
  'Relatividade e física fundamental': { en: 'Relativity & Fundamental Physics', es: 'Relatividad y física fundamental', fr: 'Relativité et physique fondamentale' },
  'Pequenos corpos do Sistema Solar': { en: 'Small Solar System Bodies', es: 'Cuerpos pequeños del Sistema Solar', fr: 'Petits corps du système solaire' },
  'Curiosidades gerais': { en: 'General Curiosities', es: 'Curiosidades generales', fr: 'Curiosités générales' },
  'Mundos para além': { en: 'Worlds Beyond', es: 'Mundos más allá', fr: 'Les mondes au-delà' },
  'Cientistas': { en: 'Scientists', es: 'Científicos', fr: 'Scientifiques' },
};

const buscar = async (loc) => {
  const t = [];
  for (let s = 0; s < 2000; s += 100) {
    const r = await fetch(`${BASE}/questions?locale=${loc}&limit=100&start=${s}`);
    if (!r.ok) throw new Error(`GET ${loc} -> ${r.status}`);
    const j = await r.json();
    const a = j.data || j;
    if (!Array.isArray(a) || !a.length) break;
    t.push(...a);
  }
  return t;
};

/** Le o token do terminal sem eco e sem passar pela linha de comando. */
function perguntarToken() {
  return new Promise((resolve) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) { console.error('\nERRO: sem terminal interativo.'); return resolve(null); }
    process.stdout.write('\nCole o STRAPI_WRITE_TOKEN (nada aparece na tela) e tecle Enter:\n> ');
    entrada.setRawMode(true); entrada.resume(); entrada.setEncoding('utf8');
    let buffer = '';
    const aoTeclar = (ch) => {
      if (ch === '\r' || ch === '\n') {
        entrada.setRawMode(false); entrada.pause();
        entrada.removeListener('data', aoTeclar);
        process.stdout.write('\n');
        return resolve(buffer.trim());
      }
      if (ch === '') { process.stdout.write('\n'); process.exit(130); }
      if (ch === '') { buffer = buffer.slice(0, -1); return; }
      buffer += ch;
    };
    entrada.on('data', aoTeclar);
  });
}

(async () => {
  console.log(APLICAR ? 'MODO APLICAR — vai escrever no servidor.\n' : 'MODO SIMULACAO — nada sera escrito.\n');

  const [pt, en, es, fr] = await Promise.all(['pt', 'en', 'es', 'fr'].map(buscar));
  const idx = {};
  for (const [loc, arr] of [['pt', pt], ['en', en], ['es', es], ['fr', fr]]) {
    for (const q of arr) (idx[q.baseId] ??= {})[loc] = { id: q.id, topic: q.topic };
  }
  console.log(`perguntas lidas: pt=${pt.length}  en=${en.length}  es=${es.length}  fr=${fr.length}`);

  const plano = [];
  const forasDaLista = [];

  for (const [base, p] of Object.entries(idx)) {
    const topicoPt = p.pt?.topic;
    if (!topicoPt) continue;
    const mapa = TRADUCOES[topicoPt];
    if (!mapa) { forasDaLista.push(`${base}: "${topicoPt}"`); continue; }

    for (const l of ['en', 'es', 'fr']) {
      if (!p[l]) continue;
      if (p[l].topic === mapa[l]) continue;
      plano.push({ id: p[l].id, loc: l, de: p[l].topic, para: mapa[l] });
    }
  }

  if (forasDaLista.length) {
    console.log(`\nATENCAO — ${forasDaLista.length} perguntas com topico em portugues FORA dos 10.`);
    console.log('Elas nao foram tocadas; sinal de que algo anterior nao terminou:');
    forasDaLista.slice(0, 10).forEach((x) => console.log('   ' + x));
  }

  const porIdioma = {};
  const trocas = {};
  plano.forEach((x) => {
    porIdioma[x.loc] = (porIdioma[x.loc] || 0) + 1;
    const k = `[${x.loc}] "${x.de}" -> "${x.para}"`;
    trocas[k] = (trocas[k] || 0) + 1;
  });

  console.log(`\nlinhas a escrever: ${plano.length}`);
  console.log(`  por idioma: ${JSON.stringify(porIdioma)}`);
  console.log('\n  o que muda:');
  Object.entries(trocas).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`    ${String(n).padStart(3)}x  ${k}`));

  if (!APLICAR) {
    console.log('\nSimulacao. Para escrever:  node scripts/normalizar-topicos-idiomas.js --aplicar');
    return;
  }
  if (!plano.length) { console.log('\nNada a fazer — os quatro idiomas ja estao alinhados.'); return; }

  const token = process.env.STRAPI_WRITE_TOKEN || (await perguntarToken());
  if (!token) { console.error('\nERRO: sem token.'); process.exit(1); }
  console.log(`\ntoken recebido: ${token.length} caracteres`);

  const escrever = (item) => fetch(`${BASE}/questions/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topic: item.para, topicKey: item.para }),
  });

  const rt = await escrever(plano[0]);
  if (rt.status === 401) {
    console.error('\nTOKEN RECUSADO (401). Nada foi escrito.');
    console.error('  E o valor de STRAPI_WRITE_TOKEN nas Variables do Railway.');
    process.exit(1);
  }
  if (!rt.ok) { console.error(`\nfalha na primeira escrita: ${rt.status}`); process.exit(1); }
  console.log('token aceito — aplicando o resto.\n');

  let ok = 1;
  const falhas = [];
  for (const item of plano.slice(1)) {
    const r = await escrever(item);
    if (r.ok) ok += 1; else falhas.push(`${item.id}(${r.status})`);
    await new Promise((res) => setTimeout(res, 60));
  }
  console.log(`aplicado: ${ok}/${plano.length}`);
  if (falhas.length) { console.log('falhas:', falhas.slice(0, 12).join(' ')); process.exit(1); }
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
