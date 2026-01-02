export interface DifficultyDistribution {
  level: number;
  count: number;
}

// ===== Difficulty by phase (50 fases) =====
export const getDifficultyDistribution = (phase: number): DifficultyDistribution[] => {
  if (phase <= 3) return [{ level: 1, count: 10 }]; // 100% lvl1

  if (phase <= 7) return [
    { level: 1, count: 8 },
    { level: 2, count: 2 },
  ];

  if (phase <= 10) return [
    { level: 1, count: 6 },
    { level: 2, count: 4 },
  ];

  if (phase <= 15) return [
    { level: 2, count: 5 },
    { level: 3, count: 5 },
  ];

  if (phase <= 20) return [
    { level: 2, count: 3 },
    { level: 3, count: 7 },
  ];

  if (phase <= 25) return [
    { level: 3, count: 6 },
    { level: 4, count: 4 },
  ];

  if (phase <= 30) return [
    { level: 3, count: 5 },
    { level: 4, count: 5 },
  ];

  if (phase <= 35) return [
    { level: 3, count: 3 },
    { level: 4, count: 7 },
  ];

  if (phase <= 40) return [
    { level: 4, count: 6 },
    { level: 5, count: 4 },
  ];

  if (phase <= 45) return [
    { level: 4, count: 5 },
    { level: 5, count: 5 },
  ];

  return [{ level: 5, count: 10 }]; // 46-50
};

// ===== XP calculation =====
interface XPCalculation {
  baseXP: number;
  speedBonus: number;
  streakMultiplier: number;
  totalXP: number;
}

const baseXPByLevel: Record<number, number> = {
  1: 10,
  2: 20,
  3: 30,
  4: 50,
  5: 80,
};

export const calculateXP = (
  questionLevel: number,
  timeRemaining: number,
  currentStreak: number
): XPCalculation => {
  const baseXP = baseXPByLevel[questionLevel] || 10;
  const speedBonus = timeRemaining > 20 ? 5 : 0;
  const streakMultiplier = Math.min(currentStreak * 0.1, 2.0);
  const totalXP = Math.floor((baseXP + speedBonus) * (1 + streakMultiplier));
  return { baseXP, speedBonus, streakMultiplier, totalXP };
};

