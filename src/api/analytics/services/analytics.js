/**
 * 📊 Analytics Service
 * Core analytics and metrics calculation service
 */

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics() {
    const performanceMonitor = strapi.service('global::performance-monitor');
    const metrics = performanceMonitor.getMetrics();

    return {
      averageResponseTime: metrics.avgResponseTime || 0,
      p95ResponseTime: metrics.p95ResponseTime || 0,
      requestsPerSecond: metrics.requestsPerSecond || 0,
      errorRate: metrics.errorRate || 0,
      totalRequests: metrics.totalRequests || 0,
      totalErrors: metrics.totalErrors || 0,
      endpointMetrics: metrics.endpoints || {},
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Get database performance statistics
   */
  async getDatabaseStats() {
    try {
      // Get question counts
      const totalQuestions = await strapi.db.query('api::question.question').count();
      
      // Get questions by locale
      const localeStats = await Promise.all([
        strapi.db.query('api::question.question').count({ where: { locale: 'en' } }),
        strapi.db.query('api::question.question').count({ where: { locale: 'pt' } }),
        strapi.db.query('api::question.question').count({ where: { locale: 'es' } }),
        strapi.db.query('api::question.question').count({ where: { locale: 'fr' } })
      ]);

      // Get questions by level
      const levelStats = await Promise.all([
        strapi.db.query('api::question.question').count({ where: { level: 1 } }),
        strapi.db.query('api::question.question').count({ where: { level: 2 } }),
        strapi.db.query('api::question.question').count({ where: { level: 3 } }),
        strapi.db.query('api::question.question').count({ where: { level: 4 } }),
        strapi.db.query('api::question.question').count({ where: { level: 5 } })
      ]);

      // Database connection info
      const dbConfig = strapi.db.config;
      
      return {
        totalQuestions,
        byLocale: {
          en: localeStats[0],
          pt: localeStats[1],
          es: localeStats[2],
          fr: localeStats[3]
        },
        byLevel: {
          level1: levelStats[0],
          level2: levelStats[1],
          level3: levelStats[2],
          level4: levelStats[3],
          level5: levelStats[4]
        },
        connection: {
          client: dbConfig?.connection?.client || 'unknown',
          pool: dbConfig?.connection?.pool || {},
          status: 'connected'
        },
        performance: {
          // Add query performance metrics if available
          slowQueries: 0, // Placeholder
          avgQueryTime: 0, // Placeholder
          connectionPool: {
            active: 0, // Placeholder
            idle: 0 // Placeholder
          }
        }
      };
    } catch (error) {
      strapi.log.error('Database stats error:', error);
      return {
        error: 'Failed to retrieve database statistics',
        message: error.message
      };
    }
  },

  /**
   * Get question statistics and insights
   */
  async getQuestionStats() {
    try {
      // Get total questions
      const totalQuestions = await strapi.db.query('api::question.question').count();
      
      // Get unique topics
      const topicsQuery = await strapi.db.query('api::question.question').findMany({
        select: ['topic'],
        groupBy: ['topic']
      });
      
      const topics = [...new Set(topicsQuery.map(q => q.topic))];
      
      // Get topic distribution
      const topicStats = {};
      for (const topic of topics) {
        topicStats[topic] = await strapi.db.query('api::question.question').count({
          where: { topic }
        });
      }

      // Get difficulty distribution
      const difficultyStats = {};
      for (let level = 1; level <= 5; level++) {
        difficultyStats[`level${level}`] = await strapi.db.query('api::question.question').count({
          where: { level }
        });
      }

      // Get language distribution
      const languages = ['en', 'pt', 'es', 'fr'];
      const languageStats = {};
      for (const lang of languages) {
        languageStats[lang] = await strapi.db.query('api::question.question').count({
          where: { locale: lang }
        });
      }

      return {
        totalQuestions,
        totalTopics: topics.length,
        languages,
        topicDistribution: topicStats,
        difficultyDistribution: difficultyStats,
        languageDistribution: languageStats,
        averageQuestionsPerTopic: Math.round(totalQuestions / topics.length),
        completeness: {
          allLanguages: languages.every(lang => languageStats[lang] > 0),
          allLevels: Object.values(difficultyStats).every(count => count > 0),
          allTopics: Object.values(topicStats).every(count => count > 0)
        }
      };
    } catch (error) {
      strapi.log.error('Question stats error:', error);
      return {
        error: 'Failed to retrieve question statistics',
        message: error.message
      };
    }
  },

  /**
   * Get API usage statistics
   */
  async getUsageStats() {
    const performanceMonitor = strapi.service('global::performance-monitor');
    const metrics = performanceMonitor.getMetrics();

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      totalRequests: metrics.totalRequests || 0,
      totalErrors: metrics.totalErrors || 0,
      requestsPerHour: metrics.requestsPerHour || 0,
      requestsPerDay: metrics.requestsPerDay || 0,
      mostUsedEndpoints: metrics.topEndpoints || [],
      errorsByEndpoint: metrics.errorsByEndpoint || {},
      responseTimeByEndpoint: metrics.responseTimeByEndpoint || {},
      userAgents: metrics.userAgents || {},
      geolocation: metrics.geolocation || {},
      timeRanges: {
        lastHour: {
          requests: metrics.requestsLastHour || 0,
          errors: metrics.errorsLastHour || 0,
          avgResponseTime: metrics.avgResponseTimeLastHour || 0
        },
        last24Hours: {
          requests: metrics.requestsLast24h || 0,
          errors: metrics.errorsLast24h || 0,
          avgResponseTime: metrics.avgResponseTimeLast24h || 0
        }
      },
      peakUsage: {
        maxRequestsPerMinute: metrics.maxRequestsPerMinute || 0,
        peakHour: metrics.peakHour || null,
        peakDay: metrics.peakDay || null
      }
    };
  },

  /**
   * Generate performance insights and recommendations
   */
  async getPerformanceInsights() {
    const performance = await this.getPerformanceMetrics();
    const database = await this.getDatabaseStats();
    const questions = await this.getQuestionStats();
    const usage = await this.getUsageStats();

    const insights = [];
    const recommendations = [];

    // Analyze response times
    if (performance.averageResponseTime > 2000) {
      insights.push({
        type: 'warning',
        category: 'performance',
        message: 'Average response time is above 2 seconds',
        value: performance.averageResponseTime,
        threshold: 2000
      });
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Implement caching for frequently accessed endpoints',
        expectedImpact: '30-50% response time improvement'
      });
    }

    // Analyze error rates
    if (performance.errorRate > 0.05) {
      insights.push({
        type: 'error',
        category: 'reliability',
        message: 'Error rate is above 5%',
        value: performance.errorRate,
        threshold: 0.05
      });
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        action: 'Investigate and fix error sources',
        expectedImpact: 'Improved user experience and system stability'
      });
    }

    // Analyze memory usage
    const memoryUsageMB = parseInt(performance.memoryUsage.rss);
    if (memoryUsageMB > 512) {
      insights.push({
        type: 'warning',
        category: 'resources',
        message: 'Memory usage is high for Railway deployment',
        value: memoryUsageMB,
        threshold: 512
      });
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        action: 'Optimize memory usage and implement garbage collection tuning',
        expectedImpact: 'Reduced Railway costs and better performance'
      });
    }

    // Analyze database efficiency
    if (database.totalQuestions > 1000 && !database.performance) {
      recommendations.push({
        priority: 'medium',
        category: 'database',
        action: 'Implement database indexing for topic, level, and locale fields',
        expectedImpact: '20-40% query performance improvement'
      });
    }

    return {
      insights,
      recommendations,
      score: this.calculatePerformanceScore(performance, database, usage),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Calculate overall performance score (0-100)
   */
  calculatePerformanceScore(performance, database, usage) {
    let score = 100;

    // Response time impact (30% weight)
    if (performance.averageResponseTime > 3000) score -= 30;
    else if (performance.averageResponseTime > 2000) score -= 20;
    else if (performance.averageResponseTime > 1000) score -= 10;

    // Error rate impact (25% weight)
    if (performance.errorRate > 0.1) score -= 25;
    else if (performance.errorRate > 0.05) score -= 15;
    else if (performance.errorRate > 0.01) score -= 5;

    // Memory usage impact (20% weight)
    const memoryUsageMB = parseInt(performance.memoryUsage.rss);
    if (memoryUsageMB > 1024) score -= 20;
    else if (memoryUsageMB > 512) score -= 10;
    else if (memoryUsageMB > 256) score -= 5;

    // Database health impact (15% weight)
    if (database.error) score -= 15;
    else if (database.totalQuestions === 0) score -= 10;

    // Usage patterns impact (10% weight)
    if (usage.totalRequests === 0) score -= 10;
    else if (usage.requestsPerSecond > 100) score += 5; // Bonus for high usage

    return Math.max(0, Math.round(score));
  }
});
