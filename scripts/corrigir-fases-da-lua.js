#!/usr/bin/env node
/**
 * Arruma as duas perguntas de "que fase da Lua e esta?" nos quatro idiomas.
 *
 * Dois problemas, independentes um do outro.
 *
 * ## 1. Capitalizacao inconsistente dentro da MESMA lista
 *
 *   pt  "Lua Cheia" | "Quarto crescente" | "Lua Nova" | "Gibosa minguante"
 *   es  "Luna llena" | "Cuarto creciente" | "Luna Nueva" | "Gibosa menguante"
 *
 * Duas alternativas com inicial maiuscula no adjetivo e duas sem, lado a lado
 * na tela. Padronizado para maiuscula so na primeira palavra — "Lua" continua
 * maiuscula por ser o nome do corpo celeste (o acervo ja escreve "Lua" 82
 * vezes contra 21 em minuscula), e o adjetivo da fase vai em minuscula por nao
 * fazer parte de nome proprio.
 *
 * `en` e `fr` ja estavam consistentes e nao tiveram capitalizacao mexida: em
 * ingles a convencao e Title Case para os nomes das fases, e o frances ja
 * usava so a inicial.
 *
 * ## 2. Distratores tecnicos em perguntas de nivel 1
 *
 *   "Gibosa minguante" / "Minguante concava"
 *
 * NAO e portugues de Portugal — foi essa a suspeita que levou a investigacao.
 * "Gibosa" vem do latim `gibbus` e e o termo tecnico usado tambem no Brasil.
 * O problema e outro: e vocabulario tecnico numa pergunta de nivel 1, que e
 * onde entra quem acabou de instalar o jogo. O acervo usa os quatro nomes do
 * dia a dia 20 vezes e os nomes das fases intermediarias exatamente duas,
 * sempre como alternativa errada.
 *
 * Alem disso um distrator que o jogador nao reconhece e um distrator ruim: ele
 * e eliminado por estranheza, nao por conhecimento, e deixa a pergunta mais
 * facil pelo motivo errado. Trocados pelo quarto nome padrao, o que torna as
 * duas perguntas honestamente mais dificeis.
 *
 * A pergunta 23294 ("A Lua cheia", dentro de uma frase) NAO e tocada: ali a
 * minuscula esta certa.
 *
 * Uso:
 *   node scripts/corrigir-fases-da-lua.js              # simula
 *   node scripts/corrigir-fases-da-lua.js --aplicar    # pergunta o token e grava
 */

const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';
const APLICAR = process.argv.includes('--aplicar');

/**
 * O estado final de cada alternativa, por id.
 *
 * Escrito por extenso, e nao por regra, de proposito: sao oito linhas e o
 * risco de uma substituicao automatica acertar o texto e errar o gabarito nao
 * compensa a economia. `correta` viaja junto so para ser conferida contra o
 * servidor antes de qualquer escrita.
 */
const PLANO = [
  // ---- astro_img_0015: a imagem mostra o Quarto crescente ----
  { id: 19570, loc: 'pt', correta: 'B',
    optionA: 'Lua cheia', optionB: 'Quarto crescente', optionC: 'Lua nova', optionD: 'Quarto minguante' },
  { id: 22598, loc: 'en', correta: 'B',
    optionA: 'Full Moon', optionB: 'First Quarter', optionC: 'New Moon', optionD: 'Last Quarter' },
  { id: 21658, loc: 'es', correta: 'B',
    optionA: 'Luna llena', optionB: 'Cuarto creciente', optionC: 'Luna nueva', optionD: 'Cuarto menguante' },
  { id: 20616, loc: 'fr', correta: 'B',
    optionA: 'Pleine lune', optionB: 'Premier quartier', optionC: 'Nouvelle lune', optionD: 'Dernier quartier' },

  // ---- astro_img_0001: a imagem mostra a Lua cheia ----
  { id: 19598, loc: 'pt', correta: 'B',
    optionA: 'Lua nova', optionB: 'Lua cheia', optionC: 'Quarto crescente', optionD: 'Quarto minguante' },
  { id: 22599, loc: 'en', correta: 'B',
    optionA: 'New Moon', optionB: 'Full Moon', optionC: 'First Quarter', optionD: 'Last Quarter' },
  { id: 21686, loc: 'es', correta: 'B',
    optionA: 'Luna nueva', optionB: 'Luna llena', optionC: 'Cuarto creciente', optionD: 'Cuarto menguante' },
  { id: 20644, loc: 'fr', correta: 'B',
    optionA: 'Nouvelle lune', optionB: 'Pleine lune', optionC: 'Premier quartier', optionD: 'Dernier quartier' },
];

