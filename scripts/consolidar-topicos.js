#!/usr/bin/env node
/**
 * Consolida o vocabulario de topicos de 18 para 10.
 *
 * Por que reduzir: o `topic` nao e so o texto laranja no topo da pergunta. Ele
 * governa a montagem da fase — diversifyTopics() limita 3 perguntas do mesmo
 * topico por fase. Topicos duplicados ou pequenos demais enfraquecem essa
 * regra: "Mundos para alem" e "Mundos alem" eram contados como assuntos
 * diferentes, e "Via Lactea" com 2 perguntas nunca chegava perto do limite.
 *
 * As fusoes, e o motivo de cada uma:
 *
 *   Estrelas         -> Objetos estelares   mesmo assunto; o ingles ja
 *                                            chamava parte de "Stars" e parte
 *                                            de "Stellar Objects"
 *   Via Lactea       -> Galaxias e Cosmologia   a Via Lactea e uma galaxia
 *   Mundos alem      -> Mundos para alem     mesma coisa, duas grafias
 *   Lua, Sol, Terra  -> Sistema solar        sao PARTES do Sistema Solar,
 *                                            estavam listados como irmaos dele
 *
 * Efeito colateral desejado: as 23 perguntas do lote mal rotulado (IDs
 * contiguos 23482-23818, todas com pt="Lua" e en="Sun" independente do
 * conteudo) caem em "Sistema solar" — e conferi uma a uma que TODAS pertencem
 * la: Terra, Lua, Sol, Jupiter, Saturno, orbitas, eclipses, formacao do
 * Sistema Solar. O erro delas estava numa granularidade que deixa de existir.
 *
 * O script trabalha por baseId, nao por locale: para cada pergunta cujo topico
 * em PORTUGUES esta na lista de fusoes, escreve o topico de destino nos quatro
 * idiomas. Isso tambem conserta a divergencia entre idiomas de quebra — havia
 * perguntas com "Lua" em pt, "Sun" em en, "Sol" em es e "Systeme solaire" em
 * fr, todas a mesma pergunta.
 *
 * Uso:
 *   node scripts/consolidar-topicos.js              # simula
 *   node scripts/consolidar-topicos.js --aplicar    # pergunta o token e grava
 */

const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';
const LOCS = ['pt', 'en', 'es', 'fr'];
const APLICAR = process.argv.includes('--aplicar');

/** topico em portugues -> topico de destino */
const FUSOES = {
  'Estrelas': 'Objetos estelares',
  'Via Láctea': 'Galáxias e Cosmologia',
  'Mundos além': 'Mundos para além',
  'Lua': 'Sistema solar',
  'Sol': 'Sistema solar',
  'Terra': 'Sistema solar',
};

/** Como cada topico de destino se escreve em cada idioma. */
const TRADUCOES = {
  'Sistema solar': { pt: 'Sistema solar', en: 'Solar System', es: 'Sistema Solar', fr: 'Système solaire' },
  'Objetos estelares': { pt: 'Objetos estelares', en: 'Stellar Objects', es: 'Objetos estelares', fr: 'Objets stellaires' },
  'Galáxias e Cosmologia': { pt: 'Galáxias e Cosmologia', en: 'Galaxies & Cosmology', es: 'Galaxias y cosmología', fr: 'Galaxies et cosmologie' },
  'Mundos para além': { pt: 'Mundos para além', en: 'Worlds Beyond', es: 'Mundos más allá', fr: 'Les mondes au-delà' },
};

const buscarLocale = async (loc) => {
  const todas = [];
  for (let start = 0; start < 2000; start += 100) {
    const r = await fetch(`${BASE}/questions?locale=${loc}&limit=100&start=${start}`);
    if (!r.ok) throw new Error(`GET questions ${loc} -> ${r.status}`);
    const j = await r.json();
    const arr = j.data || j;
    if (!Array.isArray(arr) || arr.length === 0) break;
    todas.push(...arr);
  }
  return todas;
};

/** Le o token do terminal sem eco e sem passar pela linha de comando. */
function perguntarToken() {
  return new Promise((resolve) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      console.error('\nERRO: sem terminal interativo.');
      return resolve(null);
    }
    process.stdout.write('\nCole o STRAPI_WRITE_TOKEN (nada aparece na tela) e tecle Enter:\n> ');
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding('utf8');
    let buffer = '';
    const aoTeclar = (ch) => {
      if (ch === '\r' || ch === '\n') {
        entrada.setRawMode(false);
        entrada.pause();
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

  const dados = {};
  for (const l of LOCS) dados[l] = await buscarLocale(l);
  console.log(`perguntas lidas: ${LOCS.map((l) => `${l}=${dados[l].length}`).join('  ')}`);

  const porBase = {};
  for (const l of LOCS) {
    for (const q of dados[l]) (porBase[q.baseId] ??= {})[l] = { id: q.id, topic: q.topic };
  }

  const plano = [];
  const resumo = {};

  for (const p of Object.values(porBase)) {
    const topicoPt = p.pt?.topic;
    const destino = FUSOES[topicoPt];
    if (!destino) continue;

    resumo[`${topicoPt} -> ${destino}`] = (resumo[`${topicoPt} -> ${destino}`] || 0) + 1;

    for (const l of LOCS) {
      if (!p[l]) continue;
      const alvo = TRADUCOES[destino][l];
      if (p[l].topic === alvo) continue; // ja esta certo
      plano.push({ id: p[l].id, loc: l, de: p[l].topic, para: alvo });
    }
  }

  console.log('\nFUSOES:');
  Object.entries(resumo).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)} perguntas   ${k}`));
  console.log(`\nlinhas a escrever: ${plano.length}`);
  const porIdioma = {};
  plano.forEach((x) => (porIdioma[x.loc] = (porIdioma[x.loc] || 0) + 1));
  console.log(`  por idioma: ${JSON.stringify(porIdioma)}`);
  console.log('\n  amostra:');
  plano.slice(0, 6).forEach((x) => console.log(`    [${x.loc}] id ${x.id}: "${x.de}" -> "${x.para}"`));

  if (!APLICAR) {
    console.log('\nSimulacao. Para escrever:  node scripts/consolidar-topicos.js --aplicar');
    return;
  }

  const token = process.env.STRAPI_WRITE_TOKEN || (await perguntarToken());
  if (!token) { console.error('\nERRO: sem token.'); process.exit(1); }
  console.log(`\ntoken recebido: ${token.length} caracteres`);

  // Prova de fogo numa linha so, antes de disparar o resto.
  const teste = plano[0];
  const rt = await fetch(`${BASE}/questions/${teste.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topic: teste.para, topicKey: teste.para }),
  });
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
    const r = await fetch(`${BASE}/questions/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic: item.para, topicKey: item.para }),
    });
    if (r.ok) ok += 1; else falhas.push(`${item.id}(${r.status})`);
    await new Promise((res) => setTimeout(res, 60));
  }
  console.log(`aplicado: ${ok}/${plano.length}`);
  if (falhas.length) { console.log('falhas:', falhas.slice(0, 12).join(' ')); process.exit(1); }
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
