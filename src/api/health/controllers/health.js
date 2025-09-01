/**
 * Health Check Controller
 * Simple endpoint for Railway and monitoring services
 */

'use strict';

module.exports = {
  /**
   * Basic health check endpoint
   * GET /api/health
   */
  async index(ctx) {
    try {
      // Basic application health
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      };

      // Check database connectivity
      try {
        // Test database connection with question count
        const questionCount = await strapi.db.query('api::question.question').count();
        health.database = {
          status: 'connected',
          questionCount,
          client: strapi.db.config?.connection?.client || 'unknown'
        };
      } catch (error) {
        health.database = {
          status: 'disconnected',
          error: error.message
        };
        health.status = 'degraded';
        strapi.log.warn('Database health check failed:', error.message);
      }

      // Check Quiz Engine services
      try {
        const sessionService = strapi.service('api::quiz-engine.session');
        const scoringService = strapi.service('api::quiz-engine.scoring');
        const selectorService = strapi.service('api::quiz-engine.selector');
        
        health.services = {
          session: !!sessionService,
          scoring: !!scoringService,
          selector: !!selectorService
        };

        // If any critical service is missing, mark as degraded
        if (!sessionService || !scoringService || !selectorService) {
          health.status = 'degraded';
        }
      } catch (error) {
        health.services = { error: 'Quiz Engine services not available' };
        health.status = 'degraded';
        strapi.log.warn('Quiz Engine health check failed:', error.message);
      }

      // Memory and system usage
      const memUsage = process.memoryUsage();
      health.system = {
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform
      };

      // DeepL integration check
      try {
        const deeplApiKey = process.env.DEEPL_API_KEY;
        health.integrations = {
          deepl: {
            configured: !!deeplApiKey,
            apiUrl: process.env.DEEPL_API_URL || 'not-set'
          }
        };
      } catch (error) {
        health.integrations = { error: 'Integration check failed' };
      }

      // Set appropriate HTTP status
      ctx.status = health.status === 'healthy' ? 200 : 503;
      
      ctx.body = {
        success: health.status === 'healthy',
        data: health
      };

    } catch (error) {
      strapi.log.error('Health check failed:', error);
      
      ctx.status = 503;
      ctx.body = {
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  },

  /**
   * Detailed health check with more information
   * GET /api/health/detailed
   */
  async detailed(ctx) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      };

      // System information
      health.system = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      };

      // Database detailed check
      try {
        const questionCount = await strapi.db.query('api::question.question').count();
        health.database = {
          status: 'connected',
          questionCount,
          client: strapi.db.config.connection.client
        };
      } catch (error) {
        health.database = {
          status: 'disconnected',
          error: error.message
        };
        health.status = 'degraded';
      }

      // Quiz Engine detailed check
      try {
        const services = {
          session: strapi.service('api::quiz-engine.session'),
          scoring: strapi.service('api::quiz-engine.scoring'),
          selector: strapi.service('api::quiz-engine.selector')
        };

        health.quizEngine = {
          status: 'operational',
          services: Object.fromEntries(
            Object.entries(services).map(([name, service]) => [name, !!service])
          )
        };

        // Test scoring service
        if (services.scoring) {
          const testScore = services.scoring.calculateAnswerScore({
            level: 3,
            timeRemaining: 15000,
            isCorrect: true,
            streakCount: 2
          });
          health.quizEngine.testScore = testScore.totalPoints;
        }

      } catch (error) {
        health.quizEngine = {
          status: 'error',
          error: error.message
        };
        health.status = 'degraded';
      }

      // Memory and performance
      const memUsage = process.memoryUsage();
      health.performance = {
        memory: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        },
        uptime: process.uptime(),
        loadAverage: require('os').loadavg()
      };

      // Environment variables check (without exposing values)
      const requiredEnvVars = [
        'NODE_ENV',
        'APP_KEYS',
        'API_TOKEN_SALT',
        'ADMIN_JWT_SECRET',
        'JWT_SECRET'
      ];

      health.environment = {
        nodeEnv: process.env.NODE_ENV,
        requiredVars: requiredEnvVars.reduce((acc, key) => {
          acc[key] = !!process.env[key];
          return acc;
        }, {})
      };

      // Check if any required env vars are missing
      const missingVars = requiredEnvVars.filter(key => !process.env[key]);
      if (missingVars.length > 0) {
        health.environment.missing = missingVars;
        health.status = 'degraded';
      }

      ctx.status = health.status === 'healthy' ? 200 : 503;
      ctx.body = {
        success: health.status === 'healthy',
        data: health
      };

    } catch (error) {
      strapi.log.error('Detailed health check failed:', error);
      
      ctx.status = 503;
      ctx.body = {
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }
};
