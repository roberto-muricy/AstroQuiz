/**
 * Regras de resposta do quiz
 *
 * A pontuacao do servidor passa a alimentar o ranking. Varios destes testes
 * correspondem a um jeito de inflar pontos que funcionava ate aqui.
 */

import {
  decidirResposta,
  aplicarResposta,
  tempoEfetivo,
  marcarEntrega,
  encerrarSessao,
  sessaoParaCliente,
  corpoDeRegistroAntigo,
  pontuacaoMaximaDasPerguntas,
  pontuacaoMaximaDaFase,
  FOLGA_DE_TEMPO_MS,
  FOLGA_DA_CONTAGEM_MS,
} from '../quiz-answer-rules';
import { createSession } from '../quiz-session';
import { calculatePoints, getDifficultyDistribution, SCORING } from '../quiz-logic';

const AGORA = Date.UTC(2026, 8, 14, 12, 0, 0);

function sessaoDeTeste(niveis: number[] = Array(10).fill(1), ids?: number[]) {
  return createSession({
    sessionId: 'quiz_1757851200000_testeTesteTeste1',
    phaseNumber: 1,
    locale: 'pt',
    firebaseUid: 'uid_de_teste_123',
    questions: niveis.map((level, i) => ({
      id: ids ? ids[i] : 100 + i,
      level,
      explanation: `explicacao ${i}`,
    })),
  });
}

/** Responde a pergunta atual como a rota faria, com o tempo ja medido. */
function responder(
  session: any,
  opcoes: { certo?: boolean; tempoMs?: number; questionId?: any; requestId?: string } = {}
) {
  const decisao = decidirResposta(session, {
    questionId: opcoes.questionId,
    requestId: opcoes.requestId,
  });
  if (decisao.tipo !== 'atual') return { decisao, corpo: undefined, completouAgora: false };

  const certo = opcoes.certo !== false;
  const tempoMs = opcoes.tempoMs ?? 5000;
  const { corpo, completouAgora } = aplicarResposta(session, {
    questionId: decisao.pergunta.id,
    indice: decisao.indice,
    selectedOption: 'A',
    correctOption: certo ? 'A' : 'B',
    isCorrect: certo,
    isTimeout: false,
    isSkipped: false,
    level: decisao.pergunta.level,
    requestId: opcoes.requestId,
    explanation: decisao.pergunta.explanation,
    tempo: { efetivo: tempoMs, cliente: tempoMs, servidor: tempoMs + 300 },
    agora: AGORA,
  });
  return { decisao, corpo, completouAgora };
}

describe('decidirResposta', () => {
  it('aceita a pergunta atual', () => {
    expect(decidirResposta(sessaoDeTeste(), { questionId: 100 })).toEqual(
      expect.objectContaining({ tipo: 'atual', indice: 0 })
    );
  });

  it('sem questionId (tempo esgotado em versoes antigas) vale a pergunta atual', () => {
    const decisao = decidirResposta(sessaoDeTeste(), {});
    expect(decisao.tipo).toBe('atual');
    expect((decisao as any).pergunta.id).toBe(100);
  });

  it('recusa pergunta que nao e a atual — era o caminho para ler o gabarito do banco', () => {
    const s = sessaoDeTeste();
    expect(decidirResposta(s, { questionId: 999 }).tipo).toBe('fora-de-ordem');
    expect(decidirResposta(s, { questionId: 101 }).tipo).toBe('fora-de-ordem');
  });

  it('reconhece a repeticao pelo requestId', () => {
    const s = sessaoDeTeste();
    responder(s, { requestId: 'ans_1' });
    const decisao = decidirResposta(s, { questionId: 101, requestId: 'ans_1' });
    expect(decisao.tipo).toBe('repetida');
    expect((decisao as any).registro.questionId).toBe(100);
  });

  it('reconhece a repeticao pela pergunta, sem requestId (builds anteriores a 03/09)', () => {
    const s = sessaoDeTeste();
    responder(s);
    expect(decidirResposta(s, { questionId: 100 }).tipo).toBe('repetida');
    expect(s.currentQuestionIndex).toBe(1);
  });

  it('depois da ultima pergunta nada novo entra, mas repeticoes continuam respondidas', () => {
    const s = sessaoDeTeste();
    for (let i = 0; i < 10; i++) responder(s);
    expect(decidirResposta(s, {}).tipo).toBe('encerrada');
    expect(decidirResposta(s, { questionId: 555 }).tipo).toBe('encerrada');
    expect(decidirResposta(s, { questionId: 109 }).tipo).toBe('repetida');
  });

  it('sessao abandonada nao aceita respostas', () => {
    const s = sessaoDeTeste();
    s.status = 'abandoned';
    expect(decidirResposta(s, { questionId: 100 }).tipo).toBe('encerrada');
  });

  it('a mesma pergunta aparecendo duas vezes na sessao conta na sua vez', () => {
    const s = sessaoDeTeste([1, 1, 1], [7, 7, 8]);
    responder(s, { questionId: 7 });
    expect(decidirResposta(s, { questionId: 7 })).toEqual(
      expect.objectContaining({ tipo: 'atual', indice: 1 })
    );
  });
});

