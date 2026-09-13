/**
 * PUT /api/user-profile/:uid/stats espalhava o corpo inteiro no perfil: o dono
 * podia reescrever firebaseUid, email, displayName ou qualquer outro campo.
 */

import {
  sanitizeStatsUpdate,
  validateRequestId,
  validateSessionId,
} from '../validation';
import { generateSessionId } from '../quiz-session';

describe('sanitizeStatsUpdate', () => {
  // O objeto que o app envia hoje (GameStats em AstroQuizApp/src/types).
  const statsDoApp = {
    totalXP: 120,
    phasesCompleted: 2,
    perfectPhases: 1,
    totalQuestionsAnswered: 20,
    totalCorrectAnswers: 15,
    maxStreak: 7,
    currentStreak: 3,
    fastAnswers: 4,
    achievements: ['first_steps', 'perfect_phase'],
    phaseStats: {
      '1': { phase: 1, stars: 3, completed: true, correctAnswers: 10, totalQuestions: 10 },
      '2': { phase: 2, stars: 1, completed: true, correctAnswers: 6, totalQuestions: 10 },
    },
  };

  it('mantem o objeto de estatisticas que o app manda', () => {
    expect(sanitizeStatsUpdate(statsDoApp)).toEqual(statsDoApp);
  });

  it('descarta tudo o que nao e estatistica', () => {
    const resultado = sanitizeStatsUpdate({
      ...statsDoApp,
      id: 1,
      firebaseUid: 'uid_de_outra_pessoa',
      email: 'alguem@exemplo.com',
      displayName: 'Admin',
      photoURL: 'https://exemplo.com/foto.png',
      role: 'admin',
      isBlocked: false,
      lastSyncedAt: '2020-01-01',
    });
    expect(Object.keys(resultado).sort()).toEqual(Object.keys(statsDoApp).sort());
  });

  it('descarta numeros invalidos', () => {
    expect(
      sanitizeStatsUpdate({
        totalXP: -5,
        phasesCompleted: 2.5,
        perfectPhases: '3',
        maxStreak: 1e12,
        fastAnswers: NaN,
        currentStreak: Infinity,
      })
    ).toEqual({});
  });

  it('descarta conquistas malformadas', () => {
    expect(sanitizeStatsUpdate({ achievements: ['ok', 42] })).toEqual({});
    expect(sanitizeStatsUpdate({ achievements: [''] })).toEqual({});
    expect(sanitizeStatsUpdate({ achievements: ['x'.repeat(65)] })).toEqual({});
    expect(sanitizeStatsUpdate({ achievements: Array(101).fill('a') })).toEqual({});
    expect(sanitizeStatsUpdate({ achievements: 'first_steps' })).toEqual({});
  });

  it('descarta phaseStats com chaves fora das fases ou grande demais', () => {
    expect(sanitizeStatsUpdate({ phaseStats: { '0': {} } })).toEqual({});
    expect(sanitizeStatsUpdate({ phaseStats: { '51': {} } })).toEqual({});
    expect(sanitizeStatsUpdate({ phaseStats: { abc: {} } })).toEqual({});
    expect(sanitizeStatsUpdate({ phaseStats: [{}] })).toEqual({});
    expect(sanitizeStatsUpdate({ phaseStats: { '1': { nota: 'x'.repeat(40000) } } })).toEqual({});
  });

  it('corpo que nao e objeto vira objeto vazio', () => {
    for (const corpo of [null, undefined, 'texto', 42, [statsDoApp]]) {
      expect(sanitizeStatsUpdate(corpo)).toEqual({});
    }
  });
});

describe('validateRequestId', () => {
  it('aceita o formato do app e a ausencia do campo', () => {
    expect(validateRequestId('ans_1757851200000_ab12cd34').valid).toBe(true);
    expect(validateRequestId(undefined).valid).toBe(true);
    expect(validateRequestId(null).valid).toBe(true);
  });

  it('recusa outros tipos, espacos e textos longos', () => {
    expect(validateRequestId(123).valid).toBe(false);
    expect(validateRequestId('ans 1').valid).toBe(false);
    expect(validateRequestId('x'.repeat(65)).valid).toBe(false);
  });
});

describe('validateSessionId — formato', () => {
  it('aceita o que generateSessionId produz', () => {
    for (let i = 0; i < 20; i++) {
      expect(validateSessionId(generateSessionId()).valid).toBe(true);
    }
  });

  it('recusa caracteres fora do formato e ids longos demais', () => {
    expect(validateSessionId('quiz_').valid).toBe(false);
    expect(validateSessionId('quiz_abc<script>').valid).toBe(false);
    expect(validateSessionId(`quiz_${'a'.repeat(65)}`).valid).toBe(false);
  });
});
