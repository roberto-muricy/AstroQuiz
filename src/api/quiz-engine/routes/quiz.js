/**
 * AstroQuiz Engine Routes
 * API routes for quiz game functionality
 */

'use strict';

module.exports = {
  routes: [
    // === CORE QUIZ OPERATIONS ===
    
    // Start a new quiz session
    {
      method: 'POST',
      path: '/quiz/start',
      handler: 'quiz.startQuiz',
      config: {
        description: 'Start a new quiz session for a specific phase',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false // Can be used without authentication
      }
    },

    // Get session information
    {
      method: 'GET',
      path: '/quiz/session/:sessionId',
      handler: 'quiz.getSession',
      config: {
        description: 'Get current session status and information',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Get current question
    {
      method: 'GET',
      path: '/quiz/question/:sessionId',
      handler: 'quiz.getCurrentQuestion',
      config: {
        description: 'Get the current question for a session',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Submit answer
    {
      method: 'POST',
      path: '/quiz/answer',
      handler: 'quiz.submitAnswer',
      config: {
        description: 'Submit an answer for the current question',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // === SESSION CONTROL ===
    
    // Pause session
    {
      method: 'POST',
      path: '/quiz/pause',
      handler: 'quiz.pauseQuiz',
      config: {
        description: 'Pause the current quiz session',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Resume session
    {
      method: 'POST',
      path: '/quiz/resume',
      handler: 'quiz.resumeQuiz',
      config: {
        description: 'Resume a paused quiz session',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Finish session
    {
      method: 'POST',
      path: '/quiz/finish',
      handler: 'quiz.finishQuiz',
      config: {
        description: 'Finish or abandon a quiz session',
        tags: ['Quiz Engine'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // === COMPETITIVE FEATURES ===
    
    // Get leaderboard
    {
      method: 'GET',
      path: '/quiz/leaderboard',
      handler: 'quiz.getLeaderboard',
      config: {
        description: 'Get leaderboard rankings',
        tags: ['Quiz Engine', 'Competitive'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // === INFORMATION AND ANALYTICS ===
    
    // Get game rules
    {
      method: 'GET',
      path: '/quiz/rules',
      handler: 'quiz.getGameRules',
      config: {
        description: 'Get game rules and configuration',
        tags: ['Quiz Engine', 'Configuration'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Get question pool statistics
    {
      method: 'GET',
      path: '/quiz/pool-stats',
      handler: 'quiz.getPoolStats',
      config: {
        description: 'Get question pool statistics for a locale',
        tags: ['Quiz Engine', 'Analytics'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Get session analytics
    {
      method: 'GET',
      path: '/quiz/analytics/:sessionId',
      handler: 'quiz.getSessionAnalytics',
      config: {
        description: 'Get detailed analytics for a completed session',
        tags: ['Quiz Engine', 'Analytics'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // === SYSTEM ENDPOINTS ===
    
    // Health check
    {
      method: 'GET',
      path: '/quiz/health',
      handler: 'quiz.healthCheck',
      config: {
        description: 'Check quiz engine health status',
        tags: ['Quiz Engine', 'System'],
        policies: [],
        middlewares: [],
        auth: false
      }
    }
  ]
};
