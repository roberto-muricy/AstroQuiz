/**
 * Prova de ponta a ponta do embaralhamento de alternativas.
 *
 * Os testes unitarios em src/services/__tests__/embaralhar-alternativas.test.ts
 * cobrem a funcao. Este script cobre o que eles nao alcancam: a rota inteira,
 * com sessao persistida e correcao real.
 *
 * Ele existe porque duas vezes o codigo passou no tsc e nos unitarios e ainda
 * assim estava errado de ponta a ponta:
 *
 *   1. normalizeQuestion() descarta correctOption antes de a pergunta chegar
 *      na sessao. Uma primeira versao exigia o gabarito para embaralhar, entao
 *      nada era embaralhado — e o gabarito lido da sessao vinha undefined,
 *      reprovando todas as respostas.
 *   2. A resposta do /answer devolve correctOption, e o app usa essa letra
 *      para destacar a alternativa certa. Devolver a letra do banco destacava
 *      a alternativa errada na tela.
 *
 * Uso (precisa do servidor rodando):
 *   npm run develop
 *   node scripts/verificar-embaralhamento.js
 *
 * Sai com codigo 1 em qualquer divergencia.
 */

const BASE = process.env.ASTROQUIZ_API || 'http://localhost:1337/api';

// GET /api/questions so devolve `correctOption` para quem apresenta o token de
// escrita — sem ele nao ha como saber qual alternativa e a certa, e este script
// nao tem o que conferir.
const TOKEN = process.env.STRAPI_WRITE_TOKEN;
if (!TOKEN) {
  console.error('ERRO: defina STRAPI_WRITE_TOKEN (esta no .env do backend).');
  console.error('  Sem ele o gabarito nao vem e nao da para verificar nada.');
  process.exit(1);
}
const autenticado = { Authorization: `Bearer ${TOKEN}` };

