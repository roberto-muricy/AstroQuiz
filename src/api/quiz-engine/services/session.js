/**
 * AstroQuiz Session Management Service
 * Handles quiz session lifecycle, state management, and persistence
 */

'use strict';

const { GAME_RULES, GameRulesHelper } = require('../../../../config/game-rules');

module.exports = () => ({
  /**
   * Create a new quiz session
   * @param {Object} sessionData - Session initialization data
   * @param {number} sessionData.phaseNumber - Phase number to start
   * @param {string} sessionData.locale - Language locale
   * @param {string} sessionData.userId - User identifier (optional)
   * @param {Object} sessionData.userPreferences - User preferences (optional)
   * @returns {Promise<Object>} Created session object
   */
  async createSession(sessionData) {
    const {
      phaseNumber,
      locale = 'en',
      userId = null,
      userPreferences = {}
    } = sessionData;

    // Validate phase number
    const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
    if (!phaseConfig) {
      throw new Error(`Invalid phase number: ${phaseNumber}`);
    }

    // Generate unique session ID
    const sessionId = this.generateSessionId();

    // Get user performance data for adaptive selection
    const userPerformance = userId ? await this.getUserPerformance(userId) : null;

    // Select questions for this phase
    const selectorService = strapi.service('api::quiz-engine.selector');
    const questions = await selectorService.selectPhaseQuestions({
      phaseNumber,
      locale,
      excludeQuestions: userPerformance?.recentQuestions || [],
      recentTopics: userPerformance?.recentTopics || [],
      userPerformance
    });

    if (questions.length === 0) {
      throw new Error(`No questions available for phase ${phaseNumber}`);
    }

    // Create session object
    const session = {
      sessionId,
      userId,
      phaseNumber,
      locale,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Game state
      currentQuestionIndex: 0,
      questions: questions.map(q => ({
        documentId: q.documentId,
        level: q.level,
        topic: q.topic,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation
      })),
      
      // Progress tracking
      answers: [],
      score: 0,
      streakCount: 0,
      maxStreak: 0,
      startTime: new Date(),
      currentQuestionStartTime: new Date(),
      totalTimeSpent: 0,
      
      // Phase configuration
      phaseConfig,
      timePerQuestion: userPreferences.timePerQuestion || GAME_RULES.general.timePerQuestion,
      
      // Session settings
      isPaused: false,
      pausedAt: null,
      pauseDuration: 0,
      autoSaveEnabled: true,
      lastAutoSave: new Date()
    };

    // Save session to database
    await this.saveSession(session);

    // Return session without internal data
    return this.sanitizeSessionForClient(session);
  },

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session object or null if not found
   */
  async getSession(sessionId) {
    try {
      // Try to get from cache first (if implemented)
      let session = await this.getSessionFromCache(sessionId);
      
      if (!session) {
        // Get from database
        session = await this.getSessionFromDatabase(sessionId);
        
        if (session) {
          // Cache for future requests
          await this.cacheSession(session);
        }
      }

      return session ? this.sanitizeSessionForClient(session) : null;
    } catch (error) {
      strapi.log.error('Error getting session:', error);
      throw new Error('Failed to retrieve session');
    }
  },

  /**
   * Update session state
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated session
   */
  async updateSession(sessionId, updates) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Apply updates
    Object.assign(session, updates, {
      updatedAt: new Date()
    });

    // Save updated session
    await this.saveSession(session);
    await this.cacheSession(session);

    return this.sanitizeSessionForClient(session);
  },

  /**
   * Submit answer for current question
   * @param {string} sessionId - Session ID
   * @param {Object} answerData - Answer data
   * @param {string} answerData.selectedOption - Selected option (A, B, C, D)
   * @param {number} answerData.timeUsed - Time used to answer (ms)
   * @returns {Promise<Object>} Answer result with scoring
   */
  async submitAnswer(sessionId, answerData) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.isPaused) {
      throw new Error('Session is paused');
    }

    const { selectedOption, timeUsed } = answerData;
    const currentQuestion = session.questions[session.currentQuestionIndex];
    
    if (!currentQuestion) {
      throw new Error('No current question available');
    }

    // Validate answer format
    if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
      throw new Error('Invalid answer option');
    }

    // Calculate answer correctness
    const isCorrect = selectedOption === currentQuestion.correctOption;
    const isTimeout = timeUsed >= session.timePerQuestion;
    const timeRemaining = Math.max(0, session.timePerQuestion - timeUsed);

    // Update streak
    if (isCorrect) {
      session.streakCount++;
      session.maxStreak = Math.max(session.maxStreak, session.streakCount);
    } else {
      session.streakCount = 0;
    }

    // Calculate score using scoring service
    const scoringService = strapi.service('api::quiz-engine.scoring');
    const scoreResult = scoringService.calculateAnswerScore({
      level: currentQuestion.level,
      timeRemaining,
      isCorrect,
      streakCount: session.streakCount,
      isTimeout
    });

    // Create answer record
    const answerRecord = {
      questionIndex: session.currentQuestionIndex,
      questionId: currentQuestion.documentId,
      selectedOption,
      correctOption: currentQuestion.correctOption,
      isCorrect,
      isTimeout,
      timeUsed,
      timeRemaining,
      points: scoreResult.totalPoints,
      scoreBreakdown: scoreResult.breakdown,
      topic: currentQuestion.topic,
      level: currentQuestion.level,
      answeredAt: new Date()
    };

    // Update session
    session.answers.push(answerRecord);
    session.score += scoreResult.totalPoints;
    session.totalTimeSpent += timeUsed;
    session.currentQuestionIndex++;
    session.currentQuestionStartTime = new Date();

    // Check if phase is complete
    if (session.currentQuestionIndex >= session.questions.length) {
      await this.completePhase(session);
    }

    // Save session
    await this.saveSession(session);
    await this.cacheSession(session);

    // Return answer result
    return {
      answerRecord,
      scoreResult,
      sessionStatus: {
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
        score: session.score,
        streakCount: session.streakCount,
        isPhaseComplete: session.status === 'completed'
      }
    };
  },

  /**
   * Get current question for session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Current question data
   */
  async getCurrentQuestion(sessionId) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No more questions in this phase');
    }

    // Calculate time remaining
    const elapsed = Date.now() - new Date(session.currentQuestionStartTime).getTime();
    const timeRemaining = Math.max(0, session.timePerQuestion - elapsed);

    return {
      questionIndex: session.currentQuestionIndex + 1,
      totalQuestions: session.questions.length,
      question: {
        question: currentQuestion.question,
        optionA: currentQuestion.optionA,
        optionB: currentQuestion.optionB,
        optionC: currentQuestion.optionC,
        optionD: currentQuestion.optionD,
        level: currentQuestion.level,
        topic: currentQuestion.topic
      },
      timeRemaining,
      timePerQuestion: session.timePerQuestion,
      currentScore: session.score,
      currentStreak: session.streakCount
    };
  },

  /**
   * Pause session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Updated session
   */
  async pauseSession(sessionId) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.isPaused) {
      throw new Error('Session is already paused');
    }

    session.isPaused = true;
    session.pausedAt = new Date();

    await this.saveSession(session);
    await this.cacheSession(session);

    return this.sanitizeSessionForClient(session);
  },

  /**
   * Resume paused session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Updated session
   */
  async resumeSession(sessionId) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isPaused) {
      throw new Error('Session is not paused');
    }

    // Calculate pause duration
    const pauseDuration = Date.now() - new Date(session.pausedAt).getTime();
    session.pauseDuration += pauseDuration;

    // Check if pause timeout exceeded
    if (pauseDuration > GAME_RULES.timing.pauseTimeout) {
      session.status = 'expired';
      await this.saveSession(session);
      throw new Error('Session expired due to long pause');
    }

    session.isPaused = false;
    session.pausedAt = null;
    session.currentQuestionStartTime = new Date(); // Reset question timer

    await this.saveSession(session);
    await this.cacheSession(session);

    return this.sanitizeSessionForClient(session);
  },

  /**
   * Complete current phase
   * @param {Object} session - Session object
   * @returns {Promise<Object>} Phase completion result
   */
  async completePhase(session) {
    session.status = 'completed';
    session.completedAt = new Date();

    // Calculate phase results using scoring service
    const scoringService = strapi.service('api::quiz-engine.scoring');
    const phaseResult = scoringService.calculatePhaseScore({
      phaseNumber: session.phaseNumber,
      answers: session.answers,
      totalTime: session.totalTimeSpent
    });

    session.phaseResult = phaseResult;

    // Update user progress if user is logged in
    if (session.userId) {
      await this.updateUserProgress(session.userId, session);
    }

    return phaseResult;
  },

  /**
   * Abandon/quit session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Final session state
   */
  async abandonSession(sessionId) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'abandoned';
    session.abandonedAt = new Date();

    await this.saveSession(session);
    await this.invalidateSessionCache(sessionId);

    return this.sanitizeSessionForClient(session);
  },

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of cleaned sessions
   */
  async cleanupExpiredSessions() {
    const expiredBefore = new Date(Date.now() - GAME_RULES.timing.sessionTimeout);
    
    try {
      // This would be implemented based on your storage strategy
      // For now, we'll just log the cleanup attempt
      strapi.log.info(`Cleaning up sessions expired before ${expiredBefore}`);
      
      // TODO: Implement actual cleanup based on storage method
      return 0;
    } catch (error) {
      strapi.log.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  },

  /**
   * Get user performance data for adaptive selection
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User performance data
   */
  async getUserPerformance(userId) {
    try {
      // This would query completed sessions for the user
      // For now, return null (no performance data)
      return null;
    } catch (error) {
      strapi.log.error('Error getting user performance:', error);
      return null;
    }
  },

  /**
   * Update user progress after phase completion
   * @param {string} userId - User ID
   * @param {Object} session - Completed session
   * @returns {Promise<void>}
   */
  async updateUserProgress(userId, session) {
    try {
      // This would update user progress records
      strapi.log.info(`Updating progress for user ${userId}, phase ${session.phaseNumber}`);
      
      // TODO: Implement user progress tracking
    } catch (error) {
      strapi.log.error('Error updating user progress:', error);
    }
  },

  /**
   * Generate unique session ID
   * @returns {string} Unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `quiz_${timestamp}_${randomPart}`;
  },

  /**
   * Save session to storage
   * @param {Object} session - Session to save
   * @returns {Promise<void>}
   */
  async saveSession(session) {
    try {
      // For now, we'll use a simple in-memory storage
      // In production, this should use Redis or database
      if (!global.sessionStorage) {
        global.sessionStorage = new Map();
      }
      
      global.sessionStorage.set(session.sessionId, JSON.stringify(session));
      
      // Auto-save indicator
      session.lastAutoSave = new Date();
    } catch (error) {
      strapi.log.error('Error saving session:', error);
      throw new Error('Failed to save session');
    }
  },

  /**
   * Get session from database/storage
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session object or null
   */
  async getSessionFromDatabase(sessionId) {
    try {
      if (!global.sessionStorage) {
        return null;
      }
      
      const sessionData = global.sessionStorage.get(sessionId);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      strapi.log.error('Error getting session from database:', error);
      return null;
    }
  },

  /**
   * Cache session for quick access
   * @param {Object} session - Session to cache
   * @returns {Promise<void>}
   */
  async cacheSession(session) {
    // In a real implementation, this would use Redis or similar
    // For now, it's the same as saveSession
    await this.saveSession(session);
  },

  /**
   * Get session from cache
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Cached session or null
   */
  async getSessionFromCache(sessionId) {
    // For now, same as database
    return await this.getSessionFromDatabase(sessionId);
  },

  /**
   * Invalidate session cache
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async invalidateSessionCache(sessionId) {
    try {
      if (global.sessionStorage) {
        global.sessionStorage.delete(sessionId);
      }
    } catch (error) {
      strapi.log.error('Error invalidating session cache:', error);
    }
  },

  /**
   * Remove sensitive data from session for client response
   * @param {Object} session - Full session object
   * @returns {Object} Sanitized session
   */
  sanitizeSessionForClient(session) {
    const sanitized = { ...session };
    
    // Remove correct answers from questions (except for completed questions)
    sanitized.questions = session.questions.map((question, index) => {
      const questionCopy = { ...question };
      
      // Only include correct answer and explanation for answered questions
      if (index >= session.currentQuestionIndex) {
        delete questionCopy.correctOption;
        delete questionCopy.explanation;
      }
      
      return questionCopy;
    });

    return sanitized;
  },

  /**
   * Get session statistics
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStats(sessionId) {
    const session = await this.getSessionFromDatabase(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const stats = {
      sessionId,
      phaseNumber: session.phaseNumber,
      status: session.status,
      progress: {
        currentQuestion: session.currentQuestionIndex + 1,
        totalQuestions: session.questions.length,
        percentage: Math.round((session.currentQuestionIndex / session.questions.length) * 100)
      },
      performance: {
        score: session.score,
        accuracy: session.answers.length > 0 ? 
          session.answers.filter(a => a.isCorrect).length / session.answers.length : 0,
        averageTime: session.answers.length > 0 ?
          session.totalTimeSpent / session.answers.length : 0,
        currentStreak: session.streakCount,
        maxStreak: session.maxStreak
      },
      timing: {
        startTime: session.startTime,
        totalTimeSpent: session.totalTimeSpent,
        pauseDuration: session.pauseDuration,
        estimatedTimeRemaining: (session.questions.length - session.currentQuestionIndex) * 
          (session.timePerQuestion / 1000) // Convert to seconds
      }
    };

    return stats;
  }
});
