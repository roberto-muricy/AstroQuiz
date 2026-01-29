/**
 * Quiz Logic Service Tests
 */

import {
  getDifficultyDistribution,
  shuffle,
  diversifyTopics,
  calculatePoints,
  calculateStreakBonus,
  calculatePerfectBonus,
  isValidLocale,
  SCORING,
} from '../quiz-logic';

describe('Quiz Logic Service', () => {
  describe('getDifficultyDistribution', () => {
    it('should return 100% level 1 for phases 1-3', () => {
      const dist = getDifficultyDistribution(1);
      expect(dist).toEqual([{ level: 1, count: 10 }]);

      expect(getDifficultyDistribution(2)).toEqual([{ level: 1, count: 10 }]);
      expect(getDifficultyDistribution(3)).toEqual([{ level: 1, count: 10 }]);
    });

    it('should return mixed levels for middle phases', () => {
      const dist = getDifficultyDistribution(15);
      expect(dist).toEqual([
        { level: 2, count: 5 },
        { level: 3, count: 5 },
      ]);
    });

    it('should return 100% level 5 for phases 46-50', () => {
      expect(getDifficultyDistribution(46)).toEqual([{ level: 5, count: 10 }]);
      expect(getDifficultyDistribution(50)).toEqual([{ level: 5, count: 10 }]);
    });

    it('should always return total of 10 questions', () => {
      for (let phase = 1; phase <= 50; phase++) {
        const dist = getDifficultyDistribution(phase);
        const total = dist.reduce((sum, d) => sum + d.count, 0);
        expect(total).toBe(10);
      }
    });
  });

  describe('shuffle', () => {
    it('should return array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled).toHaveLength(5);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffle(arr);
      expect(arr).toEqual(original);
    });
  });

  describe('diversifyTopics', () => {
    const questions = [
      { id: 1, topic: 'Solar System' },
      { id: 2, topic: 'Solar System' },
      { id: 3, topic: 'Solar System' },
      { id: 4, topic: 'Solar System' },
      { id: 5, topic: 'Stars' },
      { id: 6, topic: 'Stars' },
      { id: 7, topic: 'Galaxies' },
      { id: 8, topic: 'Galaxies' },
      { id: 9, topic: 'Black Holes' },
      { id: 10, topic: 'Planets' },
    ];

    // Large pool with enough variety
    const largePool = [
      { id: 1, topic: 'Solar System' },
      { id: 2, topic: 'Solar System' },
      { id: 3, topic: 'Solar System' },
      { id: 4, topic: 'Solar System' },
      { id: 5, topic: 'Stars' },
      { id: 6, topic: 'Stars' },
      { id: 7, topic: 'Stars' },
      { id: 8, topic: 'Stars' },
      { id: 9, topic: 'Galaxies' },
      { id: 10, topic: 'Galaxies' },
      { id: 11, topic: 'Galaxies' },
      { id: 12, topic: 'Galaxies' },
      { id: 13, topic: 'Black Holes' },
      { id: 14, topic: 'Black Holes' },
      { id: 15, topic: 'Planets' },
      { id: 16, topic: 'Planets' },
    ];

    it('should limit to max 3 questions per topic when pool is large enough', () => {
      const selected = diversifyTopics(largePool, 10);
      const topicCounts: Record<string, number> = {};

      for (const q of selected) {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      }

      for (const count of Object.values(topicCounts)) {
        expect(count).toBeLessThanOrEqual(3);
      }
    });

    it('should return target count if possible', () => {
      const selected = diversifyTopics(questions, 8);
      expect(selected).toHaveLength(8);
    });

    it('should return available questions if less than target', () => {
      const smallPool = [{ id: 1, topic: 'A' }, { id: 2, topic: 'B' }];
      const selected = diversifyTopics(smallPool, 10);
      expect(selected).toHaveLength(2);
    });
  });

  describe('calculatePoints', () => {
    it('should return 0 for incorrect answers', () => {
      const result = calculatePoints({ level: 3, timeUsed: 5000, isCorrect: false });
      expect(result.totalPoints).toBe(0);
      expect(result.basePoints).toBe(0);
    });

    it('should calculate correct base points by level', () => {
      expect(calculatePoints({ level: 1, timeUsed: 20000, isCorrect: true }).basePoints).toBe(10);
      expect(calculatePoints({ level: 2, timeUsed: 20000, isCorrect: true }).basePoints).toBe(20);
      expect(calculatePoints({ level: 3, timeUsed: 20000, isCorrect: true }).basePoints).toBe(30);
      expect(calculatePoints({ level: 4, timeUsed: 20000, isCorrect: true }).basePoints).toBe(40);
      expect(calculatePoints({ level: 5, timeUsed: 20000, isCorrect: true }).basePoints).toBe(50);
    });

    it('should apply 2x multiplier for fast answers (<10s)', () => {
      const result = calculatePoints({ level: 1, timeUsed: 5000, isCorrect: true });
      expect(result.speedMultiplier).toBe(2.0);
      expect(result.totalPoints).toBe(20); // 10 * 2
    });

    it('should apply 1.5x multiplier for good answers (<15s)', () => {
      const result = calculatePoints({ level: 1, timeUsed: 12000, isCorrect: true });
      expect(result.speedMultiplier).toBe(1.5);
      expect(result.totalPoints).toBe(15); // 10 * 1.5
    });

    it('should apply 1.2x multiplier for normal answers (<20s)', () => {
      const result = calculatePoints({ level: 1, timeUsed: 18000, isCorrect: true });
      expect(result.speedMultiplier).toBe(1.2);
      expect(result.totalPoints).toBe(12); // 10 * 1.2
    });

    it('should apply 1x multiplier for slow answers (>20s)', () => {
      const result = calculatePoints({ level: 1, timeUsed: 25000, isCorrect: true });
      expect(result.speedMultiplier).toBe(1.0);
      expect(result.totalPoints).toBe(10);
    });
  });

  describe('calculateStreakBonus', () => {
    it('should return 0 for streak < 3', () => {
      expect(calculateStreakBonus(0)).toBe(0);
      expect(calculateStreakBonus(1)).toBe(0);
      expect(calculateStreakBonus(2)).toBe(0);
    });

    it('should return 5 points per answer for streak >= 3', () => {
      expect(calculateStreakBonus(3)).toBe(15);
      expect(calculateStreakBonus(5)).toBe(25);
      expect(calculateStreakBonus(8)).toBe(40);
    });

    it('should cap at 50 points', () => {
      expect(calculateStreakBonus(10)).toBe(50);
      expect(calculateStreakBonus(15)).toBe(50);
    });
  });

  describe('calculatePerfectBonus', () => {
    it('should return 50% of score', () => {
      expect(calculatePerfectBonus(100)).toBe(50);
      expect(calculatePerfectBonus(200)).toBe(100);
      expect(calculatePerfectBonus(150)).toBe(75);
    });
  });

  describe('isValidLocale', () => {
    it('should return true for supported locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('pt')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
      expect(isValidLocale('fr')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isValidLocale('jp')).toBe(false);
      expect(isValidLocale('de')).toBe(false);
      expect(isValidLocale('')).toBe(false);
    });
  });

  describe('SCORING constants', () => {
    it('should have correct time per question', () => {
      expect(SCORING.timePerQuestion).toBe(30000);
    });

    it('should have correct pass threshold', () => {
      expect(SCORING.passThreshold).toBe(60);
    });
  });
});
