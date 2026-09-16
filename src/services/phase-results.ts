/**
 * Resultados de fase
 *
 * Uma linha por fase terminada, gravada uma unica vez, com a pontuacao
 * calculada no servidor. E a base do ranking.
 *
 * Tambem e o historico que faltava: `quiz_sessions` e limpa a cada deploy (a
 * limpeza de sessoes expiradas roda na inicializacao), entao ate aqui nao havia
 * como saber, por exemplo, quantas pessoas passam da fase 1.
 *
 * Partidas de convidados tambem ficam aqui, sem uid, como estatistica. So as de
 * contas com todas as garantias viram `eligible` para o ranking.
 *
 * As funcoes recebem o knex (e nao o strapi) para serem testadas contra um
 * SQLite em memoria. Datas vao como texto ISO e o SQL fica portavel entre
 * Postgres e SQLite.
 */

import { SCORING } from './quiz-logic';
import { eTabelaInexistente } from './database-errors';
import {
  totalDePerguntas,
  pontuacaoMaximaDasPerguntas,
  DIFERENCA_SUSPEITA_MS,
} from './quiz-answer-rules';

export const TABELA_DE_RESULTADOS = 'phase_results';

/** Primeira fase registrada acima desta ganha a marca `first_seen_high`. */
const FASE_ALTA_NA_PRIMEIRA_APARICAO = 10;

export interface LinhaDeResultado {
  session_id: string;
  firebase_uid: string | null;
  phase: number;
  locale: string;
  score: number;
  max_possible_score: number;
  correct_answers: number;
  total_questions: number;
  skipped: number;
  timeouts: number;
  max_streak: number;
  total_time_ms: number;
  client_time_ms: number;
  server_time_ms: number | null;
  passed: boolean;
  eligible: boolean;
  flags: string | null;
  started_at: string;
  finished_at: string;
}

async function criarTabela(knex: any): Promise<void> {
  await knex.schema.createTable(TABELA_DE_RESULTADOS, (t: any) => {
    t.bigIncrements('id');
    t.string('session_id', 64).notNullable().unique();
    t.string('firebase_uid', 128).nullable();
    t.integer('phase').notNullable();
    t.string('locale', 8).notNullable();
    t.integer('score').notNullable();
    t.integer('max_possible_score').notNullable();
    t.integer('correct_answers').notNullable();
    t.integer('total_questions').notNullable();
    t.integer('skipped').notNullable().defaultTo(0);
    t.integer('timeouts').notNullable().defaultTo(0);
    t.integer('max_streak').notNullable().defaultTo(0);
    t.integer('total_time_ms').notNullable();
    t.integer('client_time_ms').notNullable();
    t.integer('server_time_ms').nullable();
    t.boolean('passed').notNullable();
    t.boolean('eligible').notNullable();
    t.string('flags', 128).nullable();
    t.datetime('started_at').notNullable();
    t.datetime('finished_at').notNullable();
    t.datetime('created_at').notNullable();
    t.index(['firebase_uid', 'phase', 'score']);
    t.index(['finished_at']);
  });
}

export async function garantirTabelaDeResultados(knex: any): Promise<boolean> {
  if (await knex.schema.hasTable(TABELA_DE_RESULTADOS)) return false;
  await criarTabela(knex);
  return true;
}

/**
 * Executa a operacao e, se a tabela nao existir, cria e tenta de novo.
 *
 * No primeiro deploy (13/09/2026) a tabela nao apareceu em producao, embora a
 * inicializacao que deveria cria-la tenha rodado. Sem esta volta, cada fase
 * terminada falhava ao gravar e o historico nao comecava. A criacao na
 * inicializacao continua; isto so garante que a ausencia da tabela nunca
 * derrube o que depende dela.
 */
async function comTabela<T>(knex: any, operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (erro) {
    if (!eTabelaInexistente(erro)) throw erro;
    try {
      await criarTabela(knex);
    } catch (erroAoCriar: any) {
      // Outra requisicao pode ter criado a tabela no meio do caminho.
      if (!/already exists/i.test(String(erroAoCriar?.message))) throw erroAoCriar;
    }
    return operacao();
  }
}

/**
 * Monta a linha a partir da sessao. Devolve null se a fase nao terminou com
 * todas as perguntas respondidas.
 */
