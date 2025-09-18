/**
 * 📊 Dashboard Controller
 * APIs for analytics dashboard and metrics visualization
 */

'use strict';

module.exports = {
  /**
   * GET /api/dashboard/overview
   * Complete dashboard overview with key metrics
   */
  async overview(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const overview = await dashboardService.getOverview();

      ctx.body = {
        success: true,
        data: overview,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Dashboard overview error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve dashboard overview',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/questions/stats
   * Detailed question statistics and insights
   */
  async questionStats(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const stats = await dashboardService.getQuestionStats();

      ctx.body = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Question stats error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve question statistics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/topics/performance
   * Performance metrics by topic
   */
  async topicPerformance(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const performance = await dashboardService.getTopicPerformance();

      ctx.body = {
        success: true,
        data: performance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Topic performance error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve topic performance',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/languages/usage
   * Language usage statistics and trends
   */
  async languageUsage(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const usage = await dashboardService.getLanguageUsage();

      ctx.body = {
        success: true,
        data: usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Language usage error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve language usage',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/performance/trends
   * Performance trends over time
   */
  async performanceTrends(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const trends = await dashboardService.getPerformanceTrends();

      ctx.body = {
        success: true,
        data: trends,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Performance trends error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve performance trends',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/system/health
   * System health dashboard data
   */
  async systemHealth(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const health = await dashboardService.getSystemHealth();

      ctx.body = {
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('System health dashboard error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve system health data',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/alerts
   * Current system alerts and warnings
   */
  async alerts(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const alerts = await dashboardService.getAlerts();

      ctx.body = {
        success: true,
        data: alerts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Dashboard alerts error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve alerts',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/metrics/export
   * Export dashboard metrics in various formats
   */
  async exportMetrics(ctx) {
    try {
      const format = ctx.query.format || 'json';
      const timeRange = ctx.query.timeRange || '24h';
      
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const exportData = await dashboardService.exportMetrics(format, timeRange);

      // Set appropriate headers based on format
      switch (format) {
        case 'csv':
          ctx.set('Content-Type', 'text/csv');
          ctx.set('Content-Disposition', `attachment; filename="astroquiz-metrics-${Date.now()}.csv"`);
          break;
        case 'json':
        default:
          ctx.set('Content-Type', 'application/json');
          break;
      }

      ctx.body = exportData;
    } catch (error) {
      strapi.log.error('Metrics export error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to export metrics',
        message: error.message
      };
    }
  },

  /**
   * GET /api/dashboard/recommendations
   * AI-powered recommendations for optimization
   */
  async recommendations(ctx) {
    try {
      const dashboardService = strapi.service('api::dashboard.dashboard');
      const recommendations = await dashboardService.getRecommendations();

      ctx.body = {
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Dashboard recommendations error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to retrieve recommendations',
        message: error.message
      };
    }
  }
};
