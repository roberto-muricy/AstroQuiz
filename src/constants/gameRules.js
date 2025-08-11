// Regras padrão do jogo
export const DEFAULT_GAME_RULES = {
  // Configurações de Tempo
  timePerQuestion: 15,
  timeBonus: 2,
  timePenalty: 1,
  
  // Configurações de Pontuação
  pointsPerCorrectAnswer: 10,
  pointsPerLevel: 100,
  pointsMultiplier: 1.5,
  streakBonus: 5,
  
  // Configurações de Progresso
  passingPercentage: 80,
  questionsPerLevel: 10,
  maxAttempts: 0, // ilimitado
  
  // Configurações de Dificuldade
  difficultyMultiplier: 1.2,
  unlockRequirement: 2, // 2 estrelas para desbloquear
  
  // Configurações de Conquistas
  achievementThresholds: {
    speedDemon: 120, // 2 minutos
    perfectionist: 95, // 95% precisão
    streakMaster: 5, // 5 acertos seguidos
  },
  
  // Configurações de Modo de Jogo
  allowHints: false,
  allowSkip: false,
  showTimer: true,
  showProgress: true,
  
  // Configurações de Ranking
  rankingUpdateInterval: 5, // 5 minutos
  rankingDisplayLimit: 50,
  
  // Configurações de Notificações
  enableNotifications: true,
  dailyReminder: true,
  achievementNotifications: true,
  
  // Metadados
  lastUpdated: new Date(),
  updatedBy: 'admin',
  version: '1.0.0'
};
