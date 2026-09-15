/**
 * Input Validation Service
 * Validates and sanitizes API inputs
 */

import { SUPPORTED_LOCALES } from './quiz-logic';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valid answer options
 */
export const VALID_OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * Valid question levels
 */
export const VALID_LEVELS = [1, 2, 3, 4, 5];

/**
 * Phase range
 */
export const MIN_PHASE = 1;
export const MAX_PHASE = 50;

/**
 * Time constraints (ms)
 *
 * Este teto estava em 30000 enquanto config/game-rules.js dava 45000 por
 * pergunta. O app envia o tempo real gasto, entao TODA pergunta cujo tempo
 * esgotava chegava aqui com 45000 e era recusada com 400 — o jogador ficava
 * preso na fase, sem registrar a resposta.
 *
 * A folga sobre o tempo de jogo e proposital: o cliente mede por conta propria
 * e latencia, app em segundo plano ou relogio impreciso podem devolver um
 * valor um pouco acima do teorico. Ser generoso aqui nao abre brecha — o bonus
 * de velocidade so premia tempos MENORES, logo inflar timeUsed nao beneficia
 * ninguem.
 *
 * O teste em __tests__/validation-tempo.test.ts falha se este valor voltar a
 * ficar abaixo do tempo por pergunta das regras do jogo.
 */
export const MAX_TIME_PER_QUESTION = 90000;

/**
 * Validate phase number
 */
