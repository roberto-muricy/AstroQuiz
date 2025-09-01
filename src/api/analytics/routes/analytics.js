/**
 * 📊 Analytics Routes
 * Performance monitoring and analytics endpoints
 */

'use strict';

module.exports = {
  routes: [
    // Performance metrics
    {
      method: 'GET',
      path: '/analytics/performance',
      handler: 'analytics.performance',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Database statistics
    {
      method: 'GET',
      path: '/analytics/database',
      handler: 'analytics.database',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Question analytics
    {
      method: 'GET',
      path: '/analytics/questions',
      handler: 'analytics.questions',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Usage statistics
    {
      method: 'GET',
      path: '/analytics/usage',
      handler: 'analytics.usage',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Complete overview
    {
      method: 'GET',
      path: '/analytics/overview',
      handler: 'analytics.overview',
      config: {
        auth: false,
        policies: [],
        middlewares: ['global::performance-monitor']
      }
    },

    // Real-time metrics
    {
      method: 'GET',
      path: '/analytics/realtime',
      handler: 'analytics.realtime',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};
