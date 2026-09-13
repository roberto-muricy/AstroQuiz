/**
 * Rotas do quiz de ponta a ponta, contra um SQLite em memoria.
 *
 * Cada caso reproduz uma trapaca que funcionava em producao antes deste
 * endurecimento, ou um comportamento do app que precisa continuar igual para as
 * versoes que ja estao nas lojas.
 */

jest.mock('../../services/firebase-auth', () => ({
  isFirebaseConfigured: () => false,
  verifyFirebaseToken: async () => null,
  extractBearerToken: () => null,
}));

import knexFactory from 'knex';
import { createQuizRoutes } from '../quiz-routes';
import {
  ensureQuizSessionTable,
  createSession,
  saveQuizSession,
  quizSessions,
} from '../../services/quiz-session';
import { garantirTabelaDeResultados, TABELA_DE_RESULTADOS } from '../../services/phase-results';

// "Banco" de perguntas: 1 a 10 fazem parte das sessoes de teste; 999 nao.
const BANCO: Record<number, any> = { 999: { id: 999, correctOption: 'C', level: 5, explanation: 'fora' } };
for (let id = 1; id <= 10; id++) {
  BANCO[id] = { id, correctOption: 'A', level: 1, explanation: `explicacao ${id}` };
}

let knex: any;
let strapi: any;
let rotas: any[];
let contador = 0;

beforeEach(async () => {
  knex = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  strapi = {
    db: {
      connection: knex,
      query: () => ({ findOne: async ({ where }: any) => BANCO[Number(where.id)] || null }),
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    service: () => null,
  };
  await ensureQuizSessionTable(strapi);
  await garantirTabelaDeResultados(knex);
  rotas = createQuizRoutes(strapi);
  quizSessions.clear();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await knex.destroy();
});

function ctxFalso(entrada: { params?: any; body?: any; user?: any }) {
  const ctx: any = {
    params: entrada.params || {},
    query: {},
    request: { body: entrada.body || {}, headers: {}, ip: '10.0.0.1', path: '' },
    state: entrada.user ? { user: entrada.user } : {},
    status: 200,
    body: undefined,
  };
  const erros: Record<string, number> = {
    badRequest: 400,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    internalServerError: 500,
    serviceUnavailable: 503,
  };
  for (const [nome, status] of Object.entries(erros)) {
    ctx[nome] = (message: string) => {
      ctx.status = status;
      ctx.body = { data: null, error: { status, message } };
    };
  }
  return ctx;
}

async function chamar(method: string, path: string, entrada: { params?: any; body?: any; user?: any } = {}) {
  const rota = rotas.find((r) => r.method === method && r.path === path);
  const pilha = Array.isArray(rota.handler) ? rota.handler : [rota.handler];
  const ctx = ctxFalso(entrada);
  const executar = async (i: number): Promise<void> => {
    if (i < pilha.length) await pilha[i](ctx, () => executar(i + 1));
  };
  await executar(0);
  return ctx;
}

/** `null` cria uma sessao de convidado (undefined cairia no valor padrao). */
async function novaSessao(firebaseUid: string | null = 'uid_de_teste_123') {
  contador++;
  const sessionId = `quiz_1757851200000_sessaoDeTeste${String(contador).padStart(3, '0')}`;
  const session = createSession({
    sessionId,
    phaseNumber: 1,
    locale: 'pt',
    firebaseUid: firebaseUid ?? undefined,
    questions: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      level: 1,
      explanation: `explicacao ${i + 1}`,
    })),
  });
  quizSessions.set(sessionId, session);
  await saveQuizSession(strapi, session);
  return sessionId;
}

const buscarPergunta = (sessionId: string) =>
  chamar('GET', '/api/quiz/question/:sessionId', { params: { sessionId } });
const responder = (body: any) => chamar('POST', '/api/quiz/answer', { body });
const finalizar = (sessionId: string, user?: any) =>
  chamar('POST', '/api/quiz/finish/:sessionId', { params: { sessionId }, user });
const resultados = () => knex(TABELA_DE_RESULTADOS).select('*');

/** Busca a pergunta atual e responde, como o QuizScreen faz. */
async function responderAtual(sessionId: string, extra: any = {}) {
  const pergunta = await buscarPergunta(sessionId);
  expect(pergunta.status).toBe(200);
  return responder({
    sessionId,
    selectedOption: 'A',
    timeUsed: 5000,
    questionId: pergunta.body.data.question.id,
    ...extra,
  });
}

async function jogarFase(sessionId: string) {
  for (let i = 0; i < 10; i++) {
    const resposta = await responderAtual(sessionId, { requestId: `ans_teste_${i}` });
    expect(resposta.status).toBe(200);
  }
}

