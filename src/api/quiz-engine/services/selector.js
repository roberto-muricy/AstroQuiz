/**
 * AstroQuiz Question Selector Service
 * Intelligent question selection with adaptive difficulty and balanced distribution
 */

'use strict';

const { GAME_RULES, GameRulesHelper } = require('../../../../config/game-rules');

module.exports = () => ({
  /**
   * Select questions for a specific phase
   * @param {Object} options - Selection options
   * @param {number} options.phaseNumber - Current phase number
   * @param {string} options.locale - Language locale
   * @param {Array} options.excludeQuestions - Question IDs to exclude
   * @param {Array} options.recentTopics - Recently used topics to avoid
   * @param {Object} options.userPerformance - User's recent performance data
   * @returns {Promise<Array>} Array of selected questions
   */
  async selectPhaseQuestions(options) {
    const {
      phaseNumber,
      locale = 'en',
      excludeQuestions = [],
      recentTopics = [],
      userPerformance = null
    } = options;

    // Get phase configuration
    const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
    if (!phaseConfig) {
      throw new Error(`Invalid phase number: ${phaseNumber}`);
    }

    // Get difficulty distribution for this phase
    const difficultyDistribution = this.calculateDifficultyDistribution(phaseConfig, userPerformance);
    
    // Get available questions pool
    const questionsPool = await this.getQuestionsPool(locale, phaseConfig.levels, excludeQuestions);
    
    if (questionsPool.length === 0) {
      throw new Error(`No questions available for phase ${phaseNumber} in locale ${locale}`);
    }

    // Select questions using intelligent algorithm
    const selectedQuestions = await this.intelligentSelection({
      pool: questionsPool,
      count: GAME_RULES.general.questionsPerPhase,
      difficultyDistribution,
      recentTopics,
      userPerformance,
      phaseConfig
    });

    // Shuffle selected questions to randomize order
    return this.shuffleArray(selectedQuestions);
  },

  /**
   * Calculate difficulty distribution based on phase config and user performance
   * @param {Object} phaseConfig - Phase configuration
   * @param {Object} userPerformance - User performance data
   * @returns {Object} Adjusted difficulty distribution
   */
  calculateDifficultyDistribution(phaseConfig, userPerformance) {
    let distribution = { ...phaseConfig.distribution };

    // Apply adaptive difficulty if enabled and user performance data exists
    if (GAME_RULES.selection.adaptiveDifficulty.enabled && userPerformance) {
      distribution = this.applyAdaptiveDifficulty(distribution, userPerformance);
    }

    return distribution;
  },

  /**
   * Apply adaptive difficulty based on user performance
   * @param {Object} baseDistribution - Base difficulty distribution
   * @param {Object} userPerformance - User performance data
   * @returns {Object} Adjusted distribution
   */
  applyAdaptiveDifficulty(baseDistribution, userPerformance) {
    const { performanceWindow, adjustmentThreshold, maxAdjustment } = GAME_RULES.selection.adaptiveDifficulty;
    
    // Calculate recent performance
    const recentAnswers = userPerformance.recentAnswers || [];
    if (recentAnswers.length < performanceWindow) {
      return baseDistribution; // Not enough data for adjustment
    }

    const recentAccuracy = recentAnswers
      .slice(-performanceWindow)
      .reduce((sum, answer) => sum + (answer.isCorrect ? 1 : 0), 0) / performanceWindow;

    const adjustedDistribution = { ...baseDistribution };

    // If performance is high, increase difficulty
    if (recentAccuracy > adjustmentThreshold) {
      const levels = Object.keys(adjustedDistribution).map(Number).sort();
      const maxLevel = Math.max(...levels);
      const minLevel = Math.min(...levels);

      // Shift distribution towards higher levels
      for (let level = minLevel; level < maxLevel; level++) {
        if (adjustedDistribution[level] && adjustedDistribution[level + 1] !== undefined) {
          const shift = Math.min(adjustedDistribution[level] * 0.2, 0.1); // Max 20% shift, cap at 10%
          adjustedDistribution[level] -= shift;
          adjustedDistribution[level + 1] += shift;
        }
      }
    }
    // If performance is low, decrease difficulty
    else if (recentAccuracy < (adjustmentThreshold - 0.2)) {
      const levels = Object.keys(adjustedDistribution).map(Number).sort((a, b) => b - a);
      const maxLevel = Math.max(...levels);
      const minLevel = Math.min(...levels);

      // Shift distribution towards lower levels
      for (let level = maxLevel; level > minLevel; level--) {
        if (adjustedDistribution[level] && adjustedDistribution[level - 1] !== undefined) {
          const shift = Math.min(adjustedDistribution[level] * 0.2, 0.1); // Max 20% shift, cap at 10%
          adjustedDistribution[level] -= shift;
          adjustedDistribution[level - 1] += shift;
        }
      }
    }

    return adjustedDistribution;
  },

  /**
   * Get available questions pool from database
   * @param {string} locale - Language locale
   * @param {Array} levels - Allowed difficulty levels
   * @param {Array} excludeQuestions - Question IDs to exclude
   * @returns {Promise<Array>} Questions pool
   */
  async getQuestionsPool(locale, levels, excludeQuestions) {
    try {
      const questions = await strapi.entityService.findMany('api::question.question', {
        filters: {
          locale: { $eq: locale },
          level: { $in: levels },
          ...(excludeQuestions.length > 0 && {
            documentId: { $notIn: excludeQuestions }
          })
        },
        populate: ['localizations'],
        publicationState: 'live',
        pagination: {
          start: 0,
          limit: -1 // Get all matching questions
        }
      });

      return questions || [];
    } catch (error) {
      strapi.log.error('Error fetching questions pool:', error);
      throw new Error('Failed to fetch questions pool');
    }
  },

  /**
   * Intelligent question selection algorithm
   * @param {Object} options - Selection options
   * @returns {Array} Selected questions
   */
  async intelligentSelection(options) {
    const { pool, count, difficultyDistribution, recentTopics, userPerformance, phaseConfig } = options;

    // Group questions by level and topic
    const questionsByLevel = this.groupQuestionsByLevel(pool);
    const questionsByTopic = this.groupQuestionsByTopic(pool);

    // Calculate target counts for each difficulty level
    const targetCounts = this.calculateTargetCounts(difficultyDistribution, count);

    // Track selection state
    const selectionState = {
      selected: [],
      usedTopics: [...recentTopics],
      topicCooldown: new Map(),
      levelCounts: {}
    };

    // Initialize level counts
    Object.keys(difficultyDistribution).forEach(level => {
      selectionState.levelCounts[level] = 0;
    });

    // Select questions for each difficulty level
    for (const [level, targetCount] of Object.entries(targetCounts)) {
      if (targetCount === 0) continue;

      const levelQuestions = questionsByLevel[level] || [];
      if (levelQuestions.length === 0) continue;

      const selectedForLevel = await this.selectQuestionsForLevel({
        questions: levelQuestions,
        targetCount,
        selectionState,
        questionsByTopic,
        userPerformance
      });

      selectionState.selected.push(...selectedForLevel);
      selectionState.levelCounts[level] = selectedForLevel.length;
    }

    // If we don't have enough questions, fill with best available
    if (selectionState.selected.length < count) {
      const remaining = count - selectionState.selected.length;
      const availableQuestions = pool.filter(q => 
        !selectionState.selected.find(s => s.documentId === q.documentId)
      );
      
      const fillerQuestions = this.selectFillerQuestions(availableQuestions, remaining, selectionState);
      selectionState.selected.push(...fillerQuestions);
    }

    return selectionState.selected.slice(0, count);
  },

  /**
   * Select questions for a specific difficulty level
   * @param {Object} options - Selection options
   * @returns {Array} Selected questions for the level
   */
  async selectQuestionsForLevel(options) {
    const { questions, targetCount, selectionState, questionsByTopic, userPerformance } = options;
    const selected = [];

    // Create a weighted list of questions based on various factors
    const weightedQuestions = questions.map(question => ({
      question,
      weight: this.calculateQuestionWeight(question, selectionState, userPerformance)
    }));

    // Sort by weight (higher is better)
    weightedQuestions.sort((a, b) => b.weight - a.weight);

    // Select questions while respecting topic distribution rules
    for (const { question } of weightedQuestions) {
      if (selected.length >= targetCount) break;

      // Check if we can select this question based on topic rules
      if (this.canSelectQuestion(question, selectionState)) {
        selected.push(question);
        this.updateSelectionState(question, selectionState);
      }
    }

    return selected;
  },

  /**
   * Calculate weight for question selection
   * @param {Object} question - Question object
   * @param {Object} selectionState - Current selection state
   * @param {Object} userPerformance - User performance data
   * @returns {number} Question weight
   */
  calculateQuestionWeight(question, selectionState, userPerformance) {
    let weight = 100; // Base weight

    // Reduce weight for recently used topics
    const topicCooldown = selectionState.topicCooldown.get(question.topic) || 0;
    if (topicCooldown > 0) {
      weight -= (topicCooldown * 20); // -20 points per cooldown step
    }

    // Increase weight for topics user struggles with (if performance data available)
    if (userPerformance && userPerformance.topicPerformance) {
      const topicPerf = userPerformance.topicPerformance[question.topic];
      if (topicPerf && topicPerf.accuracy < 0.7) {
        weight += 30; // Boost questions from weak topics
      }
    }

    // Add randomness to prevent completely predictable selection
    weight += Math.random() * 20 - 10; // ±10 random points

    return weight;
  },

  /**
   * Check if a question can be selected based on topic rules
   * @param {Object} question - Question to check
   * @param {Object} selectionState - Current selection state
   * @returns {boolean} Whether question can be selected
   */
  canSelectQuestion(question, selectionState) {
    const { maxSameTopicInRow } = GAME_RULES.selection.topicDistribution;
    
    // Check topic cooldown
    const cooldown = selectionState.topicCooldown.get(question.topic) || 0;
    if (cooldown > 0) return false;

    // Check consecutive topic limit
    const recentQuestions = selectionState.selected.slice(-maxSameTopicInRow);
    const consecutiveSameTopic = recentQuestions.every(q => q.topic === question.topic);
    
    if (recentQuestions.length >= maxSameTopicInRow && consecutiveSameTopic) {
      return false;
    }

    return true;
  },

  /**
   * Update selection state after selecting a question
   * @param {Object} question - Selected question
   * @param {Object} selectionState - Selection state to update
   */
  updateSelectionState(question, selectionState) {
    // Add to used topics
    if (!selectionState.usedTopics.includes(question.topic)) {
      selectionState.usedTopics.push(question.topic);
    }

    // Update topic cooldown
    const { topicCooldown } = GAME_RULES.selection.avoidRepeat;
    selectionState.topicCooldown.set(question.topic, topicCooldown);

    // Decrease all cooldowns
    for (const [topic, cooldown] of selectionState.topicCooldown.entries()) {
      if (cooldown > 0) {
        selectionState.topicCooldown.set(topic, cooldown - 1);
      }
    }
  },

  /**
   * Select filler questions when target count isn't met
   * @param {Array} availableQuestions - Remaining available questions
   * @param {number} count - Number of filler questions needed
   * @param {Object} selectionState - Current selection state
   * @returns {Array} Filler questions
   */
  selectFillerQuestions(availableQuestions, count, selectionState) {
    // Sort by level (prefer questions from allowed levels)
    const sortedQuestions = availableQuestions.sort((a, b) => {
      const aInRange = Object.keys(selectionState.levelCounts).includes(a.level.toString());
      const bInRange = Object.keys(selectionState.levelCounts).includes(b.level.toString());
      
      if (aInRange && !bInRange) return -1;
      if (!aInRange && bInRange) return 1;
      return 0;
    });

    return sortedQuestions.slice(0, count);
  },

  /**
   * Group questions by difficulty level
   * @param {Array} questions - Questions array
   * @returns {Object} Questions grouped by level
   */
  groupQuestionsByLevel(questions) {
    return questions.reduce((groups, question) => {
      const level = question.level.toString();
      if (!groups[level]) groups[level] = [];
      groups[level].push(question);
      return groups;
    }, {});
  },

  /**
   * Group questions by topic
   * @param {Array} questions - Questions array
   * @returns {Object} Questions grouped by topic
   */
  groupQuestionsByTopic(questions) {
    return questions.reduce((groups, question) => {
      const topic = question.topic;
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(question);
      return groups;
    }, {});
  },

  /**
   * Calculate target question counts for each difficulty level
   * @param {Object} distribution - Difficulty distribution
   * @param {number} totalCount - Total questions needed
   * @returns {Object} Target counts by level
   */
  calculateTargetCounts(distribution, totalCount) {
    const targetCounts = {};
    let assignedCount = 0;

    // Calculate exact counts and track remainder
    const exactCounts = {};
    const remainders = {};

    for (const [level, percentage] of Object.entries(distribution)) {
      const exactCount = totalCount * percentage;
      exactCounts[level] = Math.floor(exactCount);
      remainders[level] = exactCount - exactCounts[level];
      assignedCount += exactCounts[level];
    }

    // Distribute remaining questions based on largest remainders
    const remaining = totalCount - assignedCount;
    const sortedByRemainder = Object.entries(remainders)
      .sort(([,a], [,b]) => b - a)
      .slice(0, remaining);

    // Assign final counts
    for (const [level] of Object.entries(distribution)) {
      targetCounts[level] = exactCounts[level];
    }

    for (const [level] of sortedByRemainder) {
      targetCounts[level]++;
    }

    return targetCounts;
  },

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Get questions for special challenges
   * @param {Object} challengeType - Type of special challenge
   * @param {string} locale - Language locale
   * @param {Array} excludeQuestions - Questions to exclude
   * @returns {Promise<Array>} Challenge questions
   */
  async selectChallengeQuestions(challengeType, locale, excludeQuestions = []) {
    const challenge = GAME_RULES.specialChallenges[challengeType];
    if (!challenge) {
      throw new Error(`Unknown challenge type: ${challengeType}`);
    }

    let filters = {
      locale: { $eq: locale },
      ...(excludeQuestions.length > 0 && {
        documentId: { $notIn: excludeQuestions }
      })
    };

    // Apply challenge-specific filters
    if (challenge.onlyLevel5) {
      filters.level = { $eq: 5 };
    }

    const questions = await strapi.entityService.findMany('api::question.question', {
      filters,
      publicationState: 'live',
      pagination: {
        start: 0,
        limit: challenge.questionsCount * 2 // Get more than needed for selection
      }
    });

    // Randomly select required count
    const shuffled = this.shuffleArray(questions || []);
    return shuffled.slice(0, challenge.questionsCount);
  },

  /**
   * Analyze question pool statistics
   * @param {string} locale - Language locale
   * @returns {Promise<Object>} Pool statistics
   */
  async analyzeQuestionPool(locale) {
    try {
      const allQuestions = await strapi.entityService.findMany('api::question.question', {
        filters: { locale: { $eq: locale } },
        publicationState: 'live',
        pagination: { start: 0, limit: -1 }
      });

      const stats = {
        total: allQuestions.length,
        byLevel: {},
        byTopic: {},
        distribution: {},
        coverage: {}
      };

      // Count by level
      for (let level = 1; level <= 5; level++) {
        stats.byLevel[level] = allQuestions.filter(q => q.level === level).length;
      }

      // Count by topic
      stats.byTopic = allQuestions.reduce((counts, question) => {
        counts[question.topic] = (counts[question.topic] || 0) + 1;
        return counts;
      }, {});

      // Calculate distribution percentages
      for (const [level, count] of Object.entries(stats.byLevel)) {
        stats.distribution[level] = stats.total > 0 ? count / stats.total : 0;
      }

      // Analyze coverage for each phase type
      for (const [phaseType, config] of Object.entries(GAME_RULES.phases)) {
        const availableForPhase = allQuestions.filter(q => config.levels.includes(q.level));
        stats.coverage[phaseType] = {
          available: availableForPhase.length,
          needed: GAME_RULES.general.questionsPerPhase * (config.range[1] - config.range[0] + 1),
          ratio: availableForPhase.length / (GAME_RULES.general.questionsPerPhase * (config.range[1] - config.range[0] + 1))
        };
      }

      return stats;
    } catch (error) {
      strapi.log.error('Error analyzing question pool:', error);
      throw new Error('Failed to analyze question pool');
    }
  },

  /**
   * Validate question selection configuration
   * @returns {Array} Array of validation errors
   */
  validateSelectionConfig() {
    const errors = [];

    // Check if distributions sum to 1.0
    for (const [phaseType, config] of Object.entries(GAME_RULES.phases)) {
      const sum = Object.values(config.distribution).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.001) {
        errors.push(`Distribution for ${phaseType} doesn't sum to 1.0: ${sum}`);
      }
    }

    // Check if all required levels are present in distributions
    for (const [phaseType, config] of Object.entries(GAME_RULES.phases)) {
      for (const level of config.levels) {
        if (!config.distribution[level]) {
          errors.push(`Level ${level} missing from ${phaseType} distribution`);
        }
      }
    }

    return errors;
  }
});