const LETRAS = ['A', 'B', 'C', 'D'];

const buscar = async (loc, token) => {
  const t = [];
  for (let s = 0; s < 2000; s += 100) {
    const r = await fetch(`${BASE}/questions?locale=${loc}&limit=100&start=${s}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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

  const token = process.env.STRAPI_WRITE_TOKEN || (APLICAR ? await perguntarToken() : null);
  if (APLICAR && !token) { console.error('\nERRO: sem token.'); process.exit(1); }

  // O gabarito so vem para quem se identifica. Sem ele nao da para conferir
  // que a alternativa correta continua sendo a mesma, e a conferencia e o
  // ponto principal desta checagem.
  if (!token) {
    console.error('ERRO: defina STRAPI_WRITE_TOKEN (esta no .env do backend).');
    console.error('  Sem ele o servidor nao devolve correctOption e nao da para validar o plano.');
    process.exit(1);
  }

  const acervos = {};
  for (const loc of ['pt', 'en', 'es', 'fr']) acervos[loc] = await buscar(loc, token);

  const problemas = [];
  const mudancas = [];

  for (const alvo of PLANO) {
    const atual = acervos[alvo.loc].find((q) => q.id === alvo.id);
    if (!atual) { problemas.push(`id ${alvo.id} (${alvo.loc}) nao encontrada`); continue; }

    if (!('correctOption' in atual)) {
      problemas.push(`id ${alvo.id}: servidor nao devolveu correctOption — token invalido?`);
      continue;
    }
    if (atual.correctOption !== alvo.correta) {
      problemas.push(
        `id ${alvo.id} (${alvo.loc}): o servidor diz que a correta e ${atual.correctOption}, ` +
        `o plano assume ${alvo.correta}. NAO tocar.`
      );
      continue;
    }

    const diffs = LETRAS
      .filter((L) => atual[`option${L}`] !== alvo[`option${L}`])
      .map((L) => `      ${L}) "${atual[`option${L}`]}"  ->  "${alvo[`option${L}`]}"`);

    if (!diffs.length) { console.log(`  ${alvo.loc} id ${alvo.id}: ja esta como deveria`); continue; }
    mudancas.push({ alvo, diffs });
  }

  if (problemas.length) {
    console.error('\nPROBLEMAS — nada sera escrito:');
    problemas.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }

  console.log(`\nlinhas a escrever: ${mudancas.length}\n`);
  for (const { alvo, diffs } of mudancas) {
    console.log(`  [${alvo.loc}] id ${alvo.id}   (correta continua ${alvo.correta})`);
    diffs.forEach((d) => console.log(d));
    console.log('');
  }

  if (!APLICAR) {
    console.log('Simulacao. Para escrever:  node scripts/corrigir-fases-da-lua.js --aplicar');
    return;
  }
  if (!mudancas.length) { console.log('Nada a fazer.'); return; }

  const escrever = ({ alvo }) => fetch(`${BASE}/questions/${alvo.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      optionA: alvo.optionA, optionB: alvo.optionB, optionC: alvo.optionC, optionD: alvo.optionD,
    }),
  });

  const primeira = await escrever(mudancas[0]);
  if (primeira.status === 401) {
    console.error('\nTOKEN RECUSADO (401). Nada foi escrito.');
    process.exit(1);
  }
  if (!primeira.ok) { console.error(`\nfalha na primeira escrita: ${primeira.status}`); process.exit(1); }
  console.log(`aplicado: ${mudancas[0].alvo.loc} id ${mudancas[0].alvo.id}`);

  for (const m of mudancas.slice(1)) {
    const r = await escrever(m);
    if (!r.ok) {
      console.error(`FALHA em ${m.alvo.loc} id ${m.alvo.id}: ${r.status}`);
      console.error('As anteriores JA foram escritas — rode de novo para completar.');
      process.exit(1);
    }
    console.log(`aplicado: ${m.alvo.loc} id ${m.alvo.id}`);
    await new Promise((res) => setTimeout(res, 60));
  }
  console.log('\nPronto. Rode sem --aplicar para conferir que nao sobrou diferenca.');
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
