#!/usr/bin/env node
/**
 * Reescreve a pergunta q_new_049 (astronomia x astrologia) nos quatro idiomas.
 *
 * Como estava:
 *
 *   "Qual destas afirmacoes sobre astronomia e astrologia esta INCORRETA?"
 *   B) "Nenhuma. Sao apenas formas diferentes de escrever a mesma ciencia"  <- correta
 *
 * Tres problemas somados, numa pergunta de nivel 1 — que e onde entra quem
 * acabou de instalar o jogo:
 *
 *   1. A pergunta e negativa. Quem le rapido responde a pergunta positiva.
 *   2. A resposta certa e a alternativa que afirma "nenhuma esta incorreta".
 *      Para acertar, e preciso perceber que essa afirmacao e ela propria a
 *      incorreta. Auto-referencia num nivel 1.
 *   3. As alternativas tinham ate 150 caracteres de piada para dizer a mesma
 *      coisa tres vezes. Em 45 segundos, isso e volume, nao conteudo.
 *
 * A correta passa de B para D de proposito. As alternativas nao sao
 * embaralhadas em lugar nenhum — o backend le option_a..option_d e devolve na
 * ordem — entao a posicao e um padrao que quem joga muito aprende. No acervo
 * pt, B concentra 272 das 705 respostas (39%) e D so 64 (9%).
 *
 * Uso:
 *   node scripts/simplificar-pergunta-astrologia.js              # simula
 *   node scripts/simplificar-pergunta-astrologia.js --aplicar    # pergunta o token e grava
 */

const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';
const APLICAR = process.argv.includes('--aplicar');
const BASE_ID = 'q_new_049';

const TEXTOS = {
  pt: {
    question: 'Qual é a diferença entre astronomia e astrologia?',
    optionA: 'Nenhuma: são dois nomes para a mesma ciência',
    optionB: 'A astronomia estuda planetas; a astrologia estuda estrelas',
    optionC: 'A astrologia é mais antiga, por isso é mais precisa',
    optionD: 'A astronomia é ciência; a astrologia não é',
    correctOption: 'D',
    explanation:
      'A astronomia é ciência: observa, mede e testa suas previsões. A astrologia afirma que a posição dos astros define a personalidade e o futuro — algo que nunca se confirmou em teste controlado.',
  },
  en: {
    question: 'What is the difference between astronomy and astrology?',
    optionA: 'None — they are two names for the same science',
    optionB: 'Astronomy studies planets; astrology studies stars',
    optionC: 'Astrology is older, so it is more accurate',
    optionD: 'Astronomy is a science; astrology is not',
    correctOption: 'D',
    explanation:
      'Astronomy is a science: it observes, measures, and tests its predictions. Astrology claims the position of the stars shapes personality and the future — something no controlled test has ever confirmed.',
  },
  es: {
    question: '¿Cuál es la diferencia entre la astronomía y la astrología?',
    optionA: 'Ninguna: son dos nombres para la misma ciencia',
    optionB: 'La astronomía estudia planetas; la astrología estudia estrellas',
    optionC: 'La astrología es más antigua, por eso es más precisa',
    optionD: 'La astronomía es una ciencia; la astrología no',
    correctOption: 'D',
    explanation:
      'La astronomía es ciencia: observa, mide y pone a prueba sus predicciones. La astrología afirma que la posición de los astros define la personalidad y el futuro, algo que nunca se ha confirmado en una prueba controlada.',
  },
  fr: {
    question: "Quelle est la différence entre l'astronomie et l'astrologie ?",
    optionA: 'Aucune : ce sont deux noms pour la même science',
    optionB: "L'astronomie étudie les planètes ; l'astrologie étudie les étoiles",
    optionC: "L'astrologie est plus ancienne, donc plus précise",
    optionD: "L'astronomie est une science ; l'astrologie ne l'est pas",
    correctOption: 'D',
    explanation:
      "L'astronomie est une science : elle observe, mesure et teste ses prédictions. L'astrologie affirme que la position des astres détermine la personnalité et l'avenir, ce qu'aucun test contrôlé n'a jamais confirmé.",
  },
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
      if (ch === '') {
        process.stdout.write('\n');
        process.exit(130);
      }
      if (ch === '') {
        buffer = buffer.slice(0, -1);
        return;
      }
      buffer += ch;
    };
    entrada.on('data', aoTeclar);
  });
}

(async () => {
  console.log(APLICAR ? 'MODO APLICAR — vai escrever no servidor.\n' : 'MODO SIMULACAO — nada sera escrito.\n');

  const idiomas = ['pt', 'en', 'es', 'fr'];
  const acervos = await Promise.all(idiomas.map(buscar));

  const plano = [];
  for (let i = 0; i < idiomas.length; i += 1) {
    const loc = idiomas[i];
    const q = acervos[i].find((x) => x.baseId === BASE_ID);
    if (!q) {
      console.error(`ERRO: ${BASE_ID} nao encontrada em ${loc}. Nada foi escrito.`);
      process.exit(1);
    }
    plano.push({ loc, id: q.id, antes: q, depois: TEXTOS[loc] });
  }

  for (const p of plano) {
    console.log(`--- ${p.loc} (id ${p.id}) ---`);
    console.log(`  antes : ${p.antes.question}`);
    console.log(`          correta ${p.antes.correctOption}) ${p.antes[`option${p.antes.correctOption}`]}`);
    console.log(`  depois: ${p.depois.question}`);
    console.log(`          correta ${p.depois.correctOption}) ${p.depois[`option${p.depois.correctOption}`]}`);
    const maiorAntes = Math.max(...'ABCD'.split('').map((k) => (p.antes[`option${k}`] || '').length));
    const maiorDepois = Math.max(...'ABCD'.split('').map((k) => p.depois[`option${k}`].length));
    console.log(`  maior alternativa: ${maiorAntes} -> ${maiorDepois} caracteres\n`);
  }

  if (!APLICAR) {
    console.log('Simulacao. Para escrever:  node scripts/simplificar-pergunta-astrologia.js --aplicar');
    return;
  }

  const token = process.env.STRAPI_WRITE_TOKEN || (await perguntarToken());
  if (!token) {
    console.error('\nERRO: sem token.');
    process.exit(1);
  }
  console.log(`\ntoken recebido: ${token.length} caracteres`);

  const escrever = (p) =>
    fetch(`${BASE}/questions/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(p.depois),
    });

  // A primeira escrita valida o token antes de tocar nas outras tres.
  const rt = await escrever(plano[0]);
  if (rt.status === 401) {
    console.error('\nTOKEN RECUSADO (401). Nada foi escrito.');
    console.error('  E o valor de STRAPI_WRITE_TOKEN nas Variables do Railway.');
    process.exit(1);
  }
  if (!rt.ok) {
    console.error(`\nfalha na primeira escrita (${plano[0].loc}): ${rt.status}`);
    process.exit(1);
  }
  console.log(`aplicado: ${plano[0].loc}`);

  for (const p of plano.slice(1)) {
    const r = await escrever(p);
    if (!r.ok) {
      console.error(`FALHA em ${p.loc} (${p.id}): ${r.status}`);
      console.error('Os idiomas anteriores JA foram escritos — rode de novo para completar.');
      process.exit(1);
    }
    console.log(`aplicado: ${p.loc}`);
    await new Promise((res) => setTimeout(res, 60));
  }
  console.log('\nOs quatro idiomas foram atualizados.');
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
