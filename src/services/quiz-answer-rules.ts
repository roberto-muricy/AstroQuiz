/**
 * Regras de resposta do quiz
 *
 * Tudo aqui e puro — recebe a sessao e devolve decisoes — para ser testado sem
 * Strapi. As rotas em src/routes/quiz-routes.ts so buscam o gabarito no banco e
 * persistem o que estas funcoes decidem.
 *
 * Existe porque a pontuacao do servidor vai alimentar o ranking, e ate aqui ela
 * era facil de inflar sem jogar:
 *
 *   - o tempo gasto vinha so do app, entao `timeUsed: 0` dava sempre 2x;
 *   - qualquer `questionId` do banco era corrigido, mesmo fora da sessao, e a
 *     resposta devolvia o gabarito — dava para ler as perguntas uma a uma;
 *   - depois da 10a resposta, cada resposta extra marcava a fase como completa
 *     de novo e somava outra vez o bonus de perfeicao, sem teto.
 */

import {
  SCORING,
  getDifficultyDistribution,
  calculatePoints,
  calculateStreakBonus,
  calculatePerfectBonus,
} from './quiz-logic';

/**
 * Folga entre o relogio do servidor e o do app. Cobre latencia, as repeticoes
 * de rede do Android (ate 4, com espera crescente) e o envio automatico 0,7 s
 * depois do toque.
 */
export const FOLGA_DE_TEMPO_MS = 4000;

/**
 * A primeira pergunta e buscada quando a contagem regressiva de 3 s comeca, e
 * nao quando aparece na tela.
 */
export const FOLGA_DA_CONTAGEM_MS = 3000;

/** Acima disto, uma resposta certa marca o resultado com `server_time_gap`. */
export const DIFERENCA_SUSPEITA_MS = 15000;

export type DecisaoDeResposta =
  | { tipo: 'repetida'; registro: any }
  | { tipo: 'encerrada' }
  | { tipo: 'fora-de-ordem' }
  | { tipo: 'atual'; pergunta: any; indice: number };

export interface TempoDaResposta {
  /** O que vale para a pontuacao. */
  efetivo: number;
  /** O que o app mediu. */
  cliente: number;
  /** O que o servidor mediu, ou null se a pergunta foi entregue antes desta regra. */
  servidor: number | null;
}

export interface RespostaCorrigida {
  questionId: any;
  indice: number;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  isTimeout: boolean;
  isSkipped: boolean;
  level: number;
  requestId?: string;
  explanation?: string | null;
  tempo: TempoDaResposta;
  agora: number;
}

const limitar = (valor: number, minimo: number, maximo: number): number =>
  Math.min(maximo, Math.max(minimo, valor));

export function totalDePerguntas(session: any): number {
  const declarado = Number(session?.totalQuestions);
  if (Number.isInteger(declarado) && declarado > 0) return declarado;
  return Array.isArray(session?.questions) ? session.questions.length : 0;
}

/**
 * Decide o que fazer com uma resposta que chegou.
 *
 * A repeticao e checada antes de tudo: uma resposta ja contada devolve o mesmo
 * corpo, mesmo que a sessao ja tenha avancado ou terminado. E o que o app
 * precisa quando a rede cai depois de o servidor ter processado.
 */
