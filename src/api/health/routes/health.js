/**
 * Health Check Routes
 * Simple endpoints for monitoring and Railway health checks
 */

'use strict';

module.exports = {
  routes: [
    // Basic health check for Railway
    {
      method: 'GET',
      path: '/health',
      handler: 'health.index',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },

    // Detailed health check for debugging
    {
      method: 'GET',
      path: '/health/detailed',
      handler: 'health.detailed',
      config: {
        description: 'Detailed health check with system information',
        tags: ['Health Check', 'System'],
        policies: [],
        middlewares: [],
        auth: false
      }
    },

    // Advanced health check with comprehensive metrics
    {
      method: 'GET',
      path: '/health/advanced',
      handler: 'advanced-health.advanced',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },

    // Real-time metrics endpoint
    {
      method: 'GET',
      path: '/health/metrics',
      handler: 'advanced-health.metrics',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },

    // Database-specific health check
    {
      method: 'GET',
      path: '/health/database',
      handler: 'advanced-health.database',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};
