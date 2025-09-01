/**
 * AstroQuiz Game Rules Configuration
 * Centralized configuration for all game mechanics and rules
 */

'use strict';

const GAME_RULES = {
  // === BASIC GAME CONFIGURATION ===
  general: {
    questionsPerPhase: 10,
    timePerQuestion: 30000, // 30 seconds in milliseconds
    totalPhases: 50,
    minScoreToPass: 0.6, // 60% minimum to pass a phase
    maxRetries: 3, // Maximum retries per phase
    defaultLocale: 'en',
    supportedLocales: ['en', 'pt', 'es', 'fr']
  },

  // === SCORING SYSTEM ===
  scoring: {
    // Base points by difficulty level
    basePoints: {
      1: 10,
      2: 20,
      3: 30,
      4: 40,
      5: 50
    },

    // Speed bonus multipliers (based on time remaining)
    speedBonus: {
      // If answered in first 10 seconds (20s remaining): 2x multiplier
      excellent: { threshold: 20000, multiplier: 2.0 },
      // If answered in first 15 seconds (15s remaining): 1.5x multiplier
      good: { threshold: 15000, multiplier: 1.5 },
      // If answered in first 20 seconds (10s remaining): 1.2x multiplier
      normal: { threshold: 10000, multiplier: 1.2 },
      // If answered in last 10 seconds: 1x multiplier
      slow: { threshold: 0, multiplier: 1.0 }
    },

    // Streak bonus (consecutive correct answers)
    streakBonus: {
      pointsPerStreak: 5, // +5 points for each question in the streak
      maxStreakBonus: 50, // Maximum bonus from streaks
      streakThreshold: 3 // Minimum streak to start getting bonus
    },

    // Penalties
    penalties: {
      wrongAnswer: -5, // Points deducted for wrong answer
      timeout: -10, // Points deducted for timeout
      hint: -3 // Points deducted for using hint (future feature)
    },

    // Perfect phase bonuses
    perfectBonus: {
      enabled: true,
      multiplier: 1.5, // 50% bonus for perfect phase
      minQuestions: 5 // Minimum questions to qualify for perfect bonus
    }
  },

  // === PHASE PROGRESSION SYSTEM ===
  phases: {
    // Phase 1-10: Beginner (Levels 1-2)
    beginner: {
      range: [1, 10],
      levels: [1, 2],
      distribution: {
        1: 0.7, // 70% level 1
        2: 0.3  // 30% level 2
      },
      minScore: 0.6,
      description: 'Basic astronomy concepts'
    },

    // Phase 11-20: Novice (Levels 1-3)
    novice: {
      range: [11, 20],
      levels: [1, 2, 3],
      distribution: {
        1: 0.4, // 40% level 1
        2: 0.4, // 40% level 2
        3: 0.2  // 20% level 3
      },
      minScore: 0.65,
      description: 'Introduction to intermediate concepts'
    },

    // Phase 21-30: Intermediate (Levels 2-4)
    intermediate: {
      range: [21, 30],
      levels: [2, 3, 4],
      distribution: {
        2: 0.3, // 30% level 2
        3: 0.5, // 50% level 3
        4: 0.2  // 20% level 4
      },
      minScore: 0.7,
      description: 'Intermediate astronomy and astrophysics'
    },

    // Phase 31-40: Advanced (Levels 3-5)
    advanced: {
      range: [31, 40],
      levels: [3, 4, 5],
      distribution: {
        3: 0.2, // 20% level 3
        4: 0.5, // 50% level 4
        5: 0.3  // 30% level 5
      },
      minScore: 0.75,
      description: 'Advanced astrophysics and cosmology'
    },

    // Phase 41-50: Elite (Levels 4-5 + Special Challenges)
    elite: {
      range: [41, 50],
      levels: [4, 5],
      distribution: {
        4: 0.3, // 30% level 4
        5: 0.7  // 70% level 5
      },
      minScore: 0.85,
      description: 'Elite challenges and cutting-edge astronomy',
      specialChallenges: true
    }
  },

  // === QUESTION SELECTION ALGORITHM ===
  selection: {
    // Avoid repeating questions
    avoidRepeat: {
      enabled: true,
      recentQuestionsBuffer: 20, // Don't repeat last 20 questions
      topicCooldown: 3 // Wait 3 questions before repeating topic
    },

    // Topic distribution strategy
    topicDistribution: {
      strategy: 'balanced', // 'balanced', 'weighted', 'random'
      maxSameTopicInRow: 2, // Maximum consecutive questions from same topic
      preferredTopics: [], // Can be set dynamically based on user performance
      avoidedTopics: [] // Can be set dynamically based on user struggles
    },

    // Adaptive difficulty
    adaptiveDifficulty: {
      enabled: true,
      performanceWindow: 5, // Look at last 5 answers for adaptation
      adjustmentThreshold: 0.8, // If performance > 80%, increase difficulty
      maxAdjustment: 1, // Maximum level adjustment (+/-1)
      cooldownPeriod: 3 // Wait 3 questions before next adjustment
    }
  },

  // === SPECIAL CHALLENGES (Elite Phases) ===
  specialChallenges: {
    timeAttack: {
      name: 'Time Attack',
      description: 'Answer 5 questions in 60 seconds',
      timeLimit: 60000,
      questionsCount: 5,
      bonusMultiplier: 2.0
    },

    perfectOnly: {
      name: 'Perfect or Nothing',
      description: 'One wrong answer ends the challenge',
      failOnWrong: true,
      bonusMultiplier: 3.0
    },

    bossBattle: {
      name: 'Boss Battle',
      description: 'Face the ultimate astronomy challenge',
      onlyLevel5: true,
      questionsCount: 15,
      timePerQuestion: 45000, // 45 seconds
      bonusMultiplier: 2.5
    }
  },

  // === ACHIEVEMENTS SYSTEM ===
  achievements: {
    // Performance-based achievements
    perfectionist: {
      name: 'Perfectionist',
      description: 'Complete a phase with 100% accuracy',
      condition: 'perfect_phase',
      points: 100
    },

    speedDemon: {
      name: 'Speed Demon',
      description: 'Average response time under 10 seconds',
      condition: 'avg_time_under_10',
      points: 75
    },

    streakMaster: {
      name: 'Streak Master',
      description: 'Get 10 correct answers in a row',
      condition: 'streak_10',
      points: 150
    },

    topicExpert: {
      name: 'Topic Expert',
      description: 'Perfect score on all questions from a topic',
      condition: 'topic_mastery',
      points: 200
    },

    // Progress-based achievements
    rookie: {
      name: 'Rookie Astronomer',
      description: 'Complete your first phase',
      condition: 'complete_phase_1',
      points: 25
    },

    explorer: {
      name: 'Space Explorer',
      description: 'Complete 10 phases',
      condition: 'complete_phase_10',
      points: 100
    },

    master: {
      name: 'Astronomy Master',
      description: 'Complete all 50 phases',
      condition: 'complete_phase_50',
      points: 1000
    }
  },

  // === TIMER AND TIMEOUT HANDLING ===
  timing: {
    warningTime: 10000, // Show warning at 10 seconds remaining
    gracePeriod: 2000, // 2 seconds grace period for network delays
    pauseTimeout: 300000, // 5 minutes maximum pause time
    sessionTimeout: 3600000, // 1 hour session timeout
    autoSaveInterval: 30000 // Auto-save progress every 30 seconds
  },

  // === MULTIPLAYER/COMPETITIVE FEATURES ===
  competitive: {
    leaderboard: {
      enabled: true,
      categories: ['total_score', 'perfect_phases', 'average_speed', 'current_streak'],
      resetPeriod: 'weekly', // 'daily', 'weekly', 'monthly', 'never'
      maxEntries: 100
    },

    dailyChallenges: {
      enabled: true,
      questionsCount: 5,
      bonusMultiplier: 1.5,
      resetTime: '00:00' // UTC midnight
    }
  },

  // === ACCESSIBILITY AND CUSTOMIZATION ===
  accessibility: {
    colorBlindSupport: true,
    fontSizeOptions: ['small', 'medium', 'large', 'extra-large'],
    highContrastMode: true,
    screenReaderSupport: true,
    keyboardNavigation: true
  },

  // === ANALYTICS AND TRACKING ===
  analytics: {
    trackEvents: ['question_answered', 'phase_completed', 'achievement_earned', 'session_started', 'session_ended'],
    performanceMetrics: ['accuracy', 'speed', 'streak', 'difficulty_progression'],
    retentionTracking: true,
    anonymizeData: true
  }
};