export function decidirResposta(
  session: any,
  entrada: { questionId?: any; requestId?: string }
): DecisaoDeResposta {
  const respostas: any[] = Array.isArray(session?.answers) ? session.answers : [];
  const indiceAtual = Number(session?.currentQuestionIndex) || 0;
  const perguntaAtual = session?.questions?.[indiceAtual];
  const temQuestionId = entrada.questionId !== undefined && entrada.questionId !== null;

  if (entrada.requestId) {
    const registro = respostas.find((a) => a?.requestId === entrada.requestId);
    if (registro) return { tipo: 'repetida', registro };
  }

  // Sem requestId (builds anteriores a 03/09), a repeticao e reconhecida pela
  // pergunta. E isto que desfaz a corrida entre o toque e o tempo esgotado que
  // gerava "12 respostas em 10 perguntas".
  if (temQuestionId) {
    const posicao = respostas.findIndex((a) => String(a?.questionId) === String(entrada.questionId));
    if (posicao >= 0) {
      const registro = respostas[posicao];
      const indiceDoRegistro = Number.isInteger(registro?.questionIndex)
        ? registro.questionIndex
        : posicao;
      // A mesma pergunta pode aparecer duas vezes numa sessao. Na sua vez, a
      // segunda aparicao e uma resposta nova, nao uma repeticao.
      const eNovaAparicao =
        String(perguntaAtual?.id) === String(entrada.questionId) && indiceDoRegistro !== indiceAtual;
      if (!eNovaAparicao) return { tipo: 'repetida', registro };
    }
  }

  const total = totalDePerguntas(session);
  if (session?.status !== 'active' || respostas.length >= total || indiceAtual >= total) {
    return { tipo: 'encerrada' };
  }
  if (!perguntaAtual) return { tipo: 'encerrada' };

  // Sem questionId (tempo esgotado em versoes antigas), vale a pergunta atual:
  // o cliente nao escolhe qual pergunta e corrigida.
  if (temQuestionId && String(perguntaAtual.id) !== String(entrada.questionId)) {
    return { tipo: 'fora-de-ordem' };
  }

  return { tipo: 'atual', pergunta: perguntaAtual, indice: indiceAtual };
}

/**
 * Registra quando o servidor entregou a pergunta. So a primeira entrega conta:
 * buscar a mesma pergunta de novo nao zera o relogio.
 */
export function marcarEntrega(session: any, indice: number, agora: number): boolean {
  if (!session.servedAt || typeof session.servedAt !== 'object' || Array.isArray(session.servedAt)) {
    session.servedAt = {};
  }
  if (session.servedAt[indice]) return false;
  session.servedAt[indice] = agora;
  return true;
}

/**
 * Tempo que vale para a pontuacao: o maior entre o que o app mediu e o que o
 * servidor viu passar, descontada a folga.
 *
 * So o relogio do servidor puniria a latencia de quem joga honestamente. So o
 * do app aceita qualquer numero. Com o maior dos dois, quem joga normalmente
 * nao perde nada, e quem forja o tempo — ou poe o app em segundo plano para
 * pesquisar a resposta, pausando o cronometro do app mas nao o do servidor —
 * ganha no maximo a folga.
 */
export function tempoEfetivo(params: {
  clienteMs: any;
  entregueEm?: any;
  agora: number;
  indice: number;
}): TempoDaResposta {
  const limite = SCORING.timePerQuestion;
  const bruto = Number(params.clienteMs);
  const cliente = Number.isFinite(bruto) && bruto > 0 ? Math.round(bruto) : 0;

  const entregueEm = Number(params.entregueEm);
  if (!Number.isFinite(entregueEm) || entregueEm <= 0) {
    return { efetivo: limitar(cliente, 0, limite), cliente, servidor: null };
  }

  const servidor = Math.max(0, Math.round(params.agora - entregueEm));
  const folga = FOLGA_DE_TEMPO_MS + (params.indice === 0 ? FOLGA_DA_CONTAGEM_MS : 0);
  return {
    efetivo: limitar(Math.max(cliente, servidor - folga), 0, limite),
    cliente,
    servidor,
  };
}

