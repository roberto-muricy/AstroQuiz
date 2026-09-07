#!/usr/bin/env node
/**
 * Da topico as 70 perguntas que estavam em "Geral" (55) ou "Astronomia" (15).
 *
 * "Geral" nunca foi um topico: era a pilha das nao classificadas. As perguntas
 * la dentro sao perfeitamente classificaveis — "Qual e o nome da nossa
 * galaxia?", "Quem foi o primeiro a caminhar na Lua?", "O que e a materia
 * negra?". "Astronomia" era metade backlog, metade curiosidade.
 *
 * O destino de cada uma saiu de duas camadas:
 *
 *   1. casamento de palavras do enunciado contra os dez topicos finais
 *   2. revisao humana por cima, no mapa DECIDIDO abaixo
 *
 * A segunda camada existe porque a primeira le o CENARIO, nao o assunto:
 * "Quem descobriu as luas de Jupiter" cita Jupiter, mas a pergunta e sobre
 * Galileu. Cada entrada de DECIDIDO traz o porque.
 *
 * Escreve nos quatro idiomas de uma vez, por baseId.
 *
 * Uso:
 *   node scripts/classificar-sem-topico.js              # simula
 *   node scripts/classificar-sem-topico.js --aplicar    # pergunta o token e grava
 */

const APLICAR = process.argv.includes('--aplicar');
const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';

const buscar = async (loc) => {
  const t = [];
  for (let s = 0; s < 2000; s += 100) {
    const r = await fetch(`${BASE}/questions?locale=${loc}&limit=100&start=${s}`);
    const j = await r.json();
    const a = j.data || j;
    if (!Array.isArray(a) || !a.length) break;
    t.push(...a);
  }
  return t;
};

const REGRAS = [
  ['Cientistas', /galileu|kepler|newton|copérnico|copernico|einstein|quem foi|cientista/i],
  ['Missões espaciais', /miss[aã]o|apollo|sonda|espa[cç]onave|nave|foguete|astronauta|nasa|esa|voyager|sputnik|estação espacial|\biss\b|pousar|pousou|tripula|[oô]nibus espacial/i],
  ['Pequenos corpos do Sistema Solar', /asteroide|cometa|meteor|cintur[aã]o de|kuiper|oort|estrela cadente|meteorito/i],
  ['Mundos para além', /exoplaneta|bioassinatura|habit[aá]vel|vida em outros|zona habit[aá]vel/i],
  ['Galáxias e Cosmologia', /gal[aá]xia|via l[aá]ctea|big bang|universo|expans[aã]o|mat[eé]ria (?:escura|negra)|energia escura|cosmo|redshift/i],
  ['Relatividade e física fundamental', /relatividade|espa[cç]o-tempo|quantic|qu[aâ]ntic|velocidade da luz|ano-luz|unidade astron[oô]mica/i],
  ['Objetos estelares', /estrela|supernova|buraco negro|an[aã] branca|nebulosa|pulsar|quasar|supergigante|constela/i],
  ['Observação do espaço', /telesc[oó]pio|observat[oó]rio|observa[cç][aã]o|luneta|c[eé]u noturno|ver (?:as )?estrelas/i],
  ['Sistema solar', /planeta|[oó]rbita|orbit|sistema solar|marte|v[eê]nus|j[uú]piter|saturno|urano|netuno|merc[uú]rio|plut[aã]o|\blua\b|\bsol\b|solar|\bterra\b|atmosfera|eclipse/i],
  ['Curiosidades gerais', /por que|qual a diferen|curiosidade/i],
];

const sugerir = (texto) => {
  for (const [nome, re] of REGRAS) if (re.test(texto || '')) return nome;
  return null;
};

/**
 * Correcoes revisadas e confirmadas. O automatico le o CENARIO da pergunta; o
 * humano le o ASSUNTO. Ex.: "Quem descobriu as luas de Jupiter" cita Jupiter,
 * mas a pergunta e sobre Galileu.
 */
const DECIDIDO = {
  22612: 'Pequenos corpos do Sistema Solar',   // meteorito, nao a Terra que ele atinge
  20020: 'Cientistas',                          // Copernico
  19998: 'Cientistas',                          // Galileu
  19558: 'Missões espaciais',                   // a estrutura e a ISS
  23354: 'Curiosidades gerais',                 // "como se chama a ciencia que estuda os astros"
  20048: 'Pequenos corpos do Sistema Solar',    // estrela cadente e meteoro
  19532: 'Observação do espaço',                // constelacao e convencao de quem olha
  19472: 'Observação do espaço',
  // As sem palpite, resolvidas lendo enunciado, opcoes e explicacao:
  20038: 'Sistema solar',                       // satelite natural
  20002: 'Galáxias e Cosmologia',               // radiacao cosmica de fundo
  19744: 'Observação do espaço',                // magnitude estelar
  19590: 'Galáxias e Cosmologia',               // a imagem e o mapa do CMB
  19582: 'Sistema solar',                       // a imagem e Plutao; segue o precedente da 22786
  19578: 'Relatividade e física fundamental',   // arcos de luz = lente gravitacional
  19554: 'Missões espaciais',                   // motores do onibus espacial
  19552: 'Missões espaciais',                   // tanque externo do onibus espacial
  19450: 'Sistema solar',                       // auroras boreais
};

