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
    }
  ]
};
