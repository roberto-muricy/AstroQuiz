/**
 * Sistema de Ranks - AstroQuiz
 *
 * Níveis de progressão do jogador baseados em XP total
 * Emojis são usados como placeholder - podem ser substituídos por imagens
 */

export interface RankData {
  id: string;
  name: string;
  displayName: string;
  icon: string;           // Emoji placeholder (ou pode ser ImageSourcePropType)
  level: number;
  xpRequired: number;
  color: string;          // Cor temática do rank
}

export const RANKS: Record<string, RankData> = {
  beginner: {
    id: 'beginner',
    name: 'Beginner',
    displayName: 'Iniciante',
    icon: 'sparkles',
    level: 1,
    xpRequired: 0,
    color: '#9CA3AF',
  },
  rookie: {
    id: 'rookie',
    name: 'Rookie',
    displayName: 'Space Rookie',
    icon: 'rocket',
    level: 2,
    xpRequired: 500,
    color: '#60A5FA',
  },
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice',
    displayName: 'Aprendiz',
    icon: 'book-open',
    level: 3,
    xpRequired: 1500,
    color: '#34D399',
  },
  cadet: {
    id: 'cadet',
    name: 'Cadet',
    displayName: 'Cadete',
    icon: 'medal',
    level: 4,
    xpRequired: 3000,
    color: '#FBBF24',
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    displayName: 'Explorador',
    icon: 'telescope',
    level: 5,
    xpRequired: 5000,
    color: '#F472B6',
  },
  challenger: {
    id: 'challenger',
    name: 'Challenger',
    displayName: 'Desafiante',
    icon: 'swords',
    level: 6,
    xpRequired: 8000,
    color: '#FB923C',
  },
  navigator: {
    id: 'navigator',
    name: 'Navigator',
    displayName: 'Navegador',
    icon: 'compass',
    level: 7,
    xpRequired: 12000,
    color: '#A78BFA',
  },
  specialist: {
    id: 'specialist',
    name: 'Specialist',
    displayName: 'Especialista',
    icon: 'target',
    level: 8,
    xpRequired: 17000,
    color: '#22D3EE',
  },
  commander: {
    id: 'commander',
    name: 'Commander',
    displayName: 'Comandante',
    icon: 'shield',
    level: 9,
    xpRequired: 23000,
    color: '#EF4444',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    displayName: 'Elite',
    icon: 'crown',
    level: 10,
    xpRequired: 30000,
    color: '#FFA726',
  },
} as const;

// Array ordenado por nível
export const RANKS_ARRAY = Object.values(RANKS).sort((a, b) => a.level - b.level);

/**
 * Retorna o rank atual baseado no XP total
 */
export const getRankByXP = (totalXP: number): RankData => {
  for (let i = RANKS_ARRAY.length - 1; i >= 0; i--) {
    if (totalXP >= RANKS_ARRAY[i].xpRequired) {
      return RANKS_ARRAY[i];
    }
  }
  return RANKS.beginner;
};

/**
 * Retorna o próximo rank (ou null se já for Elite)
 */
export const getNextRank = (currentRank: RankData): RankData | null => {
  const currentIndex = RANKS_ARRAY.findIndex(r => r.id === currentRank.id);
  return RANKS_ARRAY[currentIndex + 1] || null;
};

/**
 * Calcula XP restante para o próximo rank
 */
export const getXPToNextRank = (currentXP: number, currentRank: RankData): number => {
  const nextRank = getNextRank(currentRank);
  if (!nextRank) return 0;
  return nextRank.xpRequired - currentXP;
};

/**
 * Calcula progresso percentual dentro do rank atual (0-100)
 */
export const getRankProgress = (currentXP: number, currentRank: RankData): number => {
  const nextRank = getNextRank(currentRank);
  if (!nextRank) return 100;

  const xpInCurrentRank = currentXP - currentRank.xpRequired;
  const xpNeededForRank = nextRank.xpRequired - currentRank.xpRequired;

  return Math.round((xpInCurrentRank / xpNeededForRank) * 100);
};

/**
 * Retorna rank pelo ID
 */
export const getRankById = (id: string): RankData => {
  return RANKS[id] || RANKS.beginner;
};

/**
 * Retorna rank pelo nível
 */
export const getRankByLevel = (level: number): RankData => {
  return RANKS_ARRAY.find(r => r.level === level) || RANKS.beginner;
};
