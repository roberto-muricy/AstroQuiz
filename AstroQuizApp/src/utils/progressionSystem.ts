export interface DifficultyDistribution {
  level: number;
  count: number;
}

// ===== Difficulty by phase (50 fases) =====
// Curva recalibrada para a oferta real de perguntas por nível
// (pool: nv1=45, nv2=109, nv3=159, nv4=146, nv5=57). Deve casar com
// getDifficultyDistribution do backend (src/services/quiz-logic.ts).
export const getDifficultyDistribution = (phase: number): DifficultyDistribution[] => {
  if (phase <= 3) return [{ level: 1, count: 10 }]; // 100% lvl1

  if (phase <= 6) return [
    { level: 1, count: 4 },
    { level: 2, count: 6 },
  ];

  if (phase <= 7) return [
    { level: 1, count: 1 },
    { level: 2, count: 9 },
  ];

  if (phase <= 10) return [
    { level: 2, count: 7 },
    { level: 3, count: 3 },
  ];

  if (phase <= 18) return [
    { level: 2, count: 6 },
    { level: 3, count: 4 },
  ];

  if (phase <= 22) return [
    { level: 2, count: 1 },
    { level: 3, count: 6 },
    { level: 4, count: 3 },
  ];

  if (phase <= 27) return [
    { level: 3, count: 6 },
    { level: 4, count: 4 },
  ];

  if (phase <= 32) return [
    { level: 3, count: 5 },
    { level: 4, count: 5 },
  ];

  if (phase <= 37) return [
    { level: 3, count: 3 },
    { level: 4, count: 5 },
    { level: 5, count: 2 },
  ];

  if (phase <= 42) return [
    { level: 3, count: 2 },
    { level: 4, count: 5 },
    { level: 5, count: 3 },
  ];

  if (phase <= 47) return [
    { level: 2, count: 1 },
    { level: 3, count: 2 },
    { level: 4, count: 4 },
    { level: 5, count: 3 },
  ];

  return [
    { level: 4, count: 5 },
    { level: 5, count: 5 },
  ]; // 48-50
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

/**
 * Nome do ícone Lucide de cada patente. Guardamos o nome, e não o componente,
 * para que este arquivo continue sendo dados puros — quem desenha é o
 * componente RankIcon.
 */
export type RankIconName =
  | 'Sparkle'
  | 'Flame'
  | 'Binoculars'
  | 'Telescope'
  | 'MoonStar'
  | 'Microscope'
  | 'Rocket'
  | 'Star'
  | 'Sparkles'
  | 'Orbit'
  | 'Crown';

export interface PlayerLevel {
  level: number;
  title: string;
  xpRequired: number;
  icon: RankIconName;
}

export const playerLevels: PlayerLevel[] = [
  { level: 1, title: 'Space Rookie', xpRequired: 0, icon: 'Sparkle' },
  { level: 2, title: 'Curious Observer', xpRequired: 500, icon: 'Binoculars' },
  { level: 3, title: 'Explorer Beginner', xpRequired: 1200, icon: 'Telescope' },
  { level: 4, title: 'Amateur Astronomer', xpRequired: 2500, icon: 'MoonStar' },
  { level: 5, title: 'Junior Scientist', xpRequired: 5000, icon: 'Microscope' },
  { level: 6, title: 'Intermediate Explorer', xpRequired: 8000, icon: 'Rocket' },
  { level: 7, title: 'Expert Astronomer', xpRequired: 12000, icon: 'Star' },
  { level: 8, title: 'Stellar Master', xpRequired: 18000, icon: 'Sparkles' },
  { level: 9, title: 'Cosmic Sage', xpRequired: 25000, icon: 'Orbit' },
  { level: 10, title: 'Galactic Guardian', xpRequired: 35000, icon: 'Crown' },
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
/**
 * Espelha SCORING.passThreshold do servidor (src/services/quiz-logic.ts).
 * Sao dois lugares porque o app decide o desbloqueio localmente, sem consultar
 * o servidor. Se um mudar sem o outro, o jogador volta a poder ser aprovado e
 * barrado ao mesmo tempo.
 */
export const MIN_ACERTO_PARA_PASSAR = 60;

export interface UnlockRequirement {
  requiredAccuracy: number;
  specialRequirement?: string;
}

/**
 * Exigencia para destravar uma fase: 60% em todas as 50.
 *
 * Antes era uma escada 0 / 50 / 60 / 70 / 80%, com "10 de 10 na fase anterior"
 * a partir da 46. Ela nao vinha de lugar nenhum acordado: o SERVIDOR sempre
 * aprovou com SCORING.passThreshold = 60 para as 50 fases, e o campo
 * `nextPhaseUnlocked` que ele devolvia era decorativo, porque quem decidia era
 * esta funcao. Da fase 36 em diante o jogador podia ser aprovado e barrado ao
 * mesmo tempo.
 *
 * A curva ficou plana por decisao de produto: a dificuldade ja sobe pelas
 * PERGUNTAS — nivel medio 1,0 na fase 1 contra 4,5 na fase 50, por
 * getDifficultyDistribution. Acertar 60% de perguntas nivel 4-5 e muito mais
 * dificil que 60% de nivel 1. Uma segunda curva por cima disso compunha, e a
 * regra do 10 de 10 era a pior parte: uma unica falha em dez perguntas das mais
 * dificeis travava a progressao.
 *
 * Se um dia a analitica mostrar que ninguem trava em lugar nenhum, da para
 * reintroduzir a escada com dado na mao. Hoje nao ha dado.
 */
export const getUnlockRequirement = (_phase: number): UnlockRequirement => {
  return { requiredAccuracy: MIN_ACERTO_PARA_PASSAR };
};

export const isPhaseUnlocked = (
  phase: number,
  previousPhaseStats: { accuracy: number; correctAnswers: number }
): boolean => {
  if (phase <= 10) return true;
  return previousPhaseStats.accuracy >= MIN_ACERTO_PARA_PASSAR;
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

// ===== Achievements =====
/**
 * Conquistas.
 *
 * `nomeChave` e `descricaoChave` sao chaves de i18n, nao texto. Antes eram
 * strings fixas em ingles, e o pop-up saia meio traduzido: "Conquista
 * Desbloqueada!" em portugues e "Complete phase I" logo abaixo. Aparece para
 * todo jogador que termina a fase 1 — ou seja, para todos.
 *
 * `icon` e um RankIconName (Lucide), nao emoji. Os cinco emojis que viviam aqui
 * escaparam da padronizacao de icones do resto do app.
 */
export interface Achievement {
  id: string;
  nomeChave: string;
  descricaoChave: string;
  xpReward: number;
  icon: RankIconName;
  condition: (stats: any) => boolean;
}

export const achievements: Achievement[] = [
  {
    id: 'first_steps',
    nomeChave: 'achievements.firstSteps.name',
    descricaoChave: 'achievements.firstSteps.description',
    xpReward: 50,
    icon: 'Rocket',
    condition: (stats) => stats.phasesCompleted >= 1,
  },
  {
    id: 'rookie_astronomer',
    nomeChave: 'achievements.rookieAstronomer.name',
    descricaoChave: 'achievements.rookieAstronomer.description',
    xpReward: 200,
    icon: 'Telescope',
    condition: (stats) => stats.phasesCompleted >= 10,
  },
  {
    id: 'perfect_phase',
    nomeChave: 'achievements.perfectPhase.name',
    descricaoChave: 'achievements.perfectPhase.description',
    xpReward: 100,
    icon: 'Star',
    condition: (stats) => stats.perfectPhases >= 1,
  },
  {
    id: 'hot_streak',
    nomeChave: 'achievements.hotStreak.name',
    descricaoChave: 'achievements.hotStreak.description',
    xpReward: 150,
    icon: 'Flame',
    condition: (stats) => stats.maxStreak >= 10,
  },
  {
    id: 'cosmic_master',
    nomeChave: 'achievements.cosmicMaster.name',
    descricaoChave: 'achievements.cosmicMaster.description',
    xpReward: 1000,
    icon: 'Crown',
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
