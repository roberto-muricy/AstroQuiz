/**
 * 📊 Dashboard Routes
 * Analytics dashboard API endpoints
 */

'use strict';

module.exports = {
  routes: [
    // Dashboard overview
    {
      method: 'GET',
      path: '/dashboard/overview',
      handler: 'dashboard.overview',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor', 'global::cache']
      }
    },

    // Question statistics
    {
      method: 'GET',
      path: '/dashboard/questions/stats',
      handler: 'dashboard.questionStats',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor', 'global::cache']
      }
    },

    // Topic performance
    {
      method: 'GET',
      path: '/dashboard/topics/performance',
      handler: 'dashboard.topicPerformance',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor', 'global::cache']
      }
    },

    // Language usage
    {
      method: 'GET',
      path: '/dashboard/languages/usage',
      handler: 'dashboard.languageUsage',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor', 'global::cache']
      }
    },

    // Performance trends
    {
      method: 'GET',
      path: '/dashboard/performance/trends',
      handler: 'dashboard.performanceTrends',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // System health
    {
      method: 'GET',
      path: '/dashboard/system/health',
      handler: 'dashboard.systemHealth',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Alerts
    {
      method: 'GET',
      path: '/dashboard/alerts',
      handler: 'dashboard.alerts',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },

    // Metrics export
    {
      method: 'GET',
      path: '/dashboard/metrics/export',
      handler: 'dashboard.exportMetrics',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Recommendations
    {
      method: 'GET',
      path: '/dashboard/recommendations',
      handler: 'dashboard.recommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor', 'global::cache']
      }
    }
  ]
};