export function montarCorpoDaResposta(
  session: any,
  registro: any,
  pontuacao: {
    basePoints: number;
    speedBonus: number;
    speedMultiplier: number;
    totalPoints: number;
    streakBonus: number;
  },
  level: number,
  explanation?: string | null
): any {
  const total = totalDePerguntas(session);
  const answerRecord: any = {
    selectedOption: registro.selectedOption,
    correctOption: registro.correctOption,
    isCorrect: !!registro.isCorrect,
    isTimeout: !!registro.isTimeout,
    isSkipped: !!registro.isSkipped,
    timeUsed: registro.timeUsed,
    points: registro.points,
    level,
  };
  // So chega depois de responder. Uma versao futura do app pode deixar de ler
  // a explicacao em GET /question, que a entrega antes da resposta.
  if (explanation !== undefined) answerRecord.explanation = explanation;

  return {
    success: true,
    data: {
      answerRecord,
      scoreResult: pontuacao,
      sessionStatus: {
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: total,
        score: session.score,
        streakCount: session.streakCount,
        maxStreak: session.maxStreak,
        correctAnswers: session.correctAnswers,
        incorrectAnswers: session.incorrectAnswers,
        isPhaseComplete: session.currentQuestionIndex >= total,
      },
    },
  };
}

/**
 * Corpo para uma repeticao de resposta gravada antes de os corpos passarem a
 * ser guardados sempre (so eram guardados quando havia requestId).
 */
export function corpoDeRegistroAntigo(session: any, registro: any): any {
  return montarCorpoDaResposta(
    session,
    registro,
    {
      basePoints: 0,
      speedBonus: 0,
      speedMultiplier: 1,
      totalPoints: Number(registro?.points) || 0,
      streakBonus: 0,
    },
    Number(registro?.level) || 1
  );
}

/**
 * Aplica uma resposta ja corrigida a sessao e devolve o corpo para o app.
 * Chamar so depois de `decidirResposta` devolver `atual`.
 */
export function aplicarResposta(
  session: any,
  r: RespostaCorrigida
): { corpo: any; completouAgora: boolean } {
  const total = totalDePerguntas(session);
  const jaEstavaEncerrada = session.status !== 'active';

  const { basePoints, speedBonus, speedMultiplier, totalPoints: pontosDaPergunta } =
    calculatePoints({ level: r.level, timeUsed: r.tempo.efetivo, isCorrect: r.isCorrect });

  let totalPoints = pontosDaPergunta;
  let streakBonus = 0;

  session.score = (Number(session.score) || 0) + pontosDaPergunta;
  session.currentQuestionIndex = (Number(session.currentQuestionIndex) || 0) + 1;
  session.totalTime = (Number(session.totalTime) || 0) + r.tempo.cliente;

  if (r.isCorrect) {
    session.correctAnswers = (Number(session.correctAnswers) || 0) + 1;
    session.streakCount = (Number(session.streakCount) || 0) + 1;
    session.maxStreak = Math.max(Number(session.maxStreak) || 0, session.streakCount);

    streakBonus = calculateStreakBonus(session.streakCount);
    session.score += streakBonus;
    totalPoints += streakBonus;
  } else {
    session.incorrectAnswers = (Number(session.incorrectAnswers) || 0) + 1;
    session.streakCount = 0;
  }

  const registro: any = {
    questionId: r.questionId,
    questionIndex: r.indice,
    selectedOption: r.selectedOption,
    correctOption: r.correctOption,
    isCorrect: r.isCorrect,
    isTimeout: r.isTimeout,
    isSkipped: r.isSkipped,
    timeUsed: r.tempo.cliente,
    timeUsedEffective: r.tempo.efetivo,
    timeUsedServer: r.tempo.servidor,
    points: totalPoints,
    level: r.level,
    requestId: r.requestId,
  };
  if (!Array.isArray(session.answers)) session.answers = [];
  session.answers.push(registro);

  const completouAgora = !jaEstavaEncerrada && session.currentQuestionIndex >= total;
  if (completouAgora) {
    session.status = 'completed';
    session.completedAt = new Date(r.agora).toISOString();

    // Uma unica vez, na transicao para completa. Antes era reaplicado a cada
    // resposta que chegasse depois da ultima.
    if (total > 0 && session.correctAnswers === total) {
      session.score += calculatePerfectBonus(session.score);
    }
  }

  const corpo = montarCorpoDaResposta(
    session,
    registro,
    { basePoints, speedBonus, speedMultiplier, totalPoints, streakBonus },
    r.level,
    r.explanation
  );

  // Guardado sempre, com ou sem requestId: e o que uma repeticao recebe.
  registro.resposta = corpo;

  return { corpo, completouAgora };
}

