'use strict';

const { GameRulesHelper } = require('../../../../config/game-rules');

/**
 * Quiz Controller
 * Handles all quiz-related API endpoints
 */
module.exports = {
  /**
   * Start a new quiz session
   * POST /api/quiz/start
   */
  async start(ctx) {
    try {
      const { phaseNumber, locale = 'en', userId, userPreferences = {}, excludeQuestions = [] } = ctx.request.body;

      // Validate phase number
      if (!phaseNumber || phaseNumber < 1 || phaseNumber > 50) {
        return ctx.badRequest('Invalid phase number. Must be between 1 and 50.');
      }

      // Validate locale
      const supportedLocales = ['en', 'pt', 'es', 'fr'];
      if (!supportedLocales.includes(locale)) {
        return ctx.badRequest(`Unsupported locale: ${locale}. Supported: ${supportedLocales.join(', ')}`);
      }

      // Get phase configuration
      const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNumber);
      if (!phaseConfig) {
        return ctx.badRequest(`Invalid phase configuration for phase ${phaseNumber}`);
      }

      // Select questions
      const selectorService = strapi.service('api::quiz-engine.selector');
      const questions = await selectorService.selectPhaseQuestions({
        phaseNumber,
        locale,
        excludeQuestions: Array.isArray(excludeQuestions) ? excludeQuestions : [],
        recentTopics: [],
        userPerformance: {}
      });

      if (questions.length === 0) {
        return ctx.notFound(`No questions available for phase ${phaseNumber} in locale ${locale}`);
      }

      // Create session
      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.createSession({
        phaseNumber,
        locale,
        userId,
        questions,
        phaseConfig: {
          type: phaseConfig.type,
          levels: phaseConfig.levels,
          distribution: phaseConfig.distribution,
          minScore: phaseConfig.minScore
        }
      });

      ctx.body = {
        success: true,
        message: 'Quiz session started successfully',
        data: {
          sessionId: session.sessionId,
          phaseNumber: session.phaseNumber,
          totalQuestions: session.questions.length,
          timePerQuestion: session.timePerQuestion,
          phaseConfig: session.phaseConfig,
          startedAt: session.startedAt
        }
      };
    } catch (error) {
      strapi.log.error('Error starting quiz session:', error);
      ctx.internalServerError('Failed to start quiz session');
    }
  },

  /**
   * Get current question
   * GET /api/quiz/question/:sessionId
   */
  async getQuestion(ctx) {
    try {
      const { sessionId } = ctx.params;
      
      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.getSession(sessionId);

      if (!session) {
        return ctx.notFound('Session not found or expired');
      }

      if (session.status !== 'active') {
        return ctx.badRequest(`Session is not active. Status: ${session.status}`);
      }

      const currentQuestion = session.questions[session.currentQuestionIndex];
      if (!currentQuestion) {
        return ctx.notFound('No more questions available');
      }

      // Format question for response (hide correct answer)
      const questionData = {
        id: currentQuestion.id,
        question: currentQuestion.question,
        options: [
          currentQuestion.optionA,
          currentQuestion.optionB,
          currentQuestion.optionC,
          currentQuestion.optionD
        ],
        level: currentQuestion.level,
        topic: currentQuestion.topic,
        questionNumber: session.currentQuestionIndex + 1,
        totalQuestions: session.questions.length
      };

      ctx.body = {
        success: true,
        data: {
          session: {
            sessionId: session.sessionId,
            phaseNumber: session.phaseNumber,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.questions.length,
            score: session.score,
            streakCount: session.streakCount
          },
          question: questionData
        }
      };
    } catch (error) {
      strapi.log.error('Error getting question:', error);
      ctx.internalServerError('Failed to get question');
    }
  },

  /**
   * Submit answer
   * POST /api/quiz/answer
   */
  async submitAnswer(ctx) {
    try {
      const { sessionId, selectedOption, timeUsed } = ctx.request.body;

      if (!sessionId) {
        return ctx.badRequest('sessionId is required');
      }

      if (selectedOption === undefined) {
        return ctx.badRequest('selectedOption is required');
      }

      if (timeUsed === undefined || timeUsed < 0) {
        return ctx.badRequest('timeUsed must be a positive number');
      }

      const sessionService = strapi.service('api::quiz-engine.session');
      const result = sessionService.submitAnswer(sessionId, {
        selectedOption,
        timeUsed
      });

      ctx.body = {
        success: true,
        data: {
          isCorrect: result.answer.isCorrect,
          correctAnswer: result.answer.correctOption,
          points: result.scoreResult.points,
          bonus: {
            speed: result.scoreResult.speedBonus,
            streak: result.scoreResult.streakBonus
          },
          nextQuestion: result.nextQuestion ? {
            id: result.nextQuestion.id,
            question: result.nextQuestion.question,
            options: [
              result.nextQuestion.optionA,
              result.nextQuestion.optionB,
              result.nextQuestion.optionC,
              result.nextQuestion.optionD
            ],
            level: result.nextQuestion.level,
            topic: result.nextQuestion.topic
          } : null,
          isComplete: result.isComplete,
          session: {
            sessionId: result.session.sessionId,
            currentQuestionIndex: result.session.currentQuestionIndex,
            totalQuestions: result.session.questions.length,
            score: result.session.score,
            streakCount: result.session.streakCount
          }
        }
      };
    } catch (error) {
      strapi.log.error('Error submitting answer:', error);
      
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      
      ctx.internalServerError('Failed to submit answer');
    }
  },

  /**
   * Finish quiz session
   * POST /api/quiz/finish/:sessionId
   */
  async finish(ctx) {
    try {
      const { sessionId } = ctx.params;

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.getSession(sessionId);

      if (!session) {
        return ctx.notFound('Session not found or expired');
      }

      // Calculate final results
      const scoringService = strapi.service('api::quiz-engine.scoring');
      const phaseResult = scoringService.calculatePhaseResult({
        answers: session.answers,
        totalQuestions: session.questions.length,
        phaseNumber: session.phaseNumber
      });

      // Update session status
      sessionService.updateSession(sessionId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      ctx.body = {
        success: true,
        data: {
          sessionId: session.sessionId,
          phaseNumber: session.phaseNumber,
          totalScore: phaseResult.totalScore,
          maxScore: phaseResult.maxScore,
          accuracy: phaseResult.accuracy,
          grade: phaseResult.grade,
          passed: phaseResult.passed,
          timeSpent: session.answers.reduce((sum, a) => sum + (a.timeUsed || 0), 0),
          questionsAnswered: session.answers.length,
          correctAnswers: phaseResult.correctAnswers,
          wrongAnswers: phaseResult.wrongAnswers,
          analytics: phaseResult.analytics,
          recommendations: phaseResult.recommendations
        }
      };
    } catch (error) {
      strapi.log.error('Error finishing quiz:', error);
      ctx.internalServerError('Failed to finish quiz');
    }
  },

  /**
   * Pause session
   * POST /api/quiz/pause/:sessionId
   */
  async pause(ctx) {
    try {
      const { sessionId } = ctx.params;

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.pauseSession(sessionId);

      ctx.body = {
        success: true,
        message: 'Session paused',
        data: {
          sessionId: session.sessionId,
          isPaused: session.isPaused
        }
      };
    } catch (error) {
      strapi.log.error('Error pausing session:', error);
      
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      
      ctx.internalServerError('Failed to pause session');
    }
  },

  /**
   * Resume session
   * POST /api/quiz/resume/:sessionId
   */
  async resume(ctx) {
    try {
      const { sessionId } = ctx.params;

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.resumeSession(sessionId);

      ctx.body = {
        success: true,
        message: 'Session resumed',
        data: {
          sessionId: session.sessionId,
          isPaused: session.isPaused,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length
        }
      };
    } catch (error) {
      strapi.log.error('Error resuming session:', error);
      
      if (error.message.includes('not found')) {
        return ctx.notFound(error.message);
      }
      
      if (error.message.includes('timeout')) {
        return ctx.badRequest(error.message);
      }
      
      ctx.internalServerError('Failed to resume session');
    }
  },

  /**
   * Get session status
   * GET /api/quiz/session/:sessionId
   */
  async getSession(ctx) {
    try {
      const { sessionId } = ctx.params;

      const sessionService = strapi.service('api::quiz-engine.session');
      const session = sessionService.getSession(sessionId);

      if (!session) {
        return ctx.notFound('Session not found or expired');
      }

      const scoringService = strapi.service('api::quiz-engine.scoring');
      const stats = scoringService.getSessionStats(session);

      ctx.body = {
        success: true,
        data: {
          session: {
            sessionId: session.sessionId,
            phaseNumber: session.phaseNumber,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            score: session.score,
            streakCount: session.streakCount,
            isPaused: session.isPaused
          },
          stats
        }
      };
    } catch (error) {
      strapi.log.error('Error getting session:', error);
      ctx.internalServerError('Failed to get session');
    }
  },

  /**
   * Get game rules
   * GET /api/quiz/rules
   */
  async getRules(ctx) {
    try {
      const { phaseNumber } = ctx.query;
      
      if (phaseNumber) {
        const phaseNum = parseInt(phaseNumber);
        const phaseConfig = GameRulesHelper.getPhaseConfig(phaseNum);
        
        if (!phaseConfig) {
          return ctx.badRequest(`Invalid phase number: ${phaseNumber}`);
        }

        ctx.body = {
          success: true,
          data: {
            phaseNumber: phaseNum,
            phaseConfig
          }
        };
      } else {
        ctx.body = {
          success: true,
          data: {
            general: {
              questionsPerPhase: 10,
              timePerQuestion: 30000,
              totalPhases: 50
            },
            scoring: {
              basePoints: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
              speedBonus: true,
              streakBonus: true
            }
          }
        };
      }
    } catch (error) {
      strapi.log.error('Error getting rules:', error);
      ctx.internalServerError('Failed to get rules');
    }
  },

  /**
   * Get pool statistics
   * GET /api/quiz/pool-stats
   */
  async getPoolStats(ctx) {
    try {
      const { phaseNumber, locale = 'en' } = ctx.query;

      if (!phaseNumber) {
        return ctx.badRequest('phaseNumber is required');
      }

      const phaseNum = parseInt(phaseNumber);
      const selectorService = strapi.service('api::quiz-engine.selector');
      const stats = await selectorService.analyzePool(phaseNum, locale);

      ctx.body = {
        success: true,
        data: stats
      };
    } catch (error) {
      strapi.log.error('Error getting pool stats:', error);
      ctx.internalServerError('Failed to get pool stats');
    }
  },

  /**
   * Health check
   * GET /api/quiz/health
   */
  async health(ctx) {
    try {
      const sessionService = strapi.service('api::quiz-engine.session');
      const activeSessions = sessionService.getAllSessions().length;

      ctx.body = {
        success: true,
        status: 'healthy',
        data: {
          timestamp: new Date().toISOString(),
          activeSessions,
          version: '1.0.0'
        }
      };
    } catch (error) {
      strapi.log.error('Error in health check:', error);
      ctx.internalServerError('Health check failed');
    }
  }
};