// === HELPER FUNCTIONS ===
const GameRulesHelper = {
  /**
   * Get phase configuration for a specific phase number
   */
  getPhaseConfig(phaseNumber) {
    for (const [key, config] of Object.entries(GAME_RULES.phases)) {
      const [min, max] = config.range;
      if (phaseNumber >= min && phaseNumber <= max) {
        return { ...config, type: key, phase: phaseNumber };
      }
    }
    return null;
  },

  /**
   * Calculate points for a correct answer
   */
  calculatePoints(level, timeRemaining, streakCount = 0) {
    const basePoints = GAME_RULES.scoring.basePoints[level] || 0;
    
    // Apply speed bonus
    let speedMultiplier = 1.0;
    for (const [key, bonus] of Object.entries(GAME_RULES.scoring.speedBonus)) {
      if (timeRemaining >= bonus.threshold) {
        speedMultiplier = bonus.multiplier;
        break;
      }
    }

    // Apply streak bonus
    let streakBonus = 0;
    if (streakCount >= GAME_RULES.scoring.streakBonus.streakThreshold) {
      streakBonus = Math.min(
        streakCount * GAME_RULES.scoring.streakBonus.pointsPerStreak,
        GAME_RULES.scoring.streakBonus.maxStreakBonus
      );
    }

    return Math.round((basePoints * speedMultiplier) + streakBonus);
  },

  /**
   * Get difficulty distribution for a phase
   */
  getDifficultyDistribution(phaseNumber) {
    const config = this.getPhaseConfig(phaseNumber);
    return config ? config.distribution : null;
  },

  /**
   * Check if phase qualifies for special challenges
   */
  hasSpecialChallenges(phaseNumber) {
    const config = this.getPhaseConfig(phaseNumber);
    return config && config.specialChallenges === true;
  },

  /**
   * Get minimum score required for a phase
   */
  getMinimumScore(phaseNumber) {
    const config = this.getPhaseConfig(phaseNumber);
    return config ? config.minScore : GAME_RULES.general.minScoreToPass;
  },

  /**
   * Validate game configuration
   */
  validateConfig() {
    const errors = [];
    
    // Check phase ranges don't overlap
    const ranges = Object.values(GAME_RULES.phases).map(p => p.range);
    for (let i = 0; i < ranges.length - 1; i++) {
      if (ranges[i][1] >= ranges[i + 1][0]) {
        errors.push(`Phase ranges overlap: ${ranges[i]} and ${ranges[i + 1]}`);
      }
    }

    // Check distributions sum to 1
    for (const [phaseType, config] of Object.entries(GAME_RULES.phases)) {
      const sum = Object.values(config.distribution).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.001) {
        errors.push(`Distribution for ${phaseType} doesn't sum to 1.0: ${sum}`);
      }
    }

    return errors;
  }
};

module.exports = {
  GAME_RULES,
  GameRulesHelper
};
