'use strict';

const { GAME_RULES, GameRulesHelper } = require('../../../../config/game-rules');

/**
 * Selector Service
 * Handles intelligent question selection for phases
 */
module.exports = {
  /**
   * Select questions for a phase
   * @param {Object} params - Selection parameters
   * @param {number} params.phaseNumber - Phase number (1-50)
   * @param {string} params.locale - Language locale
   * @param {Array} params.excludeQuestions - Question IDs to exclude
   * @param {Array} params.recentTopics - Recent topics to avoid
   * @param {Object} params.userPerformance - User performance data
   * @returns {Promise<Array>} Selected questions
   */
  async selectPhaseQuestions({ phaseNumber, locale = 'en', excludeQuestions = [], recentTopics = [], userPerformance = {} }) {
    // Get phase configuration
    const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
    if (!phaseConfig) {
      throw new Error(`Invalid phase number: ${phaseNumber}`);
    }

    // Get questions from database
    const questions = await this.getAvailableQuestions({
      locale,
      levels: phaseConfig.levels,
      excludeQuestions,
      phaseNumber
    });

    if (questions.length < GAME_RULES.general.questionsPerPhase) {
      strapi.log.warn(`Not enough questions available for phase ${phaseNumber}. Found: ${questions.length}, Required: ${GAME_RULES.general.questionsPerPhase}`);
    }

    // Calculate distribution
    const distribution = this.calculateDistribution(phaseConfig, questions.length);
    
    // Select questions based on distribution
    const selectedQuestions = this.selectByDistribution({
      questions,
      distribution,
      phaseConfig,
      recentTopics,
      excludeQuestions
    });

    // Shuffle to avoid predictable patterns
    return this.shuffleArray(selectedQuestions);
  },

  /**
   * Get available questions from database
   */
  async getAvailableQuestions({ locale, levels, excludeQuestions, phaseNumber }) {
    try {
      const filters = {
        locale: { $eq: locale },
        level: { $in: levels },
        publishedAt: { $notNull: true }
      };

      // Exclude specific questions
      if (excludeQuestions.length > 0) {
        filters.id = { $notIn: excludeQuestions };
      }

      const questions = await strapi.entityService.findMany('api::question.question', {
        filters,
        locale,
        limit: 1000, // Get a large pool
        sort: { level: 'asc' }
      });

      return questions.map(q => ({
        id: q.id,
        documentId: q.documentId,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        level: q.level,
        topic: q.topic || 'general',
        explanation: q.explanation,
        locale: q.locale
      }));
    } catch (error) {
      strapi.log.error('Error fetching questions:', error);
      throw error;
    }
  },

  /**
   * Calculate question distribution by level
   */
  calculateDistribution(phaseConfig, availableCount) {
    const questionsPerPhase = GAME_RULES.general.questionsPerPhase;
    const distribution = {};
    const totalNeeded = Math.min(questionsPerPhase, availableCount);

    // Calculate how many questions of each level we need
    for (const [level, ratio] of Object.entries(phaseConfig.distribution)) {
      distribution[level] = Math.round(totalNeeded * ratio);
    }

    // Adjust for rounding errors
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    if (total !== totalNeeded) {
      const diff = totalNeeded - total;
      const maxLevel = Math.max(...Object.keys(distribution).map(Number));
      distribution[maxLevel] = (distribution[maxLevel] || 0) + diff;
    }

    return distribution;
  },

  /**
   * Select questions based on distribution
   */
  selectByDistribution({ questions, distribution, phaseConfig, recentTopics, excludeQuestions }) {
    const selected = [];
    const usedIds = new Set(excludeQuestions);
    const topicCounts = {};
    let lastTopic = null;
    let sameTopicCount = 0;

    // Group questions by level
    const questionsByLevel = {};
    for (const level of phaseConfig.levels) {
      questionsByLevel[level] = questions.filter(q => q.level === level && !usedIds.has(q.id));
    }

    // Select questions according to distribution
    for (const [level, count] of Object.entries(distribution)) {
      const levelNum = parseInt(level);
      const available = questionsByLevel[levelNum] || [];
      
      for (let i = 0; i < count && available.length > 0; i++) {
        // Apply topic cooldown
        const filtered = available.filter(q => {
          if (usedIds.has(q.id)) return false;
          
          // Check topic cooldown
          if (q.topic === lastTopic && sameTopicCount >= GAME_RULES.selection.topicDistribution.maxSameTopicInRow) {
            return false;
          }
          
          // Check recent topics
          if (recentTopics.includes(q.topic) && topicCounts[q.topic] >= GAME_RULES.selection.avoidRepeat.topicCooldown) {
            return false;
          }
          
          return true;
        });

        if (filtered.length === 0) {
          // Fallback: use any available question
          const fallback = available.find(q => !usedIds.has(q.id));
          if (fallback) {
            selected.push(fallback);
            usedIds.add(fallback.id);
            this.updateTopicTracking(fallback.topic, topicCounts, lastTopic, sameTopicCount);
            lastTopic = fallback.topic;
          }
          continue;
        }

        // Select question (prefer less used topics)
        const selectedQ = this.selectBestQuestion(filtered, topicCounts);
        selected.push(selectedQ);
        usedIds.add(selectedQ.id);
        this.updateTopicTracking(selectedQ.topic, topicCounts, lastTopic, sameTopicCount);
        lastTopic = selectedQ.topic;
      }
    }

    return selected;
  },

  /**
   * Select best question from available options
   */
  selectBestQuestion(questions, topicCounts) {
    // Prefer questions from topics that haven't been used recently
    const scored = questions.map(q => ({
      question: q,
      score: (topicCounts[q.topic] || 0) * -1 + Math.random() * 0.1 // Randomize slightly
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].question;
  },

  /**
   * Update topic tracking
   */
  updateTopicTracking(topic, topicCounts, lastTopic, sameTopicCount) {
    if (topic === lastTopic) {
      sameTopicCount++;
    } else {
      sameTopicCount = 1;
    }
    
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  },

  /**
   * Shuffle array (Fisher-Yates)
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
   * Analyze question pool for a phase
   */
  async analyzePool(phaseNumber, locale = 'en') {
    const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
    if (!phaseConfig) {
      throw new Error(`Invalid phase number: ${phaseNumber}`);
    }

    const questions = await this.getAvailableQuestions({
      locale,
      levels: phaseConfig.levels,
      excludeQuestions: [],
      phaseNumber
    });

    const byLevel = {};
    const byTopic = {};

    for (const q of questions) {
      byLevel[q.level] = (byLevel[q.level] || 0) + 1;
      byTopic[q.topic || 'general'] = (byTopic[q.topic || 'general'] || 0) + 1;
    }

    return {
      total: questions.length,
      byLevel,
      byTopic,
      sufficient: questions.length >= GAME_RULES.general.questionsPerPhase
    };
  }
};


