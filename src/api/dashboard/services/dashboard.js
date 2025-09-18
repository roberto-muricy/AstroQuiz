/**
 * 📊 Dashboard Service
 * Core dashboard data aggregation and analytics service
 */

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Get complete dashboard overview
   */
  async getOverview() {
    try {
      // Gather all key metrics in parallel
      const [
        questionStats,
        performanceMetrics,
        systemHealth,
        topicPerformance,
        languageUsage,
        alerts
      ] = await Promise.all([
        this.getQuestionStats(),
        this.getPerformanceMetrics(),
        this.getSystemHealth(),
        this.getTopicPerformance(),
        this.getLanguageUsage(),
        this.getAlerts()
      ]);

      // Calculate overall health score
      const overallScore = this.calculateOverallScore({
        questionStats,
        performanceMetrics,
        systemHealth
      });

      return {
        summary: {
          overallScore,
          status: this.getStatusFromScore(overallScore),
          totalQuestions: questionStats.total,
          totalLanguages: languageUsage.languages.length,
          avgResponseTime: performanceMetrics.avgResponseTime,
          systemUptime: systemHealth.uptime,
          activeAlerts: alerts.filter(a => a.severity === 'critical').length
        },
        questions: questionStats,
        performance: performanceMetrics,
        system: systemHealth,
        topics: topicPerformance,
        languages: languageUsage,
        alerts: alerts.slice(0, 5), // Top 5 alerts
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Dashboard overview error:', error);
      throw error;
    }
  },

  /**
   * Get detailed question statistics
   */
  async getQuestionStats() {
    try {
      // Get total questions
      const total = await strapi.db.query('api::question.question').count();
      
      // Get questions by locale
      const locales = ['en', 'pt', 'es', 'fr'];
      const byLocale = {};
      for (const locale of locales) {
        byLocale[locale] = await strapi.db.query('api::question.question').count({
          where: { locale }
        });
      }

      // Get questions by level
      const byLevel = {};
      for (let level = 1; level <= 5; level++) {
        byLevel[`level${level}`] = await strapi.db.query('api::question.question').count({
          where: { level }
        });
      }

      // Get unique topics
      const topicsQuery = await strapi.db.query('api::question.question').findMany({
        select: ['topic'],
        groupBy: ['topic']
      });
      const topics = [...new Set(topicsQuery.map(q => q.topic))];

      // Get topic distribution
      const byTopic = {};
      for (const topic of topics.slice(0, 10)) { // Top 10 topics
        byTopic[topic] = await strapi.db.query('api::question.question').count({
          where: { topic }
        });
      }

      // Calculate quality metrics
      const qualityMetrics = {
        languageBalance: this.calculateLanguageBalance(byLocale),
        levelDistribution: this.calculateLevelDistribution(byLevel),
        topicCoverage: topics.length,
        completeness: this.calculateCompleteness(byLocale, byLevel, topics.length)
      };

      return {
        total,
        byLocale,
        byLevel,
        byTopic,
        totalTopics: topics.length,
        quality: qualityMetrics,
        trends: await this.getQuestionTrends()
      };
    } catch (error) {
      strapi.log.error('Question stats error:', error);
      throw error;
    }
  },

  /**
   * Get topic performance metrics
   */
  async getTopicPerformance() {
    try {
      // Get all unique topics
      const topicsQuery = await strapi.db.query('api::question.question').findMany({
        select: ['topic'],
        groupBy: ['topic']
      });
      const topics = [...new Set(topicsQuery.map(q => q.topic))];

      const topicMetrics = [];

      for (const topic of topics.slice(0, 15)) { // Top 15 topics
        // Get question count by topic
        const questionCount = await strapi.db.query('api::question.question').count({
          where: { topic }
        });

        // Get language coverage for this topic
        const languageCoverage = {};
        for (const locale of ['en', 'pt', 'es', 'fr']) {
          languageCoverage[locale] = await strapi.db.query('api::question.question').count({
            where: { topic, locale }
          });
        }

        // Get level distribution for this topic
        const levelDistribution = {};
        for (let level = 1; level <= 5; level++) {
          levelDistribution[`level${level}`] = await strapi.db.query('api::question.question').count({
            where: { topic, level }
          });
        }

        // Calculate topic metrics
        const completeness = Object.values(languageCoverage).filter(count => count > 0).length / 4 * 100;
        const balance = this.calculateTopicBalance(languageCoverage);
        const coverage = Object.values(levelDistribution).filter(count => count > 0).length / 5 * 100;

        topicMetrics.push({
          topic,
          questionCount,
          languageCoverage,
          levelDistribution,
          metrics: {
            completeness: Math.round(completeness),
            balance: Math.round(balance),
            coverage: Math.round(coverage),
            score: Math.round((completeness + balance + coverage) / 3)
          }
        });
      }

      // Sort by score descending
      topicMetrics.sort((a, b) => b.metrics.score - a.metrics.score);

      return {
        topics: topicMetrics,
        summary: {
          totalTopics: topics.length,
          avgScore: Math.round(topicMetrics.reduce((sum, t) => sum + t.metrics.score, 0) / topicMetrics.length),
          topPerformers: topicMetrics.slice(0, 5).map(t => t.topic),
          needsAttention: topicMetrics.filter(t => t.metrics.score < 50).map(t => t.topic)
        }
      };
    } catch (error) {
      strapi.log.error('Topic performance error:', error);
      throw error;
    }
  },

  /**
   * Get language usage statistics
   */
  async getLanguageUsage() {
    try {
      const languages = ['en', 'pt', 'es', 'fr'];
      const languageData = [];

      for (const locale of languages) {
        const questionCount = await strapi.db.query('api::question.question').count({
          where: { locale }
        });

        // Get topic coverage for this language
        const topicsQuery = await strapi.db.query('api::question.question').findMany({
          select: ['topic'],
          where: { locale },
          groupBy: ['topic']
        });
        const topicCount = [...new Set(topicsQuery.map(q => q.topic))].length;

        // Get level distribution
        const levelDistribution = {};
        for (let level = 1; level <= 5; level++) {
          levelDistribution[`level${level}`] = await strapi.db.query('api::question.question').count({
            where: { locale, level }
          });
        }

        languageData.push({
          locale,
          name: this.getLanguageName(locale),
          questionCount,
          topicCount,
          levelDistribution,
          coverage: topicCount > 0 ? Math.round((topicCount / 20) * 100) : 0, // Assuming 20 total topics
          completeness: Object.values(levelDistribution).filter(count => count > 0).length / 5 * 100
        });
      }

      // Calculate usage trends and insights
      const totalQuestions = languageData.reduce((sum, lang) => sum + lang.questionCount, 0);
      const usagePercentages = languageData.map(lang => ({
        ...lang,
        percentage: totalQuestions > 0 ? Math.round((lang.questionCount / totalQuestions) * 100) : 0
      }));

      return {
        languages: usagePercentages,
        summary: {
          totalQuestions,
          mostUsed: usagePercentages.reduce((max, lang) => lang.questionCount > max.questionCount ? lang : max),
          leastUsed: usagePercentages.reduce((min, lang) => lang.questionCount < min.questionCount ? lang : min),
          balance: this.calculateLanguageBalance(languageData.reduce((acc, lang) => {
            acc[lang.locale] = lang.questionCount;
            return acc;
          }, {})),
          avgCompleteness: Math.round(languageData.reduce((sum, lang) => sum + lang.completeness, 0) / languages.length)
        }
      };
    } catch (error) {
      strapi.log.error('Language usage error:', error);
      throw error;
    }
  },

  /**
   * Get performance metrics from monitoring system
   */
  async getPerformanceMetrics() {
    try {
      const performanceMonitor = strapi.service('global::performance-monitor');
      const metrics = performanceMonitor.getMetrics();
      const realtimeMetrics = performanceMonitor.getRealtimeMetrics();

      return {
        avgResponseTime: metrics.avgResponseTime || 0,
        p95ResponseTime: metrics.p95ResponseTime || 0,
        requestsPerSecond: metrics.requestsPerSecond || 0,
        errorRate: (metrics.errorRate * 100).toFixed(2) + '%',
        totalRequests: metrics.totalRequests || 0,
        totalErrors: metrics.totalErrors || 0,
        uptime: metrics.uptime || 0,
        realtime: {
          currentRPS: realtimeMetrics.currentRPS || 0,
          memoryUsage: realtimeMetrics.memoryUsage || process.memoryUsage(),
          activeRequests: realtimeMetrics.activeRequests || 0
        },
        endpoints: Object.entries(metrics.endpoints || {}).map(([endpoint, stats]) => ({
          endpoint,
          count: stats.count,
          avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
          errorRate: ((stats.errors / stats.count) * 100).toFixed(2) + '%'
        })).sort((a, b) => b.count - a.count).slice(0, 10)
      };
    } catch (error) {
      strapi.log.error('Performance metrics error:', error);
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: '0%',
        totalRequests: 0,
        totalErrors: 0,
        uptime: 0,
        endpoints: []
      };
    }
  },

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Get database health
      let dbHealth = { status: 'unknown', responseTime: 0 };
      try {
        const startTime = Date.now();
        await strapi.db.query('api::question.question').count();
        dbHealth = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        dbHealth = {
          status: 'error',
          error: error.message
        };
      }

      // Get cache stats if available
      let cacheHealth = { status: 'unknown' };
      try {
        const cacheMiddleware = require('../../middlewares/cache');
        const cacheStats = cacheMiddleware.getStats();
        cacheHealth = {
          status: 'healthy',
          hitRate: cacheStats.hitRate,
          totalEntries: cacheStats.totalEntries
        };
      } catch (error) {
        cacheHealth = { status: 'disabled' };
      }

      return {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
          status: memUsage.heapUsed > 512 * 1024 * 1024 ? 'warning' : 'healthy'
        },
        uptime: {
          seconds: Math.round(uptime),
          formatted: this.formatUptime(uptime)
        },
        database: dbHealth,
        cache: cacheHealth,
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      strapi.log.error('System health error:', error);
      throw error;
    }
  },

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends() {
    try {
      const performanceMonitor = strapi.service('global::performance-monitor');
      const metrics = performanceMonitor.getMetrics();

      // Generate trend data (in a real implementation, you'd store historical data)
      const now = Date.now();
      const trendData = {
        responseTime: this.generateTrendData('responseTime', metrics.avgResponseTime, 24),
        requestsPerSecond: this.generateTrendData('rps', metrics.requestsPerSecond, 24),
        errorRate: this.generateTrendData('errorRate', metrics.errorRate * 100, 24),
        memoryUsage: this.generateTrendData('memory', process.memoryUsage().heapUsed / 1024 / 1024, 24)
      };

      return {
        trends: trendData,
        summary: {
          responseTimeTrend: this.calculateTrend(trendData.responseTime),
          requestsTrend: this.calculateTrend(trendData.requestsPerSecond),
          errorRateTrend: this.calculateTrend(trendData.errorRate),
          memoryTrend: this.calculateTrend(trendData.memoryUsage)
        },
        timeRange: '24h',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Performance trends error:', error);
      throw error;
    }
  },

  /**
   * Get current alerts and warnings
   */
  async getAlerts() {
    try {
      const alerts = [];
      const performanceMonitor = strapi.service('global::performance-monitor');
      
      // Get performance alerts
      const performanceAlerts = performanceMonitor.getPerformanceAlerts();
      alerts.push(...performanceAlerts);

      // Add system alerts
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 256 * 1024 * 1024) {
        alerts.push({
          type: 'warning',
          category: 'system',
          message: `High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          severity: memUsage.heapUsed > 512 * 1024 * 1024 ? 'critical' : 'warning',
          timestamp: Date.now()
        });
      }

      // Add database alerts
      try {
        const questionCount = await strapi.db.query('api::question.question').count();
        if (questionCount === 0) {
          alerts.push({
            type: 'warning',
            category: 'database',
            message: 'No questions found in database',
            severity: 'warning',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        alerts.push({
          type: 'error',
          category: 'database',
          message: 'Database connectivity issues',
          severity: 'critical',
          timestamp: Date.now()
        });
      }

      // Sort by severity and timestamp
      alerts.sort((a, b) => {
        const severityOrder = { 'critical': 3, 'warning': 2, 'info': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity] || b.timestamp - a.timestamp;
      });

      return alerts;
    } catch (error) {
      strapi.log.error('Alerts error:', error);
      return [];
    }
  },

  /**
   * Export metrics in various formats
   */
  async exportMetrics(format = 'json', timeRange = '24h') {
    try {
      const overview = await this.getOverview();
      
      switch (format) {
        case 'csv':
          return this.formatAsCSV(overview);
        case 'json':
        default:
          return {
            exportFormat: format,
            timeRange,
            generatedAt: new Date().toISOString(),
            data: overview
          };
      }
    } catch (error) {
      strapi.log.error('Export metrics error:', error);
      throw error;
    }
  },

  /**
   * Get AI-powered recommendations
   */
  async getRecommendations() {
    try {
      const overview = await this.getOverview();
      const recommendations = [];

      // Performance recommendations
      if (overview.performance.avgResponseTime > 1000) {
        recommendations.push({
          priority: 'high',
          category: 'performance',
          title: 'Optimize Response Times',
          description: 'Average response time is above 1 second. Consider implementing caching or database optimization.',
          expectedImpact: '30-50% response time improvement',
          actions: ['Enable query caching', 'Add database indexes', 'Optimize slow endpoints']
        });
      }

      // Question balance recommendations
      const languageBalance = overview.languages.summary.balance;
      if (languageBalance < 80) {
        recommendations.push({
          priority: 'medium',
          category: 'content',
          title: 'Improve Language Balance',
          description: `Language distribution is unbalanced (${languageBalance}% balance). Consider adding more questions to underrepresented languages.`,
          expectedImpact: 'Better user experience across all languages',
          actions: ['Identify underrepresented languages', 'Add more questions', 'Use translation services']
        });
      }

      // System health recommendations
      if (overview.system.memory.percentage > 80) {
        recommendations.push({
          priority: 'medium',
          category: 'system',
          title: 'Memory Optimization',
          description: `Memory usage is high (${overview.system.memory.percentage}%). Consider optimizing memory usage.`,
          expectedImpact: 'Better system stability and performance',
          actions: ['Implement garbage collection tuning', 'Optimize data structures', 'Add memory monitoring']
        });
      }

      // Topic coverage recommendations
      const needsAttention = overview.topics.summary.needsAttention;
      if (needsAttention.length > 0) {
        recommendations.push({
          priority: 'low',
          category: 'content',
          title: 'Improve Topic Coverage',
          description: `${needsAttention.length} topics need attention: ${needsAttention.slice(0, 3).join(', ')}`,
          expectedImpact: 'More comprehensive quiz content',
          actions: ['Review topic balance', 'Add questions to weak topics', 'Improve topic distribution']
        });
      }

      return {
        recommendations,
        summary: {
          total: recommendations.length,
          byPriority: {
            critical: recommendations.filter(r => r.priority === 'critical').length,
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
          },
          byCategory: recommendations.reduce((acc, rec) => {
            acc[rec.category] = (acc[rec.category] || 0) + 1;
            return acc;
          }, {})
        },
        lastGenerated: new Date().toISOString()
      };
    } catch (error) {
      strapi.log.error('Recommendations error:', error);
      throw error;
    }
  },

  // Helper methods
  calculateOverallScore({ questionStats, performanceMetrics, systemHealth }) {
    let score = 100;

    // Content score (30% weight)
    if (questionStats.total === 0) score -= 30;
    else if (questionStats.total < 100) score -= 15;
    else if (questionStats.quality.completeness < 80) score -= 10;

    // Performance score (40% weight)
    if (performanceMetrics.avgResponseTime > 2000) score -= 40;
    else if (performanceMetrics.avgResponseTime > 1000) score -= 20;
    else if (performanceMetrics.avgResponseTime > 500) score -= 10;

    // System health score (30% weight)
    if (systemHealth.memory.percentage > 90) score -= 30;
    else if (systemHealth.memory.percentage > 80) score -= 15;
    else if (systemHealth.memory.percentage > 70) score -= 5;

    return Math.max(0, Math.round(score));
  },

  getStatusFromScore(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  },

  calculateLanguageBalance(byLocale) {
    const counts = Object.values(byLocale);
    if (counts.length === 0) return 0;
    
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    
    return max === 0 ? 0 : Math.round((min / max) * 100);
  },

  calculateLevelDistribution(byLevel) {
    const total = Object.values(byLevel).reduce((sum, count) => sum + count, 0);
    const distribution = {};
    
    Object.entries(byLevel).forEach(([level, count]) => {
      distribution[level] = total > 0 ? Math.round((count / total) * 100) : 0;
    });
    
    return distribution;
  },

  calculateCompleteness(byLocale, byLevel, topicCount) {
    const languageCompleteness = Object.values(byLocale).filter(count => count > 0).length / 4 * 100;
    const levelCompleteness = Object.values(byLevel).filter(count => count > 0).length / 5 * 100;
    const topicCompleteness = topicCount > 0 ? Math.min(topicCount / 20 * 100, 100) : 0; // Assuming 20 ideal topics
    
    return Math.round((languageCompleteness + levelCompleteness + topicCompleteness) / 3);
  },

  calculateTopicBalance(languageCoverage) {
    const counts = Object.values(languageCoverage);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    
    return max === 0 ? 0 : (min / max) * 100;
  },

  getLanguageName(locale) {
    const names = {
      'en': 'English',
      'pt': 'Portuguese',
      'es': 'Spanish',
      'fr': 'French'
    };
    return names[locale] || locale;
  },

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  generateTrendData(metric, currentValue, hours) {
    const data = [];
    const now = Date.now();
    
    for (let i = hours - 1; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const value = Math.max(0, currentValue * (1 + variation));
      
      data.push({
        timestamp,
        value: Math.round(value * 100) / 100,
        formatted: new Date(timestamp).toISOString()
      });
    }
    
    return data;
  },

  calculateTrend(trendData) {
    if (trendData.length < 2) return 'stable';
    
    const first = trendData[0].value;
    const last = trendData[trendData.length - 1].value;
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  },

  async getQuestionTrends() {
    // Placeholder for question trends over time
    // In a real implementation, you'd track question creation/modification dates
    return {
      recentlyAdded: 0,
      recentlyModified: 0,
      growthRate: 0
    };
  },

  formatAsCSV(data) {
    const headers = [
      'Timestamp',
      'Overall Score',
      'Total Questions',
      'Avg Response Time',
      'Error Rate',
      'Memory Usage %',
      'Active Alerts'
    ];
    
    const row = [
      data.lastUpdated,
      data.summary.overallScore,
      data.summary.totalQuestions,
      data.performance.avgResponseTime,
      data.performance.errorRate,
      data.system.memory.percentage,
      data.summary.activeAlerts
    ];
    
    return headers.join(',') + '\n' + row.join(',');
  }
});
