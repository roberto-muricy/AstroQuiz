/**
 * Quiz Session Management
 * Handles in-memory session storage with database persistence
 */

import { randomBytes } from 'crypto';

const QUIZ_SESSION_TABLE = 'quiz_sessions';
const QUIZ_SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory session storage (for fast access)
export const quizSessions = new Map<string, any>();

export async function ensureQuizSessionTable(strapi: any): Promise<void> {
  const knex = strapi.db.connection;
  const has = await knex.schema.hasTable(QUIZ_SESSION_TABLE);
  if (has) return;

  await knex.schema.createTable(QUIZ_SESSION_TABLE, (t: any) => {
    t.string('session_id').primary();
    t.text('data').notNullable(); // JSON string
    t.datetime('created_at').notNullable();
    t.datetime('updated_at').notNullable();
    t.datetime('expires_at').notNullable().index();
  });

  strapi.log.info(`Created ${QUIZ_SESSION_TABLE} table`);
}

export async function cleanupExpiredQuizSessions(strapi: any): Promise<void> {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  try {
    const deleted = await knex(QUIZ_SESSION_TABLE).where('expires_at', '<', nowIso).del();
    if (deleted > 0) strapi.log.info(`Deleted ${deleted} expired quiz sessions`);
  } catch (e) {
    // ignore cleanup failures
  }
}

export async function saveQuizSession(strapi: any, session: any): Promise<void> {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + QUIZ_SESSION_TTL_MS).toISOString();
  const payload = JSON.stringify(session);

  await knex(QUIZ_SESSION_TABLE)
    .insert({
      session_id: session.sessionId,
      data: payload,
      created_at: session.startedAt || nowIso,
      updated_at: nowIso,
      expires_at: expiresIso,
    })
    .onConflict('session_id')
    .merge({
      data: payload,
      updated_at: nowIso,
      expires_at: expiresIso,
    });
}

export async function loadQuizSession(strapi: any, sessionId: string): Promise<any | null> {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  const row = await knex(QUIZ_SESSION_TABLE)
    .where({ session_id: sessionId })
    .andWhere('expires_at', '>=', nowIso)
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/**
 * Get session from memory or database
 */
export async function getSession(strapi: any, sessionId: string): Promise<any | null> {
  let session = quizSessions.get(sessionId);
  if (!session) {
    session = await loadQuizSession(strapi, sessionId);
    if (session) quizSessions.set(sessionId, session);
  }
  return session;
}

/**
 * Create a new quiz session
 */
export function createSession(params: {
  sessionId: string;
  phaseNumber: number;
  locale: string;
  questions: any[];
  firebaseUid?: string;
}): any {
  const { sessionId, phaseNumber, locale, questions, firebaseUid } = params;

  return {
    sessionId,
    phaseNumber,
    locale,
    firebaseUid: firebaseUid || null,
    totalQuestions: questions.length,
    currentQuestionIndex: 0,
    questions,
    answers: [],
    score: 0,
    streakCount: 0,
    maxStreak: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    totalTime: 0,
    startedAt: new Date().toISOString(),
    status: 'active'
  };
}

/**
 * Generate a unique session ID using cryptographically secure randomness
 */
export function generateSessionId(): string {
  return `quiz_${Date.now()}_${randomBytes(12).toString('base64url')}`;
}

/**
 * Serializa o processamento de uma mesma sessao.
 *
 * Entre decidir o que fazer com uma resposta e grava-la ha um await (a busca do
 * gabarito no banco). Duas requisicoes da mesma sessao chegando juntas — o
 * toque e o tempo esgotado, ou uma repeticao de rede — liam o mesmo estado e
 * contavam a pergunta duas vezes.
 *
 * Vale para uma unica instancia do servidor, que e como o Railway roda hoje.
 * Com mais de uma, isto precisa virar uma trava no banco.
 */
const filasPorSessao = new Map<string, Promise<void>>();

export async function comTravaDaSessao<T>(sessionId: string, tarefa: () => Promise<T>): Promise<T> {
  const anterior = filasPorSessao.get(sessionId) ?? Promise.resolve();
  let liberar!: () => void;
  const minhaVez = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const fila = anterior.then(() => minhaVez);
  filasPorSessao.set(sessionId, fila);

  await anterior;
  try {
    return await tarefa();
  } finally {
    liberar();
    if (filasPorSessao.get(sessionId) === fila) filasPorSessao.delete(sessionId);
  }
}

/**
 * Tira o uid do jogador das sessoes em memoria. Usado na exclusao de conta,
 * para que uma partida em andamento nao grave resultado com o uid apagado.
 */
export function esquecerJogadorNasSessoes(firebaseUid: string): number {
  let alteradas = 0;
  for (const session of quizSessions.values()) {
    if (session?.firebaseUid === firebaseUid) {
      session.firebaseUid = null;
      alteradas++;
    }
  }
  return alteradas;
}
