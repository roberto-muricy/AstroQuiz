/**
 * Quiz Logic
 * Phase distribution, scoring, and selection algorithms
 */

export interface DifficultyDistribution {
  level: number;
  count: number;
}

/**
 * Get difficulty distribution for each phase (1-50)
 * Returns array of {level, count} matching the frontend progressionSystem.ts
 */
export function getDifficultyDistribution(phase: number): DifficultyDistribution[] {
  // Phases 1-3: Beginner (100% Level 1)
  if (phase <= 3) return [{ level: 1, count: 10 }];

  // Phases 4-7: Easy mix
  if (phase <= 7) return [{ level: 1, count: 8 }, { level: 2, count: 2 }];

  // Phases 8-10: Intro to Level 2
  if (phase <= 10) return [{ level: 1, count: 6 }, { level: 2, count: 4 }];

  // Phases 11-15: Intermediate start
  if (phase <= 15) return [{ level: 2, count: 5 }, { level: 3, count: 5 }];

  // Phases 16-20: More Level 3
  if (phase <= 20) return [{ level: 2, count: 3 }, { level: 3, count: 7 }];

  // Phases 21-25: Intermediate advanced
  if (phase <= 25) return [{ level: 3, count: 6 }, { level: 4, count: 4 }];

  // Phases 26-30: Balanced challenge
  if (phase <= 30) return [{ level: 3, count: 5 }, { level: 4, count: 5 }];

  // Phases 31-35: More Level 4
  if (phase <= 35) return [{ level: 3, count: 3 }, { level: 4, count: 7 }];

  // Phases 36-40: Advanced
  if (phase <= 40) return [{ level: 4, count: 6 }, { level: 5, count: 4 }];

  // Phases 41-45: Expert mix
  if (phase <= 45) return [{ level: 4, count: 5 }, { level: 5, count: 5 }];

  // Phases 46-50: Master (100% Level 5)
  return [{ level: 5, count: 10 }];
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Diversify questions by topic (max 3 per topic)
 */
export function diversifyTopics<T extends { topic?: string; id: number }>(
  questions: T[],
  targetCount: number
): T[] {
  const selected: T[] = [];
  const topicCount: Record<string, number> = {};
  const shuffled = shuffle(questions);

  for (const question of shuffled) {
    const topic = question.topic || 'General';
    const currentCount = topicCount[topic] || 0;

    // Limit to max 3 questions per topic
    if (currentCount < 3) {
      selected.push(question);
      topicCount[topic] = currentCount + 1;

      if (selected.length >= targetCount) {
        break;
      }
    }
  }

  // If we didn't get enough (strict topic limit), fill remaining
  if (selected.length < targetCount) {
    for (const question of shuffled) {
      if (selected.length >= targetCount) break;
      if (!selected.find((q) => q.id === question.id)) {
        selected.push(question);
      }
    }
  }

  return selected;
}

/**
 * Scoring configuration
 */
export const SCORING = {
  pointsByLevel: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 } as Record<number, number>,
  timePerQuestion: 30000,
  speedMultipliers: [
    { minRemaining: 20000, multiplier: 2.0 },  // Excellent (<10s used)
    { minRemaining: 15000, multiplier: 1.5 },  // Good (<15s used)
    { minRemaining: 10000, multiplier: 1.2 },  // Normal (<20s used)
    { minRemaining: 0, multiplier: 1.0 },      // Slow (>20s used)
  ],
  streakBonusStart: 3,
  streakBonusPerAnswer: 5,
  streakBonusMax: 50,
  perfectBonusMultiplier: 0.5,
  passThreshold: 60,
};

/**
 * Calculate points for a correct answer
 */
export function calculatePoints(params: {
  level: number;
  timeUsed: number;
  isCorrect: boolean;
}): { basePoints: number; speedBonus: number; speedMultiplier: number; totalPoints: number } {
  if (!params.isCorrect) {
    return { basePoints: 0, speedBonus: 0, speedMultiplier: 1.0, totalPoints: 0 };
  }

  const basePoints = SCORING.pointsByLevel[params.level] || 10;
  const timeRemaining = SCORING.timePerQuestion - params.timeUsed;

  let speedMultiplier = 1.0;
  for (const tier of SCORING.speedMultipliers) {
    if (timeRemaining >= tier.minRemaining) {
      speedMultiplier = tier.multiplier;
      break;
    }
  }

  const pointsWithSpeed = Math.round(basePoints * speedMultiplier);
  const speedBonus = pointsWithSpeed - basePoints;

  return {
    basePoints,
    speedBonus,
    speedMultiplier,
    totalPoints: pointsWithSpeed,
  };
}

/**
 * Calculate streak bonus
 */
export function calculateStreakBonus(streakCount: number): number {
  if (streakCount < SCORING.streakBonusStart) return 0;
  return Math.min(streakCount * SCORING.streakBonusPerAnswer, SCORING.streakBonusMax);
}

/**
 * Calculate perfect bonus (50% of total score)
 */
export function calculatePerfectBonus(score: number): number {
  return Math.round(score * SCORING.perfectBonusMultiplier);
}

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr'];

/**
 * Validate locale
 */
export function isValidLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale);
}