describe('aplicarResposta', () => {
  it('bonus de perfeicao entra uma unica vez, e a fase perfeita chega exatamente ao teto', () => {
    const s = sessaoDeTeste();
    const completou: boolean[] = [];
    for (let i = 0; i < 10; i++) completou.push(responder(s, { tempoMs: 0 }).completouAgora);

    expect(completou).toEqual([...Array(9).fill(false), true]);
    expect(s.score).toBe(690);
    expect(s.score).toBe(pontuacaoMaximaDaFase(1));

    // Antes, cada resposta depois da ultima somava de novo 50% da pontuacao.
    for (let i = 0; i < 5; i++) {
      expect(responder(s, { tempoMs: 0, certo: false }).decisao.tipo).toBe('encerrada');
    }
    expect(s.score).toBe(690);
    expect(s.answers).toHaveLength(10);
  });

  it('fase com menos de 10 perguntas termina na ultima que existe', () => {
    const s = sessaoDeTeste([1, 1, 1]);
    responder(s);
    responder(s);
    const { corpo, completouAgora } = responder(s);

    expect(completouAgora).toBe(true);
    expect(s.status).toBe('completed');
    expect(corpo.data.sessionStatus).toEqual(
      expect.objectContaining({ totalQuestions: 3, isPhaseComplete: true })
    );
  });

  it('erro zera a sequencia e nao pontua', () => {
    const s = sessaoDeTeste();
    responder(s);
    responder(s);
    const { corpo } = responder(s, { certo: false });

    expect(s.streakCount).toBe(0);
    expect(s.maxStreak).toBe(2);
    expect(corpo.data.scoreResult.totalPoints).toBe(0);
    expect(s.incorrectAnswers).toBe(1);
  });

  it('guarda o corpo da resposta sempre, com ou sem requestId', () => {
    const s = sessaoDeTeste();
    const { corpo } = responder(s);
    expect(s.answers[0].resposta).toBe(corpo);
  });

  it('o corpo mantem o formato que o app le', () => {
    const { corpo } = responder(sessaoDeTeste(), { tempoMs: 5000 });
    expect(corpo.success).toBe(true);
    expect(corpo.data.answerRecord).toEqual(
      expect.objectContaining({ isCorrect: true, correctOption: 'A', points: 20, level: 1 })
    );
    expect(corpo.data.scoreResult).toEqual(
      expect.objectContaining({ basePoints: 10, speedMultiplier: 2, totalPoints: 20 })
    );
    expect(corpo.data.sessionStatus).toEqual(
      expect.objectContaining({ score: 20, streakCount: 1, isPhaseComplete: false })
    );
  });

  it('registra os tres tempos da resposta', () => {
    const s = sessaoDeTeste();
    responder(s, { tempoMs: 6000 });
    expect(s.answers[0]).toEqual(
      expect.objectContaining({ timeUsed: 6000, timeUsedEffective: 6000, timeUsedServer: 6300 })
    );
  });
});