/**
 * Encerra a sessao em /finish, de forma idempotente.
 *
 * Com todas as perguntas respondidas ela ja esta `completed`. Sem elas, vira
 * `abandoned`: antes, /finish marcava qualquer sessao como completa, e uma fase
 * largada no meio podia ser dada como concluida.
 */
export function encerrarSessao(
  session: any,
  agora: number
): {
  mudou: boolean;
  accuracy: number;
  passed: boolean;
  averageTimePerQuestion: number;
  achievements: string[];
} {
  const total = totalDePerguntas(session);
  const respostas: any[] = Array.isArray(session.answers) ? session.answers : [];
  let mudou = false;

  if (session.status === 'active') {
    session.status = total > 0 && respostas.length >= total ? 'completed' : 'abandoned';
    mudou = true;
  }
  if (!session.completedAt) {
    session.completedAt = new Date(agora).toISOString();
    mudou = true;
  }

  const corretas = Math.min(Number(session.correctAnswers) || 0, total);
  const accuracy = total > 0 ? Math.round((corretas / total) * 100) : 0;
  const passed = accuracy >= SCORING.passThreshold;
  const averageTimePerQuestion =
    respostas.length > 0 ? Math.round((Number(session.totalTime) || 0) / respostas.length) : 0;

  const achievements: string[] = [];
  if (total > 0 && corretas === total) achievements.push('perfect_score');
  if ((Number(session.maxStreak) || 0) >= 10) achievements.push('streak_master');
  if (respostas.length > 0 && averageTimePerQuestion < 10000) achievements.push('speed_demon');

  return { mudou, accuracy, passed, averageTimePerQuestion, achievements };
}

/**
 * A sessao como ela pode sair do servidor.
 *
 * Fica de fora: o uid do dono, os instantes de entrega, os corpos guardados das
 * respostas e — quando as perguntas vao junto — as explicacoes, porque 34% das
 * explicacoes em portugues contem o texto da resposta certa.
 */
export function sessaoParaCliente(session: any, opcoes: { comPerguntas: boolean }): any {
  const { firebaseUid, servedAt, questions, answers, ...resto } = session || {};
  const saida: any = { ...resto };

  saida.answers = (Array.isArray(answers) ? answers : []).map((registro: any) => {
    const { resposta, ...semCorpo } = registro || {};
    return semCorpo;
  });

  if (opcoes.comPerguntas) {
    saida.questions = (Array.isArray(questions) ? questions : []).map((pergunta: any) => {
      const { explanation, ...semExplicacao } = pergunta || {};
      return semExplicacao;
    });
  }

  return saida;
}

/**
 * Maior pontuacao possivel com estes niveis: tudo certo, na faixa de tempo mais
 * rapida, com a sequencia completa e o bonus de perfeicao.
 */
export function pontuacaoMaximaDasPerguntas(niveis: number[]): number {
  const maiorMultiplicador = Math.max(...SCORING.speedMultipliers.map((m) => m.multiplier));
  let pontos = 0;
  niveis.forEach((nivel, i) => {
    pontos += Math.round((SCORING.pointsByLevel[nivel] || 10) * maiorMultiplicador);
    pontos += calculateStreakBonus(i + 1);
  });
  return pontos + calculatePerfectBonus(pontos);
}

/** Teto teorico de uma fase pela curva de dificuldade. */
export function pontuacaoMaximaDaFase(fase: number): number {
  const niveis = getDifficultyDistribution(fase).flatMap((d) => Array(d.count).fill(d.level));
  return pontuacaoMaximaDasPerguntas(niveis);
}
