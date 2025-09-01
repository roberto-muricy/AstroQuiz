/**
 * 📊 Analytics Controller
 * Performance metrics and analytics for AstroQuiz backend
 */

'use strict';

module.exports = {
  /**
   * GET /api/analytics/performance
   * Performance metrics for all APIs
   */
  async performance(ctx) {
    try {
      const analyticsService = strapi.service('api::analytics.analytics');
      const performanceData = await analyticsService.getPerformanceMetrics();

      ctx.body = {
        success: true,
        data: performanceData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Performance analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve performance metrics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/analytics/database
   * Database performance and statistics
   */
  async database(ctx) {
    try {
      const analyticsService = strapi.service('api::analytics.analytics');
      const dbStats = await analyticsService.getDatabaseStats();

      ctx.body = {
        success: true,
        data: dbStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Database analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve database metrics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/analytics/questions
   * Question statistics and insights
   */
  async questions(ctx) {
    try {
      const analyticsService = strapi.service('api::analytics.analytics');
      const questionStats = await analyticsService.getQuestionStats();

      ctx.body = {
        success: true,
        data: questionStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Question analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve question statistics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/analytics/usage
   * API usage patterns and statistics
   */
  async usage(ctx) {
    try {
      const analyticsService = strapi.service('api::analytics.analytics');
      const usageStats = await analyticsService.getUsageStats();

      ctx.body = {
        success: true,
        data: usageStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Usage analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve usage statistics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/analytics/overview
   * Complete analytics overview
   */
  async overview(ctx) {
    try {
      const analyticsService = strapi.service('api::analytics.analytics');
      
      // Get all metrics in parallel
      const [performance, database, questions, usage] = await Promise.all([
        analyticsService.getPerformanceMetrics(),
        analyticsService.getDatabaseStats(),
        analyticsService.getQuestionStats(),
        analyticsService.getUsageStats()
      ]);

      const overview = {
        summary: {
          totalQuestions: questions.totalQuestions,
          totalLanguages: questions.languages.length,
          avgResponseTime: performance.averageResponseTime,
          errorRate: performance.errorRate,
          uptime: process.uptime()
        },
        performance,
        database,
        questions,
        usage
      };

      ctx.body = {
        success: true,
        data: overview,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Overview analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve analytics overview',
        message: error.message
      };
    }
  },

  /**
   * GET /api/analytics/realtime
   * Real-time performance metrics
   */
  async realtime(ctx) {
    try {
      const performanceMonitor = strapi.service('global::performance-monitor');
      const realtimeData = performanceMonitor.getRealtimeMetrics();

      ctx.body = {
        success: true,
        data: realtimeData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Realtime analytics error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve realtime metrics',
        message: error.message
      };
    }
  }
};
