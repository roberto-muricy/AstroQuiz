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
  async selectPhaseQuestions({ phaseNumber, locale = 'en', excludeQuestions = [], recentTopics = [], userPerformance = {}, forceImage = false, includeDrafts = false }) {
    // Get phase configuration
    const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
    if (!phaseConfig) {
      throw new Error(`Invalid phase number: ${phaseNumber}`);
    }

    // Get questions from database (large pool)
    const questions = await this.getAvailableQuestions({
      locale,
      levels: phaseConfig.levels,
      excludeQuestions,
      phaseNumber,
      forceImage,
      includeDrafts,
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

    // Debug/QA: ensure at least one image question is present (if any exists in pool)
    if (forceImage) {
      const hasImage = selectedQuestions.some(q => !!q.imageUrl);
      if (!hasImage) {
        const imageCandidate = questions.find(q => !!q.imageUrl);
        if (imageCandidate) {
          // Prefer replacing a question of the same level to keep difficulty distribution similar
          const sameLevelIdx = selectedQuestions.findIndex(q => q.level === imageCandidate.level);
          const replaceIdx = sameLevelIdx >= 0 ? sameLevelIdx : 0;
          if (selectedQuestions.length > 0) {
            selectedQuestions[replaceIdx] = imageCandidate;
          } else {
            selectedQuestions.push(imageCandidate);
          }
        } else {
          strapi.log.warn(`[selector] forceImage=true but no image questions found in pool (locale=${locale}, phase=${phaseNumber}).`);
        }
      }
    }

    // Shuffle to avoid predictable patterns
    return this.shuffleArray(selectedQuestions);
  },

  /**
   * Get available questions from database
   */
  async getAvailableQuestions({ locale, levels, excludeQuestions, phaseNumber, forceImage = false, includeDrafts = false }) {
    try {
      // IMPORTANT:
      // In this project, Strapi's entityService populate for media + i18n has been unreliable.
      // For quiz selection we need imageUrl to be correct, so we query the SQLite tables directly via knex join.
      const knex = strapi.db.connection;

      let query = knex('questions as q')
        .leftJoin('files_related_mph as frm', function () {
          this.on('frm.related_id', '=', 'q.id')
            .andOnVal('frm.related_type', 'api::question.question')
            .andOnVal('frm.field', 'image');
        })
        .leftJoin('files as f', 'f.id', 'frm.file_id')
        .select(
          'q.id',
          'q.document_id as documentId',
          'q.question',
          'q.option_a as optionA',
          'q.option_b as optionB',
          'q.option_c as optionC',
          'q.option_d as optionD',
          'q.correct_option as correctOption',
          'q.level',
          'q.topic',
          'q.explanation',
          'q.locale',
          'q.question_type as questionTypeRaw',
          'f.url as imageUrl',
        )
        .where('q.locale', locale)
        .whereIn('q.level', Array.isArray(levels) ? levels : [])
        .orderBy('q.level', 'asc')
        .limit(1000);

      // By default, only published questions are available (draftAndPublish=true).
      // For dev testing, allow drafts explicitly.
      if (!includeDrafts) {
        query = query.andWhereRaw("q.published_at IS NOT NULL AND q.published_at != ''");
      }

      // Exclude specific questions
      if (Array.isArray(excludeQuestions) && excludeQuestions.length > 0) {
        query = query.whereNotIn('q.id', excludeQuestions);
      }

      const rows = await query;

      return (rows || []).map((r) => {
        const imgUrl = r.imageUrl || null;
        const qType = imgUrl ? 'image' : (r.questionTypeRaw || 'text');

        return {
          id: r.id,
          documentId: r.documentId,
          question: r.question,
          optionA: r.optionA,
          optionB: r.optionB,
          optionC: r.optionC,
          optionD: r.optionD,
          correctOption: r.correctOption,
          level: r.level,
          topic: r.topic || 'general',
          imageUrl: imgUrl,
          questionType: qType,
          explanation: r.explanation,
          locale: r.locale,
        };
      });
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


