/**
 * AstroQuiz Engine Controller
 * Handles all quiz-related API endpoints
 */

'use strict';

const { GAME_RULES } = require('../../../../config/game-rules');

module.exports = {
  /**
   * Start a new quiz session
   * POST /api/quiz/start
   */
  async startQuiz(ctx) {
    try {
      const { phaseNumber, locale = 'en', userId = null, userPreferences = {} } = ctx.request.body;

      // Validate required parameters
      if (!phaseNumber || phaseNumber < 1 || phaseNumber > GAME_RULES.general.totalPhases) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `Invalid phase number. Must be between 1 and ${GAME_RULES.general.totalPhases}`
        };
        return;
      }

      // Validate locale
      if (!GAME_RULES.general.supportedLocales.includes(locale)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `Unsupported locale. Supported: ${GAME_RULES.general.supportedLocales.join(', ')}`
        };
        return;
      }

      // Create new session
      const sessionService = strapi.service('api::quiz-engine.session');
      const session = await sessionService.createSession({
        phaseNumber,
        locale,
        userId,
        userPreferences
      });

      ctx.status = 201;
      ctx.body = {
        success: true,
        message: 'Quiz session started successfully',
        data: {
          sessionId: session.sessionId,
          phaseNumber: session.phaseNumber,
          totalQuestions: session.questions.length,
          timePerQuestion: session.timePerQuestion,
          phaseConfig: session.phaseConfig,
          startTime: session.startTime
        }
      };

    } catch (error) {
      strapi.log.error('Error starting quiz:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to start quiz session'
      };
    }
  },

  /**
   * Get session status and information
   * GET /api/quiz/session/:sessionId
   */
  async getSession(ctx) {
    try {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = await sessionService.getSession(sessionId);

      if (!session) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Session not found'
        };
        return;
      }

      // Get session statistics
      const stats = await sessionService.getSessionStats(sessionId);

      ctx.body = {
        success: true,
        data: {
          session,
          stats
        }
      };

    } catch (error) {
      strapi.log.error('Error getting session:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to retrieve session'
      };
    }
  },

  /**
   * Get current question
   * GET /api/quiz/question/:sessionId
   */
  async getCurrentQuestion(ctx) {
    try {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const questionData = await sessionService.getCurrentQuestion(sessionId);

      ctx.body = {
        success: true,
        data: questionData
      };

    } catch (error) {
      strapi.log.error('Error getting current question:', error);
      
      if (error.message === 'Session not found') {
        ctx.status = 404;
      } else if (error.message === 'Session is not active' || error.message === 'No more questions in this phase') {
        ctx.status = 400;
      } else {
        ctx.status = 500;
      }

      ctx.body = {
        success: false,
        message: error.message || 'Failed to get current question'
      };
    }
  },

  /**
   * Submit answer for current question
   * POST /api/quiz/answer
   */
  async submitAnswer(ctx) {
    try {
      const { sessionId, selectedOption, timeUsed } = ctx.request.body;

      // Validate required parameters
      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      if (!selectedOption || !['A', 'B', 'C', 'D'].includes(selectedOption)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Valid selectedOption (A, B, C, D) is required'
        };
        return;
      }

      if (typeof timeUsed !== 'number' || timeUsed < 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Valid timeUsed (positive number) is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const result = await sessionService.submitAnswer(sessionId, {
        selectedOption,
        timeUsed
      });

      ctx.body = {
        success: true,
        message: 'Answer submitted successfully',
        data: result
      };

    } catch (error) {
      strapi.log.error('Error submitting answer:', error);
      
      if (error.message === 'Session not found') {
        ctx.status = 404;
      } else if (error.message.includes('not active') || error.message.includes('paused')) {
        ctx.status = 400;
      } else {
        ctx.status = 500;
      }

      ctx.body = {
        success: false,
        message: error.message || 'Failed to submit answer'
      };
    }
  },

  /**
   * Pause quiz session
   * POST /api/quiz/pause
   */
  async pauseQuiz(ctx) {
    try {
      const { sessionId } = ctx.request.body;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = await sessionService.pauseSession(sessionId);

      ctx.body = {
        success: true,
        message: 'Quiz session paused successfully',
        data: {
          sessionId: session.sessionId,
          isPaused: session.isPaused,
          pausedAt: session.pausedAt
        }
      };

    } catch (error) {
      strapi.log.error('Error pausing quiz:', error);
      
      if (error.message === 'Session not found') {
        ctx.status = 404;
      } else if (error.message.includes('not active') || error.message.includes('already paused')) {
        ctx.status = 400;
      } else {
        ctx.status = 500;
      }

      ctx.body = {
        success: false,
        message: error.message || 'Failed to pause quiz session'
      };
    }
  },

  /**
   * Resume paused quiz session
   * POST /api/quiz/resume
   */
  async resumeQuiz(ctx) {
    try {
      const { sessionId } = ctx.request.body;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = await sessionService.resumeSession(sessionId);

      ctx.body = {
        success: true,
        message: 'Quiz session resumed successfully',
        data: {
          sessionId: session.sessionId,
          isPaused: session.isPaused,
          currentQuestionStartTime: session.currentQuestionStartTime
        }
      };

    } catch (error) {
      strapi.log.error('Error resuming quiz:', error);
      
      if (error.message === 'Session not found') {
        ctx.status = 404;
      } else if (error.message.includes('not paused') || error.message.includes('expired')) {
        ctx.status = 400;
      } else {
        ctx.status = 500;
      }

      ctx.body = {
        success: false,
        message: error.message || 'Failed to resume quiz session'
      };
    }
  },

  /**
   * Finish/abandon quiz session
   * POST /api/quiz/finish
   */
  async finishQuiz(ctx) {
    try {
      const { sessionId, reason = 'completed' } = ctx.request.body;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      let session;

      if (reason === 'abandoned') {
        session = await sessionService.abandonSession(sessionId);
      } else {
        // Get session for completion summary
        session = await sessionService.getSession(sessionId);
        if (!session) {
          ctx.status = 404;
          ctx.body = {
            success: false,
            message: 'Session not found'
          };
          return;
        }
      }

      // Get final statistics
      const stats = await sessionService.getSessionStats(sessionId);

      ctx.body = {
        success: true,
        message: `Quiz session ${reason} successfully`,
        data: {
          sessionId: session.sessionId,
          finalStatus: session.status,
          phaseResult: session.phaseResult,
          stats
        }
      };

    } catch (error) {
      strapi.log.error('Error finishing quiz:', error);
      
      if (error.message === 'Session not found') {
        ctx.status = 404;
      } else {
        ctx.status = 500;
      }

      ctx.body = {
        success: false,
        message: error.message || 'Failed to finish quiz session'
      };
    }
  },

  /**
   * Get leaderboard
   * GET /api/quiz/leaderboard
   */
  async getLeaderboard(ctx) {
    try {
      const { category = 'total_score', period = 'all_time', limit = 10 } = ctx.query;

      // Validate parameters
      const validCategories = ['total_score', 'perfect_phases', 'average_speed', 'current_streak'];
      if (!validCategories.includes(category)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `Invalid category. Valid options: ${validCategories.join(', ')}`
        };
        return;
      }

      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Limit must be a number between 1 and 100'
        };
        return;
      }

      // TODO: Implement actual leaderboard logic
      // For now, return mock data
      const mockLeaderboard = [
        { rank: 1, userId: 'user1', score: 15750, username: 'AstroMaster', perfectPhases: 12 },
        { rank: 2, userId: 'user2', score: 14200, username: 'StarGazer', perfectPhases: 8 },
        { rank: 3, userId: 'user3', score: 13800, username: 'CosmicExplorer', perfectPhases: 10 }
      ];

      ctx.body = {
        success: true,
        data: {
          category,
          period,
          leaderboard: mockLeaderboard.slice(0, limitNum),
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      strapi.log.error('Error getting leaderboard:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to retrieve leaderboard'
      };
    }
  },

  /**
   * Get game rules and configuration
   * GET /api/quiz/rules
   */
  async getGameRules(ctx) {
    try {
      const { section } = ctx.query;

      let rules;
      if (section) {
        // Return specific section
        if (GAME_RULES[section]) {
          rules = { [section]: GAME_RULES[section] };
        } else {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: `Invalid section. Available: ${Object.keys(GAME_RULES).join(', ')}`
          };
          return;
        }
      } else {
        // Return all rules (excluding sensitive data)
        rules = {
          general: GAME_RULES.general,
          phases: GAME_RULES.phases,
          scoring: GAME_RULES.scoring,
          achievements: GAME_RULES.achievements,
          timing: GAME_RULES.timing,
          competitive: GAME_RULES.competitive
        };
      }

      ctx.body = {
        success: true,
        data: rules
      };

    } catch (error) {
      strapi.log.error('Error getting game rules:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to retrieve game rules'
      };
    }
  },

  /**
   * Get question pool statistics
   * GET /api/quiz/pool-stats
   */
  async getPoolStats(ctx) {
    try {
      const { locale = 'en' } = ctx.query;

      // Validate locale
      if (!GAME_RULES.general.supportedLocales.includes(locale)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `Unsupported locale. Supported: ${GAME_RULES.general.supportedLocales.join(', ')}`
        };
        return;
      }

      const selectorService = strapi.service('api::quiz-engine.selector');
      const stats = await selectorService.analyzeQuestionPool(locale);

      ctx.body = {
        success: true,
        data: {
          locale,
          stats,
          generatedAt: new Date()
        }
      };

    } catch (error) {
      strapi.log.error('Error getting pool stats:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to retrieve question pool statistics'
      };
    }
  },

  /**
   * Health check endpoint
   * GET /api/quiz/health
   */
  async healthCheck(ctx) {
    try {
      // Check if services are available
      const sessionService = strapi.service('api::quiz-engine.session');
      const scoringService = strapi.service('api::quiz-engine.scoring');
      const selectorService = strapi.service('api::quiz-engine.selector');

      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          session: !!sessionService,
          scoring: !!scoringService,
          selector: !!selectorService
        },
        config: {
          totalPhases: GAME_RULES.general.totalPhases,
          questionsPerPhase: GAME_RULES.general.questionsPerPhase,
          supportedLocales: GAME_RULES.general.supportedLocales
        }
      };

      // Check if any critical services are missing
      const criticalServices = Object.values(health.services);
      if (criticalServices.includes(false)) {
        health.status = 'degraded';
        ctx.status = 503;
      }

      ctx.body = {
        success: true,
        data: health
      };

    } catch (error) {
      strapi.log.error('Error in health check:', error);
      ctx.status = 503;
      ctx.body = {
        success: false,
        message: 'Health check failed',
        error: error.message
      };
    }
  },

  /**
   * Get detailed session analytics
   * GET /api/quiz/analytics/:sessionId
   */
  async getSessionAnalytics(ctx) {
    try {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Session ID is required'
        };
        return;
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = await sessionService.getSessionFromDatabase(sessionId);

      if (!session) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Session not found'
        };
        return;
      }

      const scoringService = strapi.service('api::quiz-engine.scoring');
      const analytics = scoringService.getDetailedBreakdown({ phases: [session] });

      ctx.body = {
        success: true,
        data: analytics
      };

    } catch (error) {
      strapi.log.error('Error getting session analytics:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to retrieve session analytics'
      };
    }
  }
};
