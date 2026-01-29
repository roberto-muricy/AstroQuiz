/**
 * Quiz Routes Integration Tests
 *
 * These tests verify the quiz API endpoints work correctly.
 * Run with: npm run test:routes
 *
 * Note: These tests use mocked Strapi context for unit testing.
 * For full integration tests, run against a live server.
 */

import {
  validatePhaseNumber,
  validateLocale,
  validateSessionId,
  validateOption,
  combineValidations,
} from '../../services/validation';
import {
  getDifficultyDistribution,
  calculatePoints,
  calculateStreakBonus,
  SCORING,
} from '../../services/quiz-logic';
import {
  createSession,
  generateSessionId,
} from '../../services/quiz-session';

describe('Quiz Routes - Validation Integration', () => {
  describe('POST /api/quiz/start - Input Validation', () => {
    it('should validate valid start request', () => {
      const validation = combineValidations(
        validatePhaseNumber(1),
        validateLocale('pt')
      );
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid phase number', () => {
      const validation = combineValidations(
        validatePhaseNumber(100),
        validateLocale('pt')
      );
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'phaseNumber')).toBe(true);
    });

    it('should reject invalid locale', () => {
      const validation = combineValidations(
        validatePhaseNumber(1),
        validateLocale('invalid')
      );
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'locale')).toBe(true);
    });

    it('should reject multiple invalid fields', () => {
      const validation = combineValidations(
        validatePhaseNumber(0),
        validateLocale('xx')
      );
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(2);
    });
  });

  describe('POST /api/quiz/answer - Input Validation', () => {
    it('should validate valid answer request', () => {
      const sessionValidation = validateSessionId('quiz_123456_abc');
      const optionValidation = validateOption('B');

      expect(sessionValidation.valid).toBe(true);
      expect(optionValidation.valid).toBe(true);
    });

    it('should reject invalid session ID', () => {
      const validation = validateSessionId('invalid_session');
      expect(validation.valid).toBe(false);
    });

    it('should reject invalid option', () => {
      const validation = validateOption('X');
      expect(validation.valid).toBe(false);
    });
  });

  describe('Quiz Session Flow', () => {
    it('should create a valid session', () => {
      const questions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: `Question ${i + 1}`,
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
        level: 1,
      }));

      const session = createSession({
        sessionId: generateSessionId(),
        phaseNumber: 1,
        locale: 'pt',
        questions,
      });

      expect(session.status).toBe('active');
      expect(session.totalQuestions).toBe(10);
      expect(session.currentQuestionIndex).toBe(0);
      expect(session.score).toBe(0);
    });

    it('should track correct answer scoring', () => {
      // Simulate answering a level 1 question correctly in 5 seconds
      const result = calculatePoints({
        level: 1,
        timeUsed: 5000,
        isCorrect: true,
      });

      expect(result.basePoints).toBe(10);
      expect(result.speedMultiplier).toBe(2.0);
      expect(result.totalPoints).toBe(20);
    });

    it('should not give points for incorrect answers', () => {
      const result = calculatePoints({
        level: 3,
        timeUsed: 5000,
        isCorrect: false,
      });

      expect(result.totalPoints).toBe(0);
    });

    it('should calculate streak bonus after 3 correct', () => {
      expect(calculateStreakBonus(2)).toBe(0);
      expect(calculateStreakBonus(3)).toBe(15);
      expect(calculateStreakBonus(5)).toBe(25);
    });
  });

  describe('Phase Question Distribution', () => {
    it('should return correct distribution for beginner phases', () => {
      // Phases 1-3: 100% Level 1
      expect(getDifficultyDistribution(1)).toEqual([{ level: 1, count: 10 }]);
      expect(getDifficultyDistribution(3)).toEqual([{ level: 1, count: 10 }]);
    });

    it('should return mixed levels for intermediate phases', () => {
      // Phases 11-15: Level 2 and 3
      const dist = getDifficultyDistribution(12);
      expect(dist.some(d => d.level === 2)).toBe(true);
      expect(dist.some(d => d.level === 3)).toBe(true);
    });

    it('should return correct distribution for master phases', () => {
      // Phases 46-50: 100% Level 5
      expect(getDifficultyDistribution(50)).toEqual([{ level: 5, count: 10 }]);
    });

    it('should always sum to 10 questions', () => {
      for (let phase = 1; phase <= 50; phase++) {
        const dist = getDifficultyDistribution(phase);
        const total = dist.reduce((sum, d) => sum + d.count, 0);
        expect(total).toBe(10);
      }
    });
  });

  describe('Scoring Rules', () => {
    it('should have correct time per question', () => {
      expect(SCORING.timePerQuestion).toBe(30000);
    });

    it('should have correct pass threshold', () => {
      expect(SCORING.passThreshold).toBe(60);
    });

    it('should have correct points by level', () => {
      expect(SCORING.pointsByLevel[1]).toBe(10);
      expect(SCORING.pointsByLevel[2]).toBe(20);
      expect(SCORING.pointsByLevel[3]).toBe(30);
      expect(SCORING.pointsByLevel[4]).toBe(40);
      expect(SCORING.pointsByLevel[5]).toBe(50);
    });

    it('should have correct speed multipliers', () => {
      const multipliers = SCORING.speedMultipliers;
      expect(multipliers[0]).toEqual({ minRemaining: 20000, multiplier: 2.0 });
      expect(multipliers[1]).toEqual({ minRemaining: 15000, multiplier: 1.5 });
      expect(multipliers[2]).toEqual({ minRemaining: 10000, multiplier: 1.2 });
      expect(multipliers[3]).toEqual({ minRemaining: 0, multiplier: 1.0 });
    });
  });
});

describe('Quiz Flow Simulation', () => {
  it('should simulate a complete quiz session', () => {
    // Create session
    const sessionId = generateSessionId();
    const questions = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      question: `Question ${i + 1}`,
      correctOption: 'A',
      level: 1,
    }));

    const session = createSession({
      sessionId,
      phaseNumber: 1,
      locale: 'pt',
      questions,
    });

    // Simulate 10 answers
    let totalScore = 0;
    let streak = 0;

    for (let i = 0; i < 10; i++) {
      const isCorrect = i < 8; // 8 correct, 2 wrong
      const timeUsed = 10000; // 10 seconds each

      if (isCorrect) {
        const points = calculatePoints({ level: 1, timeUsed, isCorrect: true });
        totalScore += points.totalPoints;
        streak++;

        if (streak >= 3) {
          totalScore += calculateStreakBonus(streak);
        }
      } else {
        streak = 0;
      }

      session.currentQuestionIndex = i + 1;
    }

    // Verify results
    expect(session.currentQuestionIndex).toBe(10);
    expect(totalScore).toBeGreaterThan(0);
  });

  it('should calculate accuracy correctly', () => {
    const correctAnswers = 7;
    const totalQuestions = 10;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    expect(accuracy).toBe(70);
  });

  it('should determine pass/fail correctly', () => {
    const passThreshold = SCORING.passThreshold;

    expect(59 >= passThreshold).toBe(false); // Fail
    expect(60 >= passThreshold).toBe(true);  // Pass
    expect(100 >= passThreshold).toBe(true); // Pass
  });
});
