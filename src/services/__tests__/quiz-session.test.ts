/**
 * Quiz Session Service Tests
 */

import {
  createSession,
  generateSessionId,
  quizSessions,
} from '../quiz-session';

describe('Quiz Session Service', () => {
  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "quiz_" prefix', () => {
      const id = generateSessionId();
      expect(id.startsWith('quiz_')).toBe(true);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateSessionId();
      const after = Date.now();

      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createSession', () => {
    const mockQuestions = [
      { id: 1, question: 'Q1' },
      { id: 2, question: 'Q2' },
    ];

    it('should create session with correct structure', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 5,
        locale: 'pt',
        questions: mockQuestions,
      });

      expect(session.sessionId).toBe('quiz_123_abc');
      expect(session.phaseNumber).toBe(5);
      expect(session.locale).toBe('pt');
      expect(session.questions).toEqual(mockQuestions);
    });

    it('should initialize counters to zero', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });

      expect(session.score).toBe(0);
      expect(session.streakCount).toBe(0);
      expect(session.maxStreak).toBe(0);
      expect(session.correctAnswers).toBe(0);
      expect(session.incorrectAnswers).toBe(0);
      expect(session.totalTime).toBe(0);
      expect(session.currentQuestionIndex).toBe(0);
    });

    it('should set status to active', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });

      expect(session.status).toBe('active');
    });

    it('should set total questions from array length', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });

      expect(session.totalQuestions).toBe(2);
    });

    it('should include firebaseUid if provided', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
        firebaseUid: 'user123',
      });

      expect(session.firebaseUid).toBe('user123');
    });

    it('should set firebaseUid to null if not provided', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });

      expect(session.firebaseUid).toBeNull();
    });

    it('should set startedAt timestamp', () => {
      const before = new Date().toISOString();
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });
      const after = new Date().toISOString();

      expect(session.startedAt >= before).toBe(true);
      expect(session.startedAt <= after).toBe(true);
    });

    it('should initialize empty answers array', () => {
      const session = createSession({
        sessionId: 'quiz_123_abc',
        phaseNumber: 1,
        locale: 'en',
        questions: mockQuestions,
      });

      expect(session.answers).toEqual([]);
    });
  });

  describe('quizSessions Map', () => {
    beforeEach(() => {
      quizSessions.clear();
    });

    it('should store and retrieve sessions', () => {
      const session = createSession({
        sessionId: 'quiz_test_123',
        phaseNumber: 1,
        locale: 'en',
        questions: [],
      });

      quizSessions.set(session.sessionId, session);

      const retrieved = quizSessions.get('quiz_test_123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.phaseNumber).toBe(1);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = quizSessions.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });
});