export function montarResultadoDaFase(session: any, agora: Date = new Date()): LinhaDeResultado | null {
  const total = totalDePerguntas(session);
  const respostas: any[] = Array.isArray(session?.answers) ? session.answers : [];
  if (session?.status !== 'completed' || total <= 0 || respostas.length < total) return null;

  const niveis = (Array.isArray(session.questions) ? session.questions : [])
    .slice(0, total)
    .map((q: any) => Number(q?.level) || 1);
  const maxima = pontuacaoMaximaDasPerguntas(niveis);

  const corretas = Math.min(Number(session.correctAnswers) || 0, total);
  const precisao = Math.round((corretas / total) * 100);
  const score = Math.max(0, Math.round(Number(session.score) || 0));

  const somar = (valor: (a: any) => number) =>
    respostas.reduce((soma, a) => soma + (valor(a) || 0), 0);

  const todasComRelogioDoServidor = respostas.every((a) => typeof a?.timeUsedServer === 'number');
  const tempoSuspeito = respostas.some(
    (a) =>
      a?.isCorrect &&
      typeof a.timeUsedServer === 'number' &&
      a.timeUsedServer - (Number(a.timeUsed) || 0) > DIFERENCA_SUSPEITA_MS
  );

  return {
    session_id: String(session.sessionId),
    firebase_uid: session.firebaseUid || null,
    phase: Number(session.phaseNumber) || 1,
    locale: String(session.locale || 'pt').slice(0, 8),
    score,
    max_possible_score: maxima,
    correct_answers: corretas,
    total_questions: total,
    skipped: respostas.filter((a) => a?.isSkipped).length,
    timeouts: respostas.filter((a) => a?.isTimeout && !a?.isSkipped).length,
    max_streak: Number(session.maxStreak) || 0,
    total_time_ms: Math.round(
      somar((a) =>
        Math.min(Number(a.timeUsedEffective ?? a.timeUsed) || 0, SCORING.timePerQuestion)
      )
    ),
    client_time_ms: Math.round(somar((a) => Number(a.timeUsed))),
    server_time_ms: todasComRelogioDoServidor ? Math.round(somar((a) => a.timeUsedServer)) : null,
    passed: precisao >= SCORING.passThreshold,
    // Para o ranking: so conta, com as 10 perguntas, medida pelo relogio do
    // servidor do inicio ao fim e dentro do teto possivel.
    eligible:
      !!session.firebaseUid && total === 10 && todasComRelogioDoServidor && score <= maxima,
    flags: tempoSuspeito ? 'server_time_gap' : null,
    started_at: new Date(session.startedAt || agora).toISOString(),
    finished_at: new Date(session.completedAt || agora).toISOString(),
  };
}

/**
 * Grava o resultado de uma sessao terminada. Devolve true se a linha foi
 * criada agora, false se a sessao nao terminou ou ja estava gravada.
 */
export async function registrarResultadoDaSessao(
  knex: any,
  session: any,
  agora: Date = new Date()
): Promise<boolean> {
  const linha = montarResultadoDaFase(session, agora);
  if (!linha) return false;

  return comTabela(knex, async () => {
    const jaGravada = await knex(TABELA_DE_RESULTADOS)
      .where({ session_id: linha.session_id })
      .first('id');
    if (jaGravada) return false;

    let flags = linha.flags;
    if (linha.firebase_uid && linha.phase > FASE_ALTA_NA_PRIMEIRA_APARICAO) {
      const anterior = await knex(TABELA_DE_RESULTADOS)
        .where({ firebase_uid: linha.firebase_uid })
        .first('id');
      if (!anterior) flags = [flags, 'first_seen_high'].filter(Boolean).join(',');
    }

    await knex(TABELA_DE_RESULTADOS)
      .insert({ ...linha, flags, created_at: agora.toISOString() })
      .onConflict('session_id')
      .ignore();

    return true;
  });
}

/**
 * Desliga as partidas da conta, sem apaga-las: `firebase_uid` fica nulo e
 * `eligible` falso, entao o jogador some do ranking e as linhas deixam de
 * apontar para uma pessoa, mas continuam contando nas estatisticas de uso.
 *
 * E o que usa quem pede para sair do ranking (DELETE /api/leaderboard/me).
 * Apagar a conta inteira continua removendo as linhas.
 */
export async function anonimizarResultadosDoJogador(knex: any, firebaseUid: string): Promise<number> {
  try {
    return await knex(TABELA_DE_RESULTADOS)
      .where({ firebase_uid: firebaseUid })
      .update({ firebase_uid: null, eligible: false });
  } catch (erro) {
    if (eTabelaInexistente(erro)) return 0;
    throw erro;
  }
}

/**
 * Usado na exclusao de conta. Sem a tabela nao ha o que apagar — e a exclusao
 * da conta nao pode falhar por isso.
 */
export async function apagarResultadosDoJogador(knex: any, firebaseUid: string): Promise<number> {
  try {
    return await knex(TABELA_DE_RESULTADOS).where({ firebase_uid: firebaseUid }).del();
  } catch (erro) {
    if (eTabelaInexistente(erro)) return 0;
    throw erro;
  }
}