// ===== Player levels =====
export interface PlayerLevel {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

export const playerLevels: PlayerLevel[] = [
  { level: 1, title: 'Space Rookie', xpRequired: 0, icon: '🌟' },
  { level: 2, title: 'Curious Observer', xpRequired: 500, icon: '👀' },
  { level: 3, title: 'Explorer Beginner', xpRequired: 1200, icon: '🔭' },
  { level: 4, title: 'Amateur Astronomer', xpRequired: 2500, icon: '🌙' },
  { level: 5, title: 'Junior Scientist', xpRequired: 5000, icon: '🔬' },
  { level: 6, title: 'Intermediate Explorer', xpRequired: 8000, icon: '🚀' },
  { level: 7, title: 'Expert Astronomer', xpRequired: 12000, icon: '⭐' },
  { level: 8, title: 'Stellar Master', xpRequired: 18000, icon: '💫' },
  { level: 9, title: 'Cosmic Sage', xpRequired: 25000, icon: '🌌' },
  { level: 10, title: 'Galactic Guardian', xpRequired: 35000, icon: '👑' },
];

export const getPlayerLevel = (totalXP: number): PlayerLevel => {
  let currentLevel = playerLevels[0];
  for (const level of playerLevels) {
    if (totalXP >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
};

export const getXPToNextLevel = (totalXP: number): number => {
  const currentLevel = getPlayerLevel(totalXP);
  const idx = playerLevels.findIndex(l => l.level === currentLevel.level);
  const next = playerLevels[idx + 1];
  if (!next) return 0;
  return Math.max(0, next.xpRequired - totalXP);
};

// ===== Phase unlock =====
export interface UnlockRequirement {
  requiredAccuracy: number;
  specialRequirement?: string;
}

export const getUnlockRequirement = (phase: number): UnlockRequirement => {
  if (phase <= 10) return { requiredAccuracy: 0 };
  if (phase <= 20) return { requiredAccuracy: 50 };
  if (phase <= 35) return { requiredAccuracy: 60 };
  if (phase <= 45) return { requiredAccuracy: 70 };
  return { requiredAccuracy: 80, specialRequirement: 'Complete phase 45 with 10/10 correct' };
};

export const isPhaseUnlocked = (
  phase: number,
  previousPhaseStats: { accuracy: number; correctAnswers: number }
): boolean => {
  if (phase <= 10) return true;
  const requirement = getUnlockRequirement(phase);
  if (previousPhaseStats.accuracy < requirement.requiredAccuracy) return false;
  if (phase >= 46 && previousPhaseStats.correctAnswers < 10) return false;
  return true;
};

// ===== Star rating =====
interface StarRating {
  stars: number;
  minAccuracy: number;
  minCorrect: number;
}

export const starRatings: StarRating[] = [
  { stars: 1, minAccuracy: 50, minCorrect: 5 },
  { stars: 2, minAccuracy: 70, minCorrect: 7 },
  { stars: 3, minAccuracy: 90, minCorrect: 9 },
];

export const calculateStarRating = (correctAnswers: number, totalQuestions: number): number => {
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  for (let i = starRatings.length - 1; i >= 0; i--) {
    const rating = starRatings[i];
    if (accuracy >= rating.minAccuracy && correctAnswers >= rating.minCorrect) {
      return rating.stars;
    }
  }
  return 0;
};

// ===== Achievements (placeholder / hook) =====
export interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  condition: (stats: any) => boolean;
}

export const achievements: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete phase 1',
    xpReward: 50,
    icon: '🚀',
    condition: (stats) => stats.phasesCompleted >= 1,
  },
  {
    id: 'rookie_astronomer',
    name: 'Rookie Astronomer',
    description: 'Complete 10 phases',
    xpReward: 200,
    icon: '🔭',
    condition: (stats) => stats.phasesCompleted >= 10,
  },
  {
    id: 'perfect_phase',
    name: 'Perfect Phase',
    description: 'Get 10/10 in a phase',
    xpReward: 100,
    icon: '⭐',
    condition: (stats) => stats.perfectPhases >= 1,
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: 'Get 10 correct answers in a row',
    xpReward: 150,
    icon: '🔥',
    condition: (stats) => stats.maxStreak >= 10,
  },
  {
    id: 'cosmic_master',
    name: 'Cosmic Master',
    description: 'Complete all 50 phases',
    xpReward: 1000,
    icon: '👑',
    condition: (stats) => stats.phasesCompleted >= 50,
  },
];

export const checkAchievements = (stats: any, unlockedAchievements: string[]): Achievement[] => {
  return achievements.filter(
    (ach) => !unlockedAchievements.includes(ach.id) && ach.condition(stats)
  );
};

// ===== Helpers to estimate XP for a phase (fallback) =====
/**
 * Sem dados por questão, estimamos XP usando distribuição da fase e total de acertos.
 * Usa o menor nível para acertos excedentes.
 */
export const estimatePhaseXP = (phase: number, correctAnswers: number): number => {
  const dist = getDifficultyDistribution(phase);
  const expanded: number[] = [];
  dist.forEach(({ level, count }) => {
    for (let i = 0; i < count; i++) expanded.push(level);
  });
  // ordenar do mais fácil para o mais difícil
  expanded.sort((a, b) => a - b);
  let xp = 0;
  for (let i = 0; i < correctAnswers; i++) {
    const lvl = expanded[i] ?? expanded[expanded.length - 1] ?? 1;
    const { totalXP } = calculateXP(lvl, 0, 0); // sem bônus
    xp += totalXP;
  }
  return xp;
};