describe('fluxo normal do app', () => {
  it('uma fase jogada como o app joga termina e grava um resultado', async () => {
    const id = await novaSessao();
    await jogarFase(id);

    const session = quizSessions.get(id);
    expect(session.status).toBe('completed');
    expect(session.correctAnswers).toBe(10);

    const linhas = await resultados();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toEqual(expect.objectContaining({ session_id: id, score: session.score }));
    expect(Boolean(linhas[0].eligible)).toBe(true);
    expect(Boolean(linhas[0].passed)).toBe(true);
  });

  it('a resposta mantem o formato que o app le', async () => {
    const id = await novaSessao();
    const resposta = await responderAtual(id);

    expect(resposta.body.success).toBe(true);
    expect(resposta.body.data.answerRecord).toEqual(
      expect.objectContaining({ isCorrect: true, correctOption: 'A', explanation: 'explicacao 1' })
    );
    expect(resposta.body.data.scoreResult.totalPoints).toBe(20);
    expect(resposta.body.data.sessionStatus).toEqual(
      expect.objectContaining({ score: 20, streakCount: 1, totalQuestions: 10, isPhaseComplete: false })
    );
  });

  it('partida de convidado fica guardada sem uid e fora do ranking', async () => {
    const id = await novaSessao(null);
    await jogarFase(id);

    const [linha] = await resultados();
    expect(linha.firebase_uid).toBeNull();
    expect(Boolean(linha.eligible)).toBe(false);
  });

  it('quem responde rapido de verdade continua ganhando o bonus', async () => {
    let relogio = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => relogio);
    const id = await novaSessao();

    await responderAtual(id, { timeUsed: 1000 });
    const pergunta = await buscarPergunta(id);
    relogio += 6000;
    const resposta = await responder({
      sessionId: id,
      selectedOption: 'A',
      timeUsed: 5500,
      questionId: pergunta.body.data.question.id,
    });

    expect(resposta.body.data.scoreResult.speedMultiplier).toBe(2);
  });
});

describe('trapacas que deixaram de funcionar', () => {
  it('pergunta de fora da sessao nao e corrigida nem revela o gabarito', async () => {
    const id = await novaSessao();
    await buscarPergunta(id);

    const resposta = await responder({ sessionId: id, selectedOption: 'C', timeUsed: 1000, questionId: 999 });

    expect(resposta.status).toBe(409);
    expect(JSON.stringify(resposta.body)).not.toContain('correctOption');
    expect(quizSessions.get(id).currentQuestionIndex).toBe(0);
  });

  it('respostas depois da ultima pergunta nao somam pontos', async () => {
    const id = await novaSessao();
    await jogarFase(id);
    const pontos = quizSessions.get(id).score;

    const novas = await Promise.all([
      responder({ sessionId: id, selectedOption: 'A', timeUsed: 0 }),
      responder({ sessionId: id, selectedOption: 'A', timeUsed: 0, questionId: 999 }),
    ]);
    expect(novas.map((r) => r.status)).toEqual([409, 409]);

    // Repetir uma pergunta ja respondida devolve o corpo guardado, sem somar.
    const repetida = await responder({ sessionId: id, selectedOption: 'A', timeUsed: 0, questionId: 3 });
    expect(repetida.status).toBe(200);

    expect(quizSessions.get(id).score).toBe(pontos);
    expect(quizSessions.get(id).answers).toHaveLength(10);
  });

  it('sessao desconhecida devolve 404 e nao e criada', async () => {
    const sessionId = 'quiz_1757851200000_naoExisteNaoExiste';
    const resposta = await responder({ sessionId, selectedOption: 'A', timeUsed: 1000, questionId: 1 });

    expect(resposta.status).toBe(404);
    expect(quizSessions.has(sessionId)).toBe(false);
    expect(await knex('quiz_sessions').where({ session_id: sessionId })).toHaveLength(0);
  });

  it('timeUsed zero nao vale quando o servidor viu a pergunta ha 30 segundos', async () => {
    let relogio = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => relogio);
    const id = await novaSessao();

    await responderAtual(id, { timeUsed: 1000 });
    relogio += 2000;
    const pergunta = await buscarPergunta(id);
    relogio += 30000;
    const resposta = await responder({
      sessionId: id,
      selectedOption: 'A',
      timeUsed: 0,
      questionId: pergunta.body.data.question.id,
    });

    // 30 s menos 4 s de folga = 26 s: fora de todas as faixas de bonus.
    expect(resposta.body.data.scoreResult.speedMultiplier).toBe(1);
    expect(resposta.body.data.scoreResult.totalPoints).toBe(10);
  });
});