const TRADUCOES = {
  'Sistema solar': { pt: 'Sistema solar', en: 'Solar System', es: 'Sistema Solar', fr: 'Système solaire' },
  'Objetos estelares': { pt: 'Objetos estelares', en: 'Stellar Objects', es: 'Objetos estelares', fr: 'Objets stellaires' },
  'Galáxias e Cosmologia': { pt: 'Galáxias e Cosmologia', en: 'Galaxies & Cosmology', es: 'Galaxias y cosmología', fr: 'Galaxies et cosmologie' },
  'Missões espaciais': { pt: 'Missões espaciais', en: 'Space Missions', es: 'Misiones espaciales', fr: 'Missions spatiales' },
  'Observação do espaço': { pt: 'Observação do espaço', en: 'Space Observation', es: 'Observación espacial', fr: "Observation de l'espace" },
  'Relatividade e física fundamental': { pt: 'Relatividade e física fundamental', en: 'Relativity & Fundamental Physics', es: 'Relatividad y física fundamental', fr: 'Relativité et physique fondamentale' },
  'Pequenos corpos do Sistema Solar': { pt: 'Pequenos corpos do Sistema Solar', en: 'Small Solar System Bodies', es: 'Cuerpos pequeños del Sistema Solar', fr: 'Petits corps du système solaire' },
  'Curiosidades gerais': { pt: 'Curiosidades gerais', en: 'General Curiosities', es: 'Curiosidades generales', fr: 'Curiosités générales' },
  'Mundos para além': { pt: 'Mundos para além', en: 'Worlds Beyond', es: 'Mundos más allá', fr: 'Les mondes au-delà' },
  'Cientistas': { pt: 'Cientistas', en: 'Scientists', es: 'Científicos', fr: 'Scientifiques' },
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
      if (ch === '\u0003') { process.stdout.write('\n'); process.exit(130); }
      if (ch === '\u007f') { buffer = buffer.slice(0, -1); return; }
      buffer += ch;
    };
    entrada.on('data', aoTeclar);
  });
}

(async () => {
  const [pt, en, es, fr] = await Promise.all(['pt', 'en', 'es', 'fr'].map(buscar));
  const idx = {};
  for (const [loc, arr] of [['pt', pt], ['en', en], ['es', es], ['fr', fr]]) {
    for (const q of arr) (idx[q.baseId] ??= {})[loc] = q;
  }

  const alvo = Object.values(idx).filter((p) =>
    p.pt && (p.pt.topic === 'Geral' || p.pt.topic === 'Astronomia'));

  const plano = [];
  const resumo = {};
  const semDestino = [];

  for (const p of alvo) {
    const destino = DECIDIDO[p.pt.id] || sugerir(p.pt.question);
    if (!destino) { semDestino.push({ id: p.pt.id, texto: p.pt.question }); continue; }
    resumo[destino] = (resumo[destino] || 0) + 1;
    for (const l of ['pt', 'en', 'es', 'fr']) {
      if (!p[l]) continue;
      const novo = TRADUCOES[destino][l];
      if (p[l].topic === novo) continue;
      plano.push({ id: p[l].id, loc: l, de: p[l].topic, para: novo, texto: p.pt.question.slice(0, 70) });
    }
  }

  console.log(APLICAR ? 'MODO APLICAR — vai escrever no servidor.\n' : 'MODO SIMULACAO — nada sera escrito.\n');
  console.log(`perguntas destinadas: ${alvo.length - semDestino.length} de ${alvo.length}`);
  console.log('\ndestino final:');
  Object.entries(resumo).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}  ${k}`));
  console.log(`\nlinhas a escrever: ${plano.length}`);
  if (semDestino.length) {
    console.log(`\nSEM DESTINO (${semDestino.length}) — precisam de decisao:`);
    semDestino.forEach((x) => console.log(`  ${x.id}  ${x.texto.slice(0, 70)}`));
  }

  if (!APLICAR) {
    console.log('\nSimulacao. Para escrever:  node scripts/classificar-sem-topico.js --aplicar');
    return;
  }

  const token = process.env.STRAPI_WRITE_TOKEN || (await perguntarToken());
  if (!token) { console.error('\nERRO: sem token.'); process.exit(1); }
  console.log(`\ntoken recebido: ${token.length} caracteres`);

  const escrever = async (item) => fetch(`${BASE}/questions/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topic: item.para, topicKey: item.para }),
  });

  // Prova de fogo numa linha antes das outras 279.
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
