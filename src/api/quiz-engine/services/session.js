'use strict';

const crypto = require('crypto');
const { GAME_RULES } = require('../../../../config/game-rules');

// Generate UUID v4
function uuidv4() {
  return crypto.randomUUID();
}

// In-memory session storage (in production, use database)
const sessions = new Map();

/**
 * Session Service
 * Manages quiz sessions (in-memory for now, can be extended to database)
 */
module.exports = {

  // Cleanup expired sessions periodically
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (session.expiresAt && now > session.expiresAt) {
        sessions.delete(sessionId);
        strapi.log.debug(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }, 60000), // Check every minute

  /**
   * Create a new quiz session
   * @param {Object} params - Session parameters
   * @returns {Object} Session object
   */
  createSession({ phaseNumber, locale, userId, questions, phaseConfig }) {
      const sessionId = `quiz_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
      const now = Date.now();

      const session = {
        sessionId,
        phaseNumber,
        locale,
        userId: userId || null,
        questions,
        phaseConfig,
        currentQuestionIndex: 0,
        answers: [],
        score: 0,
        streakCount: 0,
        status: 'active',
        isPaused: false,
        startedAt: new Date(now).toISOString(),
        lastActivityAt: now,
        expiresAt: now + GAME_RULES.timing.sessionTimeout,
        timePerQuestion: GAME_RULES.general.timePerQuestion
      };

      sessions.set(sessionId, session);
      strapi.log.debug(`Created session: ${sessionId} for phase ${phaseNumber}`);

      return session;
    },

    /**
     * Get session by ID
     * @param {string} sessionId - Session identifier
     * @returns {Object|null} Session object or null
     */
    getSession(sessionId) {
      const session = sessions.get(sessionId);
      
      if (!session) {
        return null;
      }

      // Check if expired
      if (session.expiresAt && Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        return null;
      }

      return session;
    },

    /**
     * Update session
     * @param {string} sessionId - Session identifier
     * @param {Object} updates - Updates to apply
     * @returns {Object} Updated session
     */
    updateSession(sessionId, updates) {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      Object.assign(session, updates, {
        lastActivityAt: Date.now()
      });

      sessions.set(sessionId, session);
      return session;
    },

    /**
     * Submit answer to session
     * @param {string} sessionId - Session identifier
     * @param {Object} answerData - Answer data
     * @returns {Object} Updated session and answer result
     */
    submitAnswer(sessionId, answerData) {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      if (session.status !== 'active') {
        throw new Error(`Session is not active: ${session.status}`);
      }

      const { selectedOption, timeUsed } = answerData;
      const currentQuestion = session.questions[session.currentQuestionIndex];
      
      if (!currentQuestion) {
        throw new Error('No current question available');
      }

      const isCorrect = selectedOption === currentQuestion.correctOption;
      const isTimeout = !selectedOption || selectedOption === '';

      // Calculate score
      const scoringService = strapi.service('api::quiz-engine.scoring');
      const timeRemaining = session.timePerQuestion - timeUsed;
      
      const scoreResult = scoringService.calculateAnswerScore({
        level: currentQuestion.level,
        timeRemaining: Math.max(0, timeRemaining),
        isCorrect,
        currentStreak: session.streakCount,
        isTimeout
      });

      // Update streak
      const newStreakCount = isCorrect ? session.streakCount + 1 : 0;

      // Create answer record
      const answer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        selectedOption: selectedOption || '',
        correctOption: currentQuestion.correctOption,
        isCorrect,
        isTimeout,
        timeUsed,
        points: scoreResult.points,
        ...scoreResult,
        timestamp: new Date().toISOString()
      };

      // Update session
      const newScore = session.score + scoreResult.points;
      const newQuestionIndex = session.currentQuestionIndex + 1;
      const isComplete = newQuestionIndex >= session.questions.length;

      this.updateSession(sessionId, {
        answers: [...session.answers, answer],
        score: newScore,
        streakCount: newStreakCount,
        currentQuestionIndex: newQuestionIndex,
        status: isComplete ? 'completed' : 'active'
      });

      const updatedSession = this.getSession(sessionId);

      return {
        session: updatedSession,
        answer,
        scoreResult,
        isComplete,
        nextQuestion: isComplete ? null : updatedSession.questions[newQuestionIndex]
      };
    },

    /**
     * Pause session
     * @param {string} sessionId - Session identifier
     * @returns {Object} Updated session
     */
    pauseSession(sessionId) {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      if (session.status !== 'active') {
        throw new Error(`Cannot pause session with status: ${session.status}`);
      }

      return this.updateSession(sessionId, {
        isPaused: true,
        pausedAt: new Date().toISOString()
      });
    },

    /**
     * Resume session
     * @param {string} sessionId - Session identifier
     * @returns {Object} Updated session
     */
    resumeSession(sessionId) {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      if (!session.isPaused) {
        throw new Error('Session is not paused');
      }

      // Check pause timeout
      if (session.pausedAt) {
        const pauseDuration = Date.now() - new Date(session.pausedAt).getTime();
        if (pauseDuration > GAME_RULES.timing.pauseTimeout) {
          throw new Error('Session pause timeout exceeded');
        }
      }

      return this.updateSession(sessionId, {
        isPaused: false,
        pausedAt: null
      });
    },

    /**
     * Delete session
     * @param {string} sessionId - Session identifier
     */
    deleteSession(sessionId) {
      sessions.delete(sessionId);
      strapi.log.debug(`Deleted session: ${sessionId}`);
    },

    /**
     * Get all active sessions (for admin/debugging)
     * @returns {Array} Array of active sessions
     */
    getAllSessions() {
      return Array.from(sessions.values());
    },

    /**
     * Cleanup expired sessions
     * @returns {number} Number of sessions cleaned up
     */
    cleanupExpiredSessions() {
      const now = Date.now();
      let cleaned = 0;

      for (const [sessionId, session] of sessions.entries()) {
        if (session.expiresAt && now > session.expiresAt) {
          sessions.delete(sessionId);
          cleaned++;
        }
      }

      return cleaned;
    }
};