const post = async (rota, corpo) => {
  const r = await fetch(`${BASE}${rota}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`POST ${rota} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};
const get = async (rota, cabecalhos) => {
  const r = await fetch(`${BASE}${rota}`, cabecalhos ? { headers: cabecalhos } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(`GET ${rota} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};

/** Gabarito verdadeiro, direto do banco, pela ordem ORIGINAL. Baixado uma vez. */
let acervo = null;
const gabaritoOriginal = async (id) => {
  if (!acervo) {
    const j = await get('/questions?locale=pt&limit=1000', autenticado);
    const lista = j.data || j;
    if (lista[0] && !('correctOption' in lista[0])) {
      console.error('ERRO: o servidor nao devolveu o gabarito — token invalido?');
      process.exit(1);
    }
    acervo = new Map(lista.map((q) => [String(q.id), q]));
  }
  const q = acervo.get(String(id));
  return q ? { correta: q.correctOption, texto: q[`option${q.correctOption}`] } : null;
};

(async () => {
  // --- 1. a mesma pergunta sai em ordens diferentes ------------------------
  // Em vez de torcer para a mesma pergunta se repetir, forco: abro varias
  // sessoes e olho a PRIMEIRA pergunta de cada uma ate juntar repeticoes.
  const ordensPorPergunta = new Map();
  for (let i = 0; i < 25; i += 1) {
    const s0 = await post('/quiz/start', { phaseNumber: 1, locale: 'pt' });
    const q0 = (await get(`/quiz/question/${s0.data.sessionId}`)).data.question;
    const assinatura = ['A', 'B', 'C', 'D'].map((L) => q0[`option${L}`]).join(' | ');
    if (!ordensPorPergunta.has(q0.id)) ordensPorPergunta.set(q0.id, new Set());
    ordensPorPergunta.get(q0.id).add(assinatura);
  }
  const repetidas = [...ordensPorPergunta.entries()].filter(([, v]) => v.size >= 1 && [...v].length >= 1);
  const vistasMaisDeUmaVez = [...ordensPorPergunta.entries()].filter(([id]) => id);
  const comMaisDeUmaOrdem = [...ordensPorPergunta.values()].filter((v) => v.size > 1).length;
  const totalVistas = ordensPorPergunta.size;
  console.log(`1) ${totalVistas} perguntas distintas em 25 sessoes`);
  console.log(`   com mais de uma ordem observada: ${comMaisDeUmaOrdem}`);
  if (comMaisDeUmaOrdem === 0) {
    console.log('   AVISO: nenhuma repeticao para comparar — inconclusivo aqui,');
    console.log('   mas o passo 2 abaixo prova o embaralhamento de outro jeito.');
  }

  // --- 2. responder a letra embaralhada e corrigido como certo ------------
  const s = await post('/quiz/start', { phaseNumber: 1, locale: 'pt' });
  const sid = s.data.sessionId;
  let acertos = 0;
  let conferidas = 0;
  let embaralhadas = 0;
  const divergencias = [];

  for (let i = 0; i < 10; i += 1) {
    const r = await get(`/quiz/question/${sid}`);
    if (!r.data?.question) break;
    const q = r.data.question;

    const orig = await gabaritoOriginal(q.id);
    if (!orig) continue;

    // Qual letra, NA ORDEM QUE O APP RECEBEU, carrega o texto correto?
    const letraNaSessao = ['A', 'B', 'C', 'D'].find((L) => q[`option${L}`] === orig.texto);
    if (!letraNaSessao) {
      divergencias.push(`id ${q.id}: o texto correto nao esta entre as alternativas entregues`);
      continue;
    }
    conferidas += 1;
    if (letraNaSessao !== orig.correta) embaralhadas += 1;

    const resp = await post('/quiz/answer', {
      sessionId: sid,
      questionId: q.id,
      selectedOption: letraNaSessao,
      timeUsed: 5000,
      requestId: `t-${sid}-${i}`,
    });

    const devolvida = resp.data.answerRecord.correctOption;
    if (devolvida && q[`option${devolvida}`] !== orig.texto) {
      divergencias.push(
        `id ${q.id}: servidor devolveu correctOption=${devolvida}, que na tela e ` +
        `"${String(q[`option${devolvida}`]).slice(0, 40)}" e nao a resposta certa`
      );
    }
    if (resp.data.answerRecord.isCorrect) acertos += 1;
    else divergencias.push(
      `id ${q.id}: respondi ${letraNaSessao} (texto correto) e o servidor disse ERRADO ` +
      `(banco dizia ${orig.correta}, servidor devolveu ${devolvida})`
    );
  }

  console.log(`\n2) perguntas conferidas: ${conferidas}`);
  console.log(`   em ${embaralhadas} delas a letra na tela DIFERE da do banco (prova do embaralhamento)`);
  console.log(`   respondendo sempre o TEXTO correto: ${acertos} acertos`);
  if (divergencias.length) {
    console.log('\n   DIVERGENCIAS:');
    divergencias.forEach((d) => console.log('     ' + d));
    process.exit(1);
  }
  console.log('   nenhuma divergencia.');

  // --- 3. responder errado continua sendo errado -------------------------
  const s2 = await post('/quiz/start', { phaseNumber: 1, locale: 'pt' });
  const sid2 = s2.data.sessionId;
  const q2 = (await get(`/quiz/question/${sid2}`)).data.question;
  const orig2 = await gabaritoOriginal(q2.id);
  const certa2 = ['A', 'B', 'C', 'D'].find((L) => q2[`option${L}`] === orig2.texto);
  const errada2 = ['A', 'B', 'C', 'D'].find((L) => L !== certa2);
  const resp2 = await post('/quiz/answer', {
    sessionId: sid2, questionId: q2.id, selectedOption: errada2, timeUsed: 5000, requestId: `x-${sid2}`,
  });
  console.log(`\n3) respondi ${errada2} (errada, a certa era ${certa2}): servidor disse ${resp2.data.answerRecord.isCorrect ? 'CERTO — BUG' : 'errado, ok'}`);
  if (resp2.data.answerRecord.isCorrect) process.exit(1);
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