describe('repeticoes', () => {
  it('o toque e o tempo esgotado chegando juntos contam uma vez so', async () => {
    const id = await novaSessao();
    const pergunta = await buscarPergunta(id);
    const questionId = pergunta.body.data.question.id;

    const [toque, tempoEsgotado] = await Promise.all([
      responder({ sessionId: id, selectedOption: 'A', timeUsed: 4000, questionId, requestId: 'ans_toque' }),
      responder({ sessionId: id, timeUsed: 45000, questionId, isTimeout: true, requestId: 'ans_tempo' }),
    ]);

    expect(toque.status).toBe(200);
    expect(tempoEsgotado.body).toEqual(toque.body);
    expect(quizSessions.get(id).answers).toHaveLength(1);
    expect(quizSessions.get(id).currentQuestionIndex).toBe(1);
  });

  it('repetir sem requestId (builds anteriores a 03/09) devolve o mesmo corpo sem contar de novo', async () => {
    const id = await novaSessao();
    const pergunta = await buscarPergunta(id);
    const corpo = { sessionId: id, selectedOption: 'A', timeUsed: 4000, questionId: pergunta.body.data.question.id };

    const primeira = await responder(corpo);
    const segunda = await responder(corpo);

    expect(segunda.body).toEqual(primeira.body);
    expect(quizSessions.get(id).score).toBe(primeira.body.data.sessionStatus.score);
  });

  it('tempo esgotado sem questionId (1.1.0) vale para a pergunta atual', async () => {
    const id = await novaSessao();
    await buscarPergunta(id);

    const resposta = await responder({ sessionId: id, timeUsed: 45000, isTimeout: true });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.answerRecord.isCorrect).toBe(false);
    expect(quizSessions.get(id).answers[0].questionId).toBe(1);
  });
});

describe('/api/quiz/finish/:sessionId', () => {
  it('repetido devolve o mesmo resultado e grava uma linha so', async () => {
    const id = await novaSessao();
    await jogarFase(id);

    const primeiro = await finalizar(id);
    const segundo = await finalizar(id);

    expect(primeiro.status).toBe(200);
    expect(primeiro.body.data).toEqual(
      expect.objectContaining({ passed: true, accuracy: 100, nextPhaseUnlocked: true })
    );
    expect(segundo.body.data.accuracy).toBe(100);
    expect(segundo.body.data.completedAt).toBe(primeiro.body.data.completedAt);
    expect(await resultados()).toHaveLength(1);
  });

  it('devolve o que a tela de resultado le, sem dados internos da sessao', async () => {
    const id = await novaSessao();
    await jogarFase(id);

    const { body } = await finalizar(id);

    for (const campo of [
      'accuracy',
      'correctAnswers',
      'finalScore',
      'maxStreak',
      'passed',
      'phaseNumber',
      'score',
      'totalQuestions',
      'totalTime',
    ]) {
      expect(body.data).toHaveProperty(campo);
    }
    expect(body.data).not.toHaveProperty('questions');
    expect(body.data).not.toHaveProperty('firebaseUid');
    expect(body.data).not.toHaveProperty('servedAt');
    expect(body.data.answers[0]).not.toHaveProperty('resposta');
  });

  it('antes da ultima pergunta encerra como abandonada, sem resultado', async () => {
    const id = await novaSessao();
    await responderAtual(id);

    const { body } = await finalizar(id);
    expect(body.data.status).toBe('abandoned');
    expect(await resultados()).toHaveLength(0);

    const depois = await responder({ sessionId: id, selectedOption: 'A', timeUsed: 1000, questionId: 2 });
    expect(depois.status).toBe(409);
  });

  it('recusa um token valido de outra pessoa', async () => {
    const id = await novaSessao('uid_de_teste_123');
    await jogarFase(id);

    const resposta = await finalizar(id, { firebaseUid: 'outra_pessoa_456', role: 'user' });
    expect(resposta.status).toBe(403);
  });

  it('grava o resultado se a gravacao na ultima resposta tiver falhado', async () => {
    const id = await novaSessao();
    await jogarFase(id);
    await knex(TABELA_DE_RESULTADOS).del();

    await finalizar(id);
    expect(await resultados()).toHaveLength(1);
  });
});

describe('GET /api/quiz/session/:sessionId', () => {
  it('nao expoe explicacoes, dono, instantes de entrega nem corpos guardados', async () => {
    const id = await novaSessao();
    await responderAtual(id, { requestId: 'ans_um' });

    const { body } = await chamar('GET', '/api/quiz/session/:sessionId', { params: { sessionId: id } });

    expect(body.data.questions).toHaveLength(10);
    expect(body.data.questions[0]).not.toHaveProperty('explanation');
    expect(body.data).not.toHaveProperty('firebaseUid');
    expect(body.data).not.toHaveProperty('servedAt');
    expect(body.data.answers[0]).not.toHaveProperty('resposta');
  });
});