export function validatePhaseNumber(phase: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (phase === undefined || phase === null) {
    errors.push({ field: 'phaseNumber', message: 'Phase number is required' });
  } else {
    const num = Number(phase);
    if (isNaN(num) || !Number.isInteger(num)) {
      errors.push({ field: 'phaseNumber', message: 'Phase number must be an integer' });
    } else if (num < MIN_PHASE || num > MAX_PHASE) {
      errors.push({
        field: 'phaseNumber',
        message: `Phase number must be between ${MIN_PHASE} and ${MAX_PHASE}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate locale
 */
export function validateLocale(locale: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!locale) {
    errors.push({ field: 'locale', message: 'Locale is required' });
  } else if (!SUPPORTED_LOCALES.includes(locale)) {
    errors.push({
      field: 'locale',
      message: `Invalid locale. Supported: ${SUPPORTED_LOCALES.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate answer option
 */
export function validateOption(option: any, fieldName = 'selectedOption'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!option) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else if (!VALID_OPTIONS.includes(option.toUpperCase())) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be one of: ${VALID_OPTIONS.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate question level
 */
export function validateLevel(level: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (level === undefined || level === null) {
    errors.push({ field: 'level', message: 'Level is required' });
  } else {
    const num = Number(level);
    if (isNaN(num) || !VALID_LEVELS.includes(num)) {
      errors.push({
        field: 'level',
        message: `Level must be one of: ${VALID_LEVELS.join(', ')}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate time used
 */
export function validateTimeUsed(timeUsed: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (timeUsed !== undefined && timeUsed !== null) {
    const num = Number(timeUsed);
    if (isNaN(num) || num < 0) {
      errors.push({ field: 'timeUsed', message: 'Time used must be a positive number' });
    } else if (num > MAX_TIME_PER_QUESTION) {
      errors.push({
        field: 'timeUsed',
        message: `Time used cannot exceed ${MAX_TIME_PER_QUESTION}ms`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Formato de generateSessionId: quiz_<timestamp>_<base64url>. O teto de
 * tamanho e o conjunto de caracteres evitam que lixo arbitrario chegue aos
 * logs, ao mapa de sessoes em memoria e as travas por sessao.
 */
const SESSION_ID_FORMAT = /^quiz_[A-Za-z0-9_-]{1,64}$/;

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!sessionId) {
    errors.push({ field: 'sessionId', message: 'Session ID is required' });
  } else if (typeof sessionId !== 'string') {
    errors.push({ field: 'sessionId', message: 'Session ID must be a string' });
  } else if (!SESSION_ID_FORMAT.test(sessionId)) {
    errors.push({ field: 'sessionId', message: 'Invalid session ID format' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate the optional idempotency key sent with /quiz/answer.
 * The app sends `ans_<timestamp>_<base36>`; it is stored with the answer.
 */
export function validateRequestId(requestId: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (requestId !== undefined && requestId !== null) {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(requestId)) {
      errors.push({ field: 'requestId', message: 'Invalid request ID format' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Campos que PUT /api/user-profile/:uid/stats aceita.
 *
 * Aquela rota espalhava o corpo inteiro no update: o dono do perfil podia
 * reescrever firebaseUid, email, displayName ou qualquer outro campo. Agora so
 * passam as estatisticas que o app de fato envia (GameStats), e com formato
 * valido.
 *
 * O que nao passa e descartado em silencio, e nao recusado: versoes antigas do
 * app mandam o objeto de estatisticas inteiro, e um 400 aqui quebraria a
 * sincronizacao delas.
 *
 * Estas estatisticas continuam vindo do app e nao valem para o ranking, que usa
 * so a pontuacao gravada pelo servidor em phase_results.
 */
const STATS_INTEGER_FIELDS = [
  'totalXP',
  'phasesCompleted',
  'perfectPhases',
  'totalQuestionsAnswered',
  'totalCorrectAnswers',
  'maxStreak',
  'currentStreak',
  'fastAnswers',
] as const;
const STATS_INTEGER_CEILING = 1_000_000_000;
const MAX_ACHIEVEMENTS = 100;
const MAX_ACHIEVEMENT_ID_LENGTH = 64;
const MAX_PHASE_STATS_BYTES = 32 * 1024;

export function sanitizeStatsUpdate(body: any): Record<string, any> {
  const sanitized: Record<string, any> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sanitized;

  for (const field of STATS_INTEGER_FIELDS) {
    const value = body[field];
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= STATS_INTEGER_CEILING
    ) {
      sanitized[field] = value;
    }
  }

  const achievements = body.achievements;
  if (
    Array.isArray(achievements) &&
    achievements.length <= MAX_ACHIEVEMENTS &&
    achievements.every(
      (id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_ACHIEVEMENT_ID_LENGTH
    )
  ) {
    sanitized.achievements = achievements;
  }

  const phaseStats = body.phaseStats;
  if (phaseStats && typeof phaseStats === 'object' && !Array.isArray(phaseStats)) {
    const keys = Object.keys(phaseStats);
    const validKeys = keys.every((key) => {
      if (!/^\d{1,2}$/.test(key)) return false;
      const phase = Number(key);
      return phase >= MIN_PHASE && phase <= MAX_PHASE;
    });

    let size = Infinity;
    try {
      size = Buffer.byteLength(JSON.stringify(phaseStats), 'utf8');
    } catch {
      // objeto circular ou nao serializavel: descartado
    }

    if (keys.length <= MAX_PHASE && validKeys && size <= MAX_PHASE_STATS_BYTES) {
      sanitized.phaseStats = phaseStats;
    }
  }

  return sanitized;
}

/**
 * Validate question ID
 */
export function validateQuestionId(questionId: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (questionId !== undefined && questionId !== null) {
    const num = Number(questionId);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      errors.push({ field: 'questionId', message: 'Question ID must be a positive integer' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate Firebase UID
 */
export function validateFirebaseUid(uid: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!uid) {
    errors.push({ field: 'firebaseUid', message: 'Firebase UID is required' });
  } else if (typeof uid !== 'string') {
    errors.push({ field: 'firebaseUid', message: 'Firebase UID must be a string' });
  } else if (uid.length < 10 || uid.length > 128) {
    errors.push({ field: 'firebaseUid', message: 'Invalid Firebase UID format' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate question text fields
 */
export function validateQuestionData(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields for new questions
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 10) {
    errors.push({ field: 'question', message: 'Question text must be at least 10 characters' });
  }

  // Validate options
  for (const opt of ['optionA', 'optionB', 'optionC', 'optionD']) {
    if (!data[opt] || typeof data[opt] !== 'string' || data[opt].trim().length === 0) {
      errors.push({ field: opt, message: `${opt} is required` });
    }
  }

  // Validate correct option
  if (data.correctOption) {
    const optResult = validateOption(data.correctOption, 'correctOption');
    errors.push(...optResult.errors);
  }

  // Validate level if provided
  if (data.level !== undefined) {
    const levelResult = validateLevel(data.level);
    errors.push(...levelResult.errors);
  }

  // Validate locale if provided
  if (data.locale) {
    const localeResult = validateLocale(data.locale);
    errors.push(...localeResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Ranking: tipos, paginacao e pais.
 *
 * Parametros de consulta chegam como texto, ou como lista quando se repetem na
 * URL; qualquer forma diferente de um valor unico valido e recusada.
 */
export const LEADERBOARD_BOARDS = ['all-time', 'weekly', 'phase'];
export const LEADERBOARD_DEFAULT_PAGE_SIZE = 20;
export const LEADERBOARD_MAX_PAGE_SIZE = 50;
export const LEADERBOARD_MAX_PAGE = 1000;

function queryInteger(value: any): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d{1,6}$/.test(value)) return Number(value);
  return null;
}

export function validateLeaderboardPage(page: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (page !== undefined) {
    const num = queryInteger(page);
    if (num === null || num < 1 || num > LEADERBOARD_MAX_PAGE) {
      errors.push({
        field: 'page',
        message: `page must be an integer between 1 and ${LEADERBOARD_MAX_PAGE}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateLeaderboardPageSize(pageSize: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (pageSize !== undefined) {
    const num = queryInteger(pageSize);
    if (num === null || num < 1 || num > LEADERBOARD_MAX_PAGE_SIZE) {
      errors.push({
        field: 'pageSize',
        message: `pageSize must be an integer between 1 and ${LEADERBOARD_MAX_PAGE_SIZE}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateLeaderboardBoard(board: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (board !== undefined && (typeof board !== 'string' || !LEADERBOARD_BOARDS.includes(board))) {
    errors.push({
      field: 'board',
      message: `board must be one of: ${LEADERBOARD_BOARDS.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Formato ISO 3166-1 alfa-2, em maiusculas ou minusculas. */
export function validateCountryCode(code: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code)) {
    errors.push({ field: 'country', message: 'country must be a two-letter ISO 3166-1 code' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Corpo JSON com campos conhecidos: precisa ser objeto, e qualquer campo fora
 * da lista e recusado (sem repetir o nome recebido na mensagem).
 */
export function validateKnownFields(body: any, allowed: string[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', message: 'Body must be a JSON object' });
  } else if (Object.keys(body).some((key) => !allowed.includes(key))) {
    errors.push({ field: 'body', message: `Only these fields are allowed: ${allowed.join(', ')}` });
  }

  return { valid: errors.length === 0, errors };
}

/** Pais opcional: null ou texto vazio removem o pais. */
export function validateOptionalCountryCode(code: any): ValidationResult {
  if (code === null || code === '') return { valid: true, errors: [] };
  return validateCountryCode(code);
}

/** Id publico do jogador no ranking (base64url, ate 16 caracteres). */
export function validatePublicPlayerId(id: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,16}$/.test(id)) {
    errors.push({ field: 'playerId', message: 'Invalid player ID' });
  }

  return { valid: errors.length === 0, errors };
}

export const LEADERBOARD_REPORT_REASONS = ['offensive', 'impersonation', 'spam'];

export function validateReportReason(reason: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof reason !== 'string' || !LEADERBOARD_REPORT_REASONS.includes(reason)) {
    errors.push({
      field: 'reason',
      message: `reason must be one of: ${LEADERBOARD_REPORT_REASONS.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  for (const result of results) {
    allErrors.push(...result.errors);
  }
  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.field}: ${e.message}`).join('; ');
}
