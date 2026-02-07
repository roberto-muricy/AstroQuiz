/**
 * Badges System - AstroQuiz
 * Sistema de badges/escudos temáticos
 *
 * NOTA: Usa as imagens existentes em src/assets/images/
 * Não há pasta badges dedicada no projeto atual
 */

export interface BadgeData {
  id: string;
  name: string;
  image: any;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'special';
  description: string;
}

// Imagens disponíveis em src/assets/images/
export const TOPIC_BADGES: Record<string, BadgeData> = {
  target: {
    id: 'target',
    name: 'Desafio',
    image: require('../assets/images/target.png'),
    level: 'special',
    description: 'Desafios diários e missões especiais',
  },
  quiz: {
    id: 'quiz',
    name: 'Quiz',
    image: require('../assets/images/quiz.png'),
    level: 'beginner',
    description: 'Perguntas e respostas',
  },
  stats: {
    id: 'stats',
    name: 'Estatísticas',
    image: require('../assets/images/stats.png'),
    level: 'intermediate',
    description: 'Seu progresso e conquistas',
  },
  achievements: {
    id: 'achievements',
    name: 'Conquistas',
    image: require('../assets/images/achivements.png'), // typo no arquivo original
    level: 'advanced',
    description: 'Badges e troféus conquistados',
  },
  play: {
    id: 'play',
    name: 'Jogar',
    image: require('../assets/images/play.png'),
    level: 'beginner',
    description: 'Iniciar nova partida',
  },
  home: {
    id: 'home',
    name: 'Início',
    image: require('../assets/images/home.png'),
    level: 'beginner',
    description: 'Tela principal',
  },
  profile: {
    id: 'profile',
    name: 'Perfil',
    image: require('../assets/images/profile.png'),
    level: 'beginner',
    description: 'Seu perfil de jogador',
  },
} as const;

export type BadgeId = keyof typeof TOPIC_BADGES;

// Mapeamento de fases para badges
// Como não há badges específicos por tema astronômico,
// usa os badges disponíveis de forma rotativa
export const PHASE_BADGES: Record<number, BadgeData> = {
  1: TOPIC_BADGES.quiz,
  2: TOPIC_BADGES.target,
  3: TOPIC_BADGES.stats,
  4: TOPIC_BADGES.achievements,
  5: TOPIC_BADGES.play,
  // Rotaciona para fases maiores
  6: TOPIC_BADGES.quiz,
  7: TOPIC_BADGES.target,
  8: TOPIC_BADGES.stats,
  9: TOPIC_BADGES.achievements,
  10: TOPIC_BADGES.play,
} as const;

// Helper para pegar badge por número de fase
export const getPhaseBadge = (phaseNumber: number): BadgeData => {
  const normalizedPhase = ((phaseNumber - 1) % 5) + 1;
  return PHASE_BADGES[normalizedPhase] || TOPIC_BADGES.quiz;
};

// Emojis como fallback (já existem no projeto)
export const EMOJI_BADGES = {
  rocket: '🚀',
  fire: '🔥',
  star: '⭐',
  trophy: '🏆',
  target: '🎯',
  locked: '🔒',
  play: '▶️',
} as const;
