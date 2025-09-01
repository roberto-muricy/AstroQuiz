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
        description: 'Basic health check endpoint for Railway and monitoring',
        tags: ['Health Check'],
        policies: [],
        middlewares: [],
        auth: false // No authentication required
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
