/**
 * AstroQuiz Scoring Service
 * Handles all scoring calculations, bonuses, and achievements
 */

'use strict';

const { GAME_RULES, GameRulesHelper } = require('../../../../config/game-rules');

module.exports = () => ({
  /**
   * Calculate points for a single answer
   * @param {Object} answerData - Answer information
   * @param {number} answerData.level - Question difficulty level (1-5)
   * @param {number} answerData.timeRemaining - Time remaining when answered (ms)
   * @param {boolean} answerData.isCorrect - Whether answer was correct
   * @param {number} answerData.streakCount - Current streak count
   * @param {boolean} answerData.isTimeout - Whether answer timed out
   * @returns {Object} Scoring result
   */
  calculateAnswerScore(answerData) {
    const { level, timeRemaining, isCorrect, streakCount = 0, isTimeout = false } = answerData;

    // Initialize result
    const result = {
      basePoints: 0,
      speedBonus: 0,
      streakBonus: 0,
      penalty: 0,
      totalPoints: 0,
      speedMultiplier: 1.0,
      breakdown: {}
    };

    // If answer is incorrect or timed out, apply penalties
    if (!isCorrect) {
      if (isTimeout) {
        result.penalty = GAME_RULES.scoring.penalties.timeout;
        result.breakdown.penalty = 'Timeout penalty';
      } else {
        result.penalty = GAME_RULES.scoring.penalties.wrongAnswer;
        result.breakdown.penalty = 'Wrong answer penalty';
      }
      result.totalPoints = result.penalty;
      return result;
    }

    // Calculate base points for correct answer
    result.basePoints = GAME_RULES.scoring.basePoints[level] || 0;
    result.breakdown.basePoints = `Level ${level} base points`;

    // Calculate speed bonus
    const speedBonusData = this.calculateSpeedBonus(timeRemaining);
    result.speedMultiplier = speedBonusData.multiplier;
    result.speedBonus = Math.round(result.basePoints * (speedBonusData.multiplier - 1));
    result.breakdown.speedBonus = speedBonusData.description;

    // Calculate streak bonus
    const streakBonusData = this.calculateStreakBonus(streakCount);
    result.streakBonus = streakBonusData.bonus;
    result.breakdown.streakBonus = streakBonusData.description;

    // Calculate total points
    result.totalPoints = Math.round(
      (result.basePoints * result.speedMultiplier) + result.streakBonus
    );

    return result;
  },

  /**
   * Calculate speed bonus based on time remaining
   * @param {number} timeRemaining - Time remaining in milliseconds
   * @returns {Object} Speed bonus information
   */
  calculateSpeedBonus(timeRemaining) {
    const bonuses = GAME_RULES.scoring.speedBonus;
    
    for (const [category, bonus] of Object.entries(bonuses)) {
      if (timeRemaining >= bonus.threshold) {
        return {
          category,
          multiplier: bonus.multiplier,
          description: `${category.charAt(0).toUpperCase() + category.slice(1)} speed (${bonus.multiplier}x)`
        };
      }
    }

    return {
      category: 'slow',
      multiplier: 1.0,
      description: 'No speed bonus'
    };
  },

  /**
   * Calculate streak bonus
   * @param {number} streakCount - Current streak count
   * @returns {Object} Streak bonus information
   */
  calculateStreakBonus(streakCount) {
    const streakConfig = GAME_RULES.scoring.streakBonus;
    
    if (streakCount < streakConfig.streakThreshold) {
      return {
        bonus: 0,
        description: `No streak bonus (need ${streakConfig.streakThreshold}+ streak)`
      };
    }

    const bonus = Math.min(
      streakCount * streakConfig.pointsPerStreak,
      streakConfig.maxStreakBonus
    );

    return {
      bonus,
      description: `${streakCount} streak bonus (+${bonus} points)`
    };
  },

  /**
   * Calculate phase completion score and bonuses
   * @param {Object} phaseData - Phase completion data
   * @param {number} phaseData.phaseNumber - Phase number
   * @param {Array} phaseData.answers - Array of answer results
   * @param {number} phaseData.totalTime - Total time taken for phase
   * @returns {Object} Phase scoring result
   */
  calculatePhaseScore(phaseData) {
    const { phaseNumber, answers, totalTime } = phaseData;
    
    const result = {
      questionsTotal: answers.length,
      questionsCorrect: 0,
      totalPoints: 0,
      accuracy: 0,
      averageTime: 0,
      perfectBonus: 0,
      phaseScore: 0,
      achievements: [],
      passed: false,
      grade: 'F'
    };

    // Calculate basic stats
    result.questionsCorrect = answers.filter(a => a.isCorrect).length;
    result.accuracy = result.questionsCorrect / result.questionsTotal;
    result.averageTime = totalTime / result.questionsTotal;

    // Sum up all points from answers
    result.totalPoints = answers.reduce((sum, answer) => sum + (answer.points || 0), 0);

    // Check for perfect phase bonus
    if (result.accuracy === 1.0 && result.questionsTotal >= GAME_RULES.scoring.perfectBonus.minQuestions) {
      if (GAME_RULES.scoring.perfectBonus.enabled) {
        result.perfectBonus = Math.round(result.totalPoints * (GAME_RULES.scoring.perfectBonus.multiplier - 1));
        result.achievements.push('perfect_phase');
      }
    }

    // Calculate final phase score
    result.phaseScore = result.totalPoints + result.perfectBonus;

    // Determine if phase was passed
    const minScore = GameRulesHelper.getMinimumScore(phaseNumber);
    result.passed = result.accuracy >= minScore;

    // Calculate grade
    result.grade = this.calculateGrade(result.accuracy);

    // Check for achievements
    const phaseAchievements = this.checkPhaseAchievements(phaseData, result);
    result.achievements.push(...phaseAchievements);

    return result;
  },

  /**
   * Calculate letter grade based on accuracy
   * @param {number} accuracy - Accuracy as decimal (0.0 to 1.0)
   * @returns {string} Letter grade
   */
  calculateGrade(accuracy) {
    if (accuracy >= 0.95) return 'A+';
    if (accuracy >= 0.90) return 'A';
    if (accuracy >= 0.85) return 'A-';
    if (accuracy >= 0.80) return 'B+';
    if (accuracy >= 0.75) return 'B';
    if (accuracy >= 0.70) return 'B-';
    if (accuracy >= 0.65) return 'C+';
    if (accuracy >= 0.60) return 'C';
    if (accuracy >= 0.55) return 'C-';
    if (accuracy >= 0.50) return 'D';
    return 'F';
  },

  /**
   * Check for achievements earned during phase
   * @param {Object} phaseData - Phase data
   * @param {Object} phaseResult - Phase result
   * @returns {Array} Array of achievement keys
   */
  checkPhaseAchievements(phaseData, phaseResult) {
    const achievements = [];
    const { answers, totalTime } = phaseData;

    // Perfect phase
    if (phaseResult.accuracy === 1.0) {
      achievements.push('perfectionist');
    }

    // Speed demon (average < 10 seconds)
    if (phaseResult.averageTime < 10000) {
      achievements.push('speedDemon');
    }

    // Check for streak achievements
    const maxStreak = this.calculateMaxStreak(answers);
    if (maxStreak >= 10) {
      achievements.push('streakMaster');
    }

    // Topic mastery (all questions from same topic correct)
    const topicMastery = this.checkTopicMastery(answers);
    if (topicMastery.length > 0) {
      achievements.push('topicExpert');
      // Could store which topics were mastered
    }

    return achievements;
  },

  /**
   * Calculate the maximum streak in a set of answers
   * @param {Array} answers - Array of answer objects
   * @returns {number} Maximum streak length
   */
  calculateMaxStreak(answers) {
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
   * Check for topic mastery (perfect score on all questions from specific topics)
   * @param {Array} answers - Array of answer objects with topic information
   * @returns {Array} Array of mastered topics
   */
  checkTopicMastery(answers) {
    const topicStats = {};
    
    // Group answers by topic
    for (const answer of answers) {
      if (!answer.topic) continue;
      
      if (!topicStats[answer.topic]) {
        topicStats[answer.topic] = { total: 0, correct: 0 };
      }
      
      topicStats[answer.topic].total++;
      if (answer.isCorrect) {
        topicStats[answer.topic].correct++;
      }
    }

    // Find topics with perfect scores
    const masteredTopics = [];
    for (const [topic, stats] of Object.entries(topicStats)) {
      if (stats.correct === stats.total && stats.total >= 3) { // Need at least 3 questions
        masteredTopics.push(topic);
      }
    }

    return masteredTopics;
  },

  /**
   * Calculate overall session statistics
   * @param {Array} phases - Array of completed phases
   * @returns {Object} Overall session stats
   */
  calculateSessionStats(phases) {
    const stats = {
      totalPhases: phases.length,
      phasesCompleted: phases.filter(p => p.passed).length,
      totalQuestions: 0,
      totalCorrect: 0,
      totalPoints: 0,
      overallAccuracy: 0,
      averagePhaseScore: 0,
      totalTime: 0,
      achievements: new Set(),
      perfectPhases: 0,
      currentLevel: 1
    };

    // Aggregate stats from all phases
    for (const phase of phases) {
      stats.totalQuestions += phase.questionsTotal;
      stats.totalCorrect += phase.questionsCorrect;
      stats.totalPoints += phase.phaseScore;
      stats.totalTime += phase.totalTime || 0;
      
      if (phase.accuracy === 1.0) {
        stats.perfectPhases++;
      }

      // Collect unique achievements
      if (phase.achievements) {
        phase.achievements.forEach(achievement => stats.achievements.add(achievement));
      }
    }

    // Calculate derived stats
    if (stats.totalQuestions > 0) {
      stats.overallAccuracy = stats.totalCorrect / stats.totalQuestions;
    }

    if (stats.totalPhases > 0) {
      stats.averagePhaseScore = stats.totalPoints / stats.totalPhases;
    }

    // Determine current level based on phases completed
    stats.currentLevel = Math.min(5, Math.floor(stats.phasesCompleted / 10) + 1);

    // Convert achievements set back to array
    stats.achievements = Array.from(stats.achievements);

    return stats;
  },

  /**
   * Calculate leaderboard score (normalized score for comparison)
   * @param {Object} sessionStats - Session statistics
   * @returns {number} Normalized leaderboard score
   */
  calculateLeaderboardScore(sessionStats) {
    const baseScore = sessionStats.totalPoints;
    const accuracyBonus = sessionStats.overallAccuracy * 1000;
    const speedBonus = Math.max(0, (30000 - (sessionStats.totalTime / sessionStats.totalQuestions)) / 100);
    const achievementBonus = sessionStats.achievements.length * 50;
    const perfectBonus = sessionStats.perfectPhases * 100;

    return Math.round(baseScore + accuracyBonus + speedBonus + achievementBonus + perfectBonus);
  },

  /**
   * Get detailed scoring breakdown for analysis
   * @param {Object} sessionData - Complete session data
   * @returns {Object} Detailed breakdown
   */
  getDetailedBreakdown(sessionData) {
    const breakdown = {
      phases: [],
      summary: {},
      recommendations: []
    };

    // Analyze each phase
    for (const phase of sessionData.phases) {
      const phaseBreakdown = {
        phaseNumber: phase.phaseNumber,
        score: phase.phaseScore,
        accuracy: phase.accuracy,
        timeEfficiency: this.calculateTimeEfficiency(phase),
        strongTopics: [],
        weakTopics: [],
        improvements: []
      };

      // Analyze topics performance
      const topicAnalysis = this.analyzeTopicPerformance(phase.answers);
      phaseBreakdown.strongTopics = topicAnalysis.strong;
      phaseBreakdown.weakTopics = topicAnalysis.weak;

      // Generate improvement suggestions
      phaseBreakdown.improvements = this.generateImprovementSuggestions(phase);

      breakdown.phases.push(phaseBreakdown);
    }

    // Generate overall summary
    breakdown.summary = this.calculateSessionStats(sessionData.phases);

    // Generate overall recommendations
    breakdown.recommendations = this.generateOverallRecommendations(breakdown);

    return breakdown;
  },

  /**
   * Calculate time efficiency score
   * @param {Object} phase - Phase data
   * @returns {number} Efficiency score (0-100)
   */
  calculateTimeEfficiency(phase) {
    const averageTime = phase.totalTime / phase.questionsTotal;
    const maxTime = GAME_RULES.general.timePerQuestion;
    const efficiency = Math.max(0, (maxTime - averageTime) / maxTime);
    return Math.round(efficiency * 100);
  },

  /**
   * Analyze topic performance
   * @param {Array} answers - Array of answers
   * @returns {Object} Topic analysis
   */
  analyzeTopicPerformance(answers) {
    const topicStats = {};
    
    for (const answer of answers) {
      if (!answer.topic) continue;
      
      if (!topicStats[answer.topic]) {
        topicStats[answer.topic] = { total: 0, correct: 0, avgTime: 0, totalTime: 0 };
      }
      
      const stats = topicStats[answer.topic];
      stats.total++;
      stats.totalTime += answer.timeUsed || 0;
      
      if (answer.isCorrect) {
        stats.correct++;
      }
    }

    // Calculate averages and categorize
    const strong = [];
    const weak = [];

    for (const [topic, stats] of Object.entries(topicStats)) {
      stats.accuracy = stats.correct / stats.total;
      stats.avgTime = stats.totalTime / stats.total;

      if (stats.accuracy >= 0.8 && stats.total >= 2) {
        strong.push({ topic, accuracy: stats.accuracy, avgTime: stats.avgTime });
      } else if (stats.accuracy < 0.6 && stats.total >= 2) {
        weak.push({ topic, accuracy: stats.accuracy, avgTime: stats.avgTime });
      }
    }

    return { strong, weak };
  },

  /**
   * Generate improvement suggestions for a phase
   * @param {Object} phase - Phase data
   * @returns {Array} Array of improvement suggestions
   */
  generateImprovementSuggestions(phase) {
    const suggestions = [];

    if (phase.accuracy < 0.7) {
      suggestions.push('Focus on accuracy - review fundamental concepts');
    }

    if (phase.averageTime > 20000) {
      suggestions.push('Work on speed - practice quick recall of basic facts');
    }

    const maxStreak = this.calculateMaxStreak(phase.answers);
    if (maxStreak < 3) {
      suggestions.push('Build consistency - avoid careless mistakes');
    }

    return suggestions;
  },

  /**
   * Generate overall recommendations
   * @param {Object} breakdown - Detailed breakdown
   * @returns {Array} Array of recommendations
   */
  generateOverallRecommendations(breakdown) {
    const recommendations = [];
    const summary = breakdown.summary;

    if (summary.overallAccuracy < 0.75) {
      recommendations.push('Focus on improving accuracy through regular practice');
    }

    if (summary.perfectPhases === 0) {
      recommendations.push('Aim for perfect phases to maximize your score');
    }

    const commonWeakTopics = this.findCommonWeakTopics(breakdown.phases);
    if (commonWeakTopics.length > 0) {
      recommendations.push(`Study these challenging topics: ${commonWeakTopics.join(', ')}`);
    }

    return recommendations;
  },

  /**
   * Find topics that appear frequently in weak performance
   * @param {Array} phases - Phase breakdowns
   * @returns {Array} Common weak topics
   */
  findCommonWeakTopics(phases) {
    const weakTopicCounts = {};
    
    for (const phase of phases) {
      for (const weakTopic of phase.weakTopics) {
        weakTopicCounts[weakTopic.topic] = (weakTopicCounts[weakTopic.topic] || 0) + 1;
      }
    }

    return Object.entries(weakTopicCounts)
      .filter(([topic, count]) => count >= 2)
      .map(([topic, count]) => topic);
  }
});
