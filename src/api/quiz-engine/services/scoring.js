'use strict';

const { GAME_RULES, GameRulesHelper } = require('../../../../config/game-rules');

/**
 * Scoring Service
 * Handles all scoring calculations, bonuses, and penalties
 */
module.exports = {
  /**
   * Calculate points for a single answer
   * @param {Object} params - Answer parameters
   * @param {number} params.level - Question difficulty level (1-5)
   * @param {number} params.timeRemaining - Time remaining in milliseconds
   * @param {number} params.isCorrect - Whether answer is correct
   * @param {number} params.currentStreak - Current streak count
   * @param {boolean} params.isTimeout - Whether answer timed out
   * @returns {Object} Scoring result with points and bonuses
   */
  calculateAnswerScore({ level, timeRemaining, isCorrect, currentStreak = 0, isTimeout = false }) {
    if (!isCorrect || isTimeout) {
      const penalty = isTimeout 
        ? GAME_RULES.scoring.penalties.timeout 
        : GAME_RULES.scoring.penalties.wrongAnswer;
      
      return {
        points: penalty,
        basePoints: 0,
        speedBonus: 0,
        speedMultiplier: 1.0,
        streakBonus: 0,
        totalBonus: 0,
        isCorrect: false,
        isTimeout
      };
    }

    // Calculate base points
    const basePoints = GAME_RULES.scoring.basePoints[level] || 0;

    // Calculate speed bonus multiplier
    let speedMultiplier = 1.0;
    let speedBonus = 0;
    
    for (const [key, bonus] of Object.entries(GAME_RULES.scoring.speedBonus)) {
      if (timeRemaining >= bonus.threshold) {
        speedMultiplier = bonus.multiplier;
        speedBonus = basePoints * (speedMultiplier - 1.0);
        break;
      }
    }

    // Calculate streak bonus
    let streakBonus = 0;
    if (currentStreak >= GAME_RULES.scoring.streakBonus.streakThreshold) {
      streakBonus = Math.min(
        currentStreak * GAME_RULES.scoring.streakBonus.pointsPerStreak,
        GAME_RULES.scoring.streakBonus.maxStreakBonus
      );
    }

    const totalPoints = Math.round((basePoints * speedMultiplier) + streakBonus);

    return {
      points: totalPoints,
      basePoints,
      speedBonus: Math.round(speedBonus),
      speedMultiplier,
      streakBonus,
      totalBonus: Math.round(speedBonus + streakBonus),
      isCorrect: true,
      isTimeout: false
    };
  },

  /**
   * Calculate phase result and grade
   * @param {Object} params - Phase completion parameters
   * @param {Array} params.answers - Array of answer results
   * @param {number} params.totalQuestions - Total questions in phase
   * @param {number} params.phaseNumber - Phase number
   * @returns {Object} Phase result with grade, accuracy, and analytics
   */
  calculatePhaseResult({ answers, totalQuestions, phaseNumber }) {
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const wrongAnswers = answers.filter(a => !a.isCorrect && !a.isTimeout).length;
    const timeouts = answers.filter(a => a.isTimeout).length;
    
    const totalScore = answers.reduce((sum, a) => sum + (a.points || 0), 0);
    const maxPossibleScore = totalQuestions * 50; // Assuming max level 5 = 50 points base
    
    const accuracy = correctAnswers / totalQuestions;
    const minScore = GameRulesHelper.getMinimumScore(phaseNumber);
    const passed = accuracy >= minScore;

    // Calculate grade
    let grade = 'F';
    if (accuracy >= 0.95) grade = 'A+';
    else if (accuracy >= 0.85) grade = 'A';
    else if (accuracy >= 0.75) grade = 'B';
    else if (accuracy >= 0.65) grade = 'C';
    else if (accuracy >= 0.50) grade = 'D';

    // Calculate analytics
    const times = answers.map(a => a.timeUsed || 0).filter(t => t > 0);
    const averageTime = times.length > 0 
      ? times.reduce((sum, t) => sum + t, 0) / times.length 
      : 0;
    const fastestAnswer = times.length > 0 ? Math.min(...times) : 0;
    const slowestAnswer = times.length > 0 ? Math.max(...times) : 0;

    const streakBonuses = answers
      .map(a => a.streakBonus || 0)
      .reduce((sum, b) => sum + b, 0);
    const speedBonuses = answers
      .map(a => a.speedBonus || 0)
      .reduce((sum, b) => sum + b, 0);

    // Check for perfect phase bonus
    const isPerfect = correctAnswers === totalQuestions && totalQuestions >= GAME_RULES.scoring.perfectBonus.minQuestions;
    const perfectBonus = isPerfect 
      ? Math.round(totalScore * (GAME_RULES.scoring.perfectBonus.multiplier - 1.0))
      : 0;

    const finalScore = totalScore + perfectBonus;

    // Generate recommendations
    const recommendations = [];
    if (accuracy < minScore) {
      recommendations.push('Practice more questions to improve your accuracy');
    }
    if (averageTime > 25000) {
      recommendations.push('Try to answer faster to earn speed bonuses');
    }
    if (streakBonuses === 0 && correctAnswers > 0) {
      recommendations.push('Build longer streaks to earn bonus points');
    }
    if (timeouts > 0) {
      recommendations.push('Manage your time better to avoid timeouts');
    }

    return {
      totalScore: finalScore,
      maxScore: maxPossibleScore,
      accuracy: Math.round(accuracy * 100) / 100,
      grade,
      passed,
      correctAnswers,
      wrongAnswers,
      timeouts,
      totalQuestions,
      analytics: {
        averageTime: Math.round(averageTime),
        fastestAnswer,
        slowestAnswer,
        streakBonus: streakBonuses,
        speedBonus: speedBonuses,
        perfectBonus
      },
      recommendations,
      isPerfect
    };
  },

  /**
   * Get session statistics
   * @param {Object} session - Session object
   * @returns {Object} Session statistics
   */
  getSessionStats(session) {
    const { answers = [], currentQuestionIndex = 0, totalQuestions = 10 } = session;
    const answeredQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const accuracy = answeredQuestions > 0 ? correctAnswers / answeredQuestions : 0;
    const currentStreak = this.calculateCurrentStreak(answers);
    const maxStreak = this.calculateMaxStreak(answers);

    return {
      progress: {
        currentQuestion: currentQuestionIndex + 1,
        totalQuestions,
        percentage: Math.round((answeredQuestions / totalQuestions) * 100)
      },
      performance: {
        accuracy: Math.round(accuracy * 100) / 100,
        averageTime: this.calculateAverageTime(answers),
        currentStreak,
        maxStreak,
        correctAnswers,
        wrongAnswers: answeredQuestions - correctAnswers
      },
      score: {
        total: session.score || 0,
        average: answeredQuestions > 0 ? Math.round((session.score || 0) / answeredQuestions) : 0
      }
    };
  },

  /**
   * Calculate current streak from answers
   */
  calculateCurrentStreak(answers) {
    if (!answers || answers.length === 0) return 0;
    
    let streak = 0;
    for (let i = answers.length - 1; i >= 0; i--) {
      if (answers[i].isCorrect) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  /**
   * Calculate maximum streak from answers
   */
  calculateMaxStreak(answers) {
    if (!answers || answers.length === 0) return 0;
    
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const answer of answers) {
      if (answer.isCorrect) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  },

  /**
   * Calculate average time from answers
   */
  calculateAverageTime(answers) {
    const times = answers
      .map(a => a.timeUsed || 0)
      .filter(t => t > 0);
    
    if (times.length === 0) return 0;
    
    return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
  }
};