describe('tempoEfetivo', () => {
  it('quem joga honestamente fica com o tempo do app', () => {
    expect(tempoEfetivo({ clienteMs: 8000, entregueEm: AGORA - 9500, agora: AGORA, indice: 1 })).toEqual({
      efetivo: 8000,
      cliente: 8000,
      servidor: 9500,
    });
  });

  it('app em segundo plano: vale o relogio do servidor, menos a folga', () => {
    const tempo = tempoEfetivo({ clienteMs: 8000, entregueEm: AGORA - 30000, agora: AGORA, indice: 1 });
    expect(tempo.efetivo).toBe(30000 - FOLGA_DE_TEMPO_MS);
  });

  it('a primeira pergunta desconta tambem a contagem regressiva', () => {
    const entrada = { clienteMs: 0, entregueEm: AGORA - 10000, agora: AGORA };
    expect(tempoEfetivo({ ...entrada, indice: 0 }).efetivo).toBe(
      10000 - FOLGA_DE_TEMPO_MS - FOLGA_DA_CONTAGEM_MS
    );
    expect(tempoEfetivo({ ...entrada, indice: 1 }).efetivo).toBe(10000 - FOLGA_DE_TEMPO_MS);
  });

  it('sem instante de entrega (sessao anterior a esta regra) vale o app', () => {
    expect(tempoEfetivo({ clienteMs: 7000, agora: AGORA, indice: 3 })).toEqual({
      efetivo: 7000,
      cliente: 7000,
      servidor: null,
    });
  });

  it('fica entre zero e o tempo da pergunta', () => {
    expect(tempoEfetivo({ clienteMs: 90000, agora: AGORA, indice: 1 }).efetivo).toBe(
      SCORING.timePerQuestion
    );
    expect(
      tempoEfetivo({ clienteMs: 1000, entregueEm: AGORA - 500000, agora: AGORA, indice: 1 }).efetivo
    ).toBe(SCORING.timePerQuestion);
    expect(tempoEfetivo({ clienteMs: -5, agora: AGORA, indice: 1 }).efetivo).toBe(0);
  });

  it('timeUsed zero depois de 30 s nao ganha mais o 2x', () => {
    const { efetivo } = tempoEfetivo({ clienteMs: 0, entregueEm: AGORA - 30000, agora: AGORA, indice: 1 });
    expect(calculatePoints({ level: 1, timeUsed: efetivo, isCorrect: true }).speedMultiplier).toBe(1);
  });
});

describe('marcarEntrega', () => {
  it('so a primeira entrega de cada pergunta conta', () => {
    const s = sessaoDeTeste();
    expect(marcarEntrega(s, 0, AGORA)).toBe(true);
    expect(marcarEntrega(s, 0, AGORA + 20000)).toBe(false);
    expect(s.servedAt[0]).toBe(AGORA);
    expect(marcarEntrega(s, 1, AGORA + 30000)).toBe(true);
  });
});

describe('encerrarSessao', () => {
  it('fase largada no meio vira abandonada, e encerrar de novo nao muda nada', () => {
    const s = sessaoDeTeste();
    responder(s);

    const primeiro = encerrarSessao(s, AGORA);
    expect(primeiro.mudou).toBe(true);
    expect(s.status).toBe('abandoned');

    const segundo = encerrarSessao(s, AGORA + 60000);
    expect(segundo.mudou).toBe(false);
    expect(s.completedAt).toBe(new Date(AGORA).toISOString());
  });

  it('fase completa continua completa, com precisao e conquistas', () => {
    const s = sessaoDeTeste();
    for (let i = 0; i < 10; i++) responder(s, { tempoMs: 5000 });

    const resumo = encerrarSessao(s, AGORA);
    expect(s.status).toBe('completed');
    expect(resumo).toEqual(
      expect.objectContaining({ accuracy: 100, passed: true, averageTimePerQuestion: 5000 })
    );
    expect(resumo.achievements).toEqual(['perfect_score', 'streak_master', 'speed_demon']);
  });

  it('a precisao nunca passa de 100%, mesmo em sessoes com respostas a mais', () => {
    const s = sessaoDeTeste();
    for (let i = 0; i < 10; i++) responder(s);
    s.correctAnswers = 12; // o que a corrida antiga do tempo esgotado deixava
    expect(encerrarSessao(s, AGORA).accuracy).toBe(100);
  });

  it('aprova a partir de 60%', () => {
    const s = sessaoDeTeste();
    for (let i = 0; i < 10; i++) responder(s, { certo: i < 6 });
    expect(encerrarSessao(s, AGORA).passed).toBe(true);

    const reprovada = sessaoDeTeste();
    for (let i = 0; i < 10; i++) responder(reprovada, { certo: i < 5 });
    expect(encerrarSessao(reprovada, AGORA).passed).toBe(false);
  });
});

