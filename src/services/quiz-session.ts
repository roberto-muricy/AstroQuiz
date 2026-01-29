/**
 * Quiz Session Management
 * Handles in-memory session storage with database persistence
 */

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
    t.datetime('expires_at').notNullable();
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
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
