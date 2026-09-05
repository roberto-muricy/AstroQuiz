/**
 * Quiz Logic
 * Phase distribution, scoring, and selection algorithms
 */

import { randomInt } from 'crypto';

export interface DifficultyDistribution {
  level: number;
  count: number;
}

/**
 * Get difficulty distribution for each phase (1-50)
 * Returns array of {level, count} matching the frontend progressionSystem.ts
 */
export function getDifficultyDistribution(phase: number): DifficultyDistribution[] {
  // Curva recalibrada para a oferta real de perguntas por nível
  // (pool: nv1=45, nv2=109, nv3=159, nv4=146, nv5=57). Cada fase soma 10.

  // Fases 1-3: Iniciante (100% nível 1)
  if (phase <= 3) return [{ level: 1, count: 10 }];

  // Fases 4-6: Introdução ao nível 2
  if (phase <= 6) return [{ level: 1, count: 4 }, { level: 2, count: 6 }];

  // Fase 7: transição (quase tudo nível 2)
  if (phase <= 7) return [{ level: 1, count: 1 }, { level: 2, count: 9 }];

  // Fases 8-10: nível 2 com pitada de 3
  if (phase <= 10) return [{ level: 2, count: 7 }, { level: 3, count: 3 }];

  // Fases 11-18: nível 2/3 equilibrado
  if (phase <= 18) return [{ level: 2, count: 6 }, { level: 3, count: 4 }];

  // Fases 19-22: entra o nível 4
  if (phase <= 22) return [{ level: 2, count: 1 }, { level: 3, count: 6 }, { level: 4, count: 3 }];

  // Fases 23-27: nível 3/4
  if (phase <= 27) return [{ level: 3, count: 6 }, { level: 4, count: 4 }];

  // Fases 28-32: nível 3/4 equilibrado
  if (phase <= 32) return [{ level: 3, count: 5 }, { level: 4, count: 5 }];

  // Fases 33-37: avançado, entra o nível 5
  if (phase <= 37) return [{ level: 3, count: 3 }, { level: 4, count: 5 }, { level: 5, count: 2 }];

  // Fases 38-42: mais nível 5
  if (phase <= 42) return [{ level: 3, count: 2 }, { level: 4, count: 5 }, { level: 5, count: 3 }];

  // Fases 43-47: especialista
  if (phase <= 47) return [{ level: 2, count: 1 }, { level: 3, count: 2 }, { level: 4, count: 4 }, { level: 5, count: 3 }];

  // Fases 48-50: mestre (nível 4/5)
  return [{ level: 4, count: 5 }, { level: 5, count: 5 }];
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ordena um nivel colocando as perguntas ineditas na frente das ja vistas.
 *
 * Por que preferencia e nao filtro: o cliente guarda ate 300 IDs vistos, e o
 * nivel 1 tem 96 perguntas em pt. Um `whereNotIn` puro deixaria quem jogou
 * muito com fases de menos de 10 perguntas. Aqui as ja vistas continuam no
 * sorteio, mas so entram depois que as ineditas do nivel acabam.
 *
 * Cada grupo e embaralhado por conta propria, entao a ordem nao vaza a idade
 * do ID nem torna a fase previsivel.
 *
 * Isto era o bug: o caminho de selecao que roda em producao ignorava a lista
 * inteira. Medido contra o ar antes da correcao — excluindo as 237 perguntas de
 * nivel 1-2 em pt, a fase 1 devolvia 10 perguntas, TODAS da lista excluida.
 */
export function preferirIneditas<T extends { id: number }>(
  doNivel: T[],
  jaVistas: Set<number>
): T[] {
  if (!jaVistas || jaVistas.size === 0) return shuffle(doNivel);
  return [
    ...shuffle(doNivel.filter((q) => !jaVistas.has(q.id))),
    ...shuffle(doNivel.filter((q) => jaVistas.has(q.id))),
  ];
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
  timePerQuestion: 45000,
  // Os limiares sao por tempo RESTANTE. Ao passar de 30s para 45s eles foram
  // deslocados em +15s para manter a mesma exigencia de rapidez de antes:
  // 2.0x continua exigindo resposta em ate 10s, 1.5x ate 15s, 1.2x ate 20s.
  speedMultipliers: [
    { minRemaining: 35000, multiplier: 2.0 },  // Excellent (<10s used)
    { minRemaining: 30000, multiplier: 1.5 },  // Good (<15s used)
    { minRemaining: 25000, multiplier: 1.2 },  // Normal (<20s used)
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