describe('sessaoParaCliente', () => {
  it('tira o dono, os instantes de entrega, os corpos guardados e as explicacoes', () => {
    const s = sessaoDeTeste();
    marcarEntrega(s, 0, AGORA);
    responder(s, { requestId: 'ans_1' });

    const comPerguntas = sessaoParaCliente(s, { comPerguntas: true });
    expect(comPerguntas).not.toHaveProperty('firebaseUid');
    expect(comPerguntas).not.toHaveProperty('servedAt');
    expect(comPerguntas.answers[0]).not.toHaveProperty('resposta');
    expect(comPerguntas.questions[0]).not.toHaveProperty('explanation');
    expect(comPerguntas.questions[0].id).toBe(100);

    const semPerguntas = sessaoParaCliente(s, { comPerguntas: false });
    expect(semPerguntas).not.toHaveProperty('questions');
    expect(semPerguntas.score).toBe(s.score);
  });

  it('nao altera a sessao original', () => {
    const s = sessaoDeTeste();
    responder(s);
    sessaoParaCliente(s, { comPerguntas: true });
    expect(s.firebaseUid).toBe('uid_de_teste_123');
    expect(s.answers[0].resposta).toBeDefined();
    expect(s.questions[0].explanation).toBe('explicacao 0');
  });
});

describe('corpoDeRegistroAntigo', () => {
  it('responde a repeticao de uma resposta gravada antes de os corpos serem guardados', () => {
    const s = sessaoDeTeste();
    responder(s);
    const { resposta, ...registroAntigo } = s.answers[0];

    const corpo = corpoDeRegistroAntigo(s, registroAntigo);
    expect(corpo.data.answerRecord.isCorrect).toBe(true);
    expect(corpo.data.scoreResult.totalPoints).toBe(registroAntigo.points);
    expect(corpo.data.sessionStatus.currentQuestionIndex).toBe(1);
  });
});

describe('teto de pontuacao', () => {
  it('tem o teto esperado em cada faixa da curva de dificuldade', () => {
    const faixas: Array<[number, number, number]> = [
      [1, 3, 690],
      [4, 6, 870],
      [7, 7, 960],
      [8, 10, 1080],
      [11, 18, 1110],
      [19, 22, 1350],
      [23, 27, 1410],
      [28, 32, 1440],
      [33, 37, 1560],
      [38, 42, 1620],
      [43, 47, 1560],
      [48, 50, 1740],
    ];
    for (const [de, ate, teto] of faixas) {
      for (let fase = de; fase <= ate; fase++) {
        expect(pontuacaoMaximaDaFase(fase)).toBe(teto);
      }
    }
  });

  it('soma 66.330 nas 50 fases', () => {
    let total = 0;
    for (let fase = 1; fase <= 50; fase++) total += pontuacaoMaximaDaFase(fase);
    expect(total).toBe(66330);
  });

  it('nenhuma sequencia de respostas passa do teto', () => {
    // Gerador fixo, para o teste nao variar entre execucoes.
    let semente = 20260914;
    const aleatorio = () => {
      semente = (semente * 1664525 + 1013904223) % 4294967296;
      return semente / 4294967296;
    };

    for (let rodada = 0; rodada < 300; rodada++) {
      const fase = 1 + Math.floor(aleatorio() * 50);
      const niveis = getDifficultyDistribution(fase).flatMap((d) => Array(d.count).fill(d.level));
      const s = sessaoDeTeste(niveis);

      // 12 tentativas: as duas ultimas testam respostas depois do fim.
      for (let i = 0; i < 12; i++) {
        responder(s, { certo: aleatorio() < 0.8, tempoMs: Math.floor(aleatorio() * 45000) });
      }
      expect(s.score).toBeLessThanOrEqual(pontuacaoMaximaDasPerguntas(niveis));
    }
  });
});
