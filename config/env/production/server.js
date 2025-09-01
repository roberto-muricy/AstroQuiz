/**
 * Production Server Configuration
 * Optimized for Railway deployment with security best practices
 */

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  
  // Admin panel configuration
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    url: env('STRAPI_ADMIN_BACKEND_URL', '/admin'),
    serveAdminPanel: true,
  },

  // Security settings for production
  middlewares: [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': ["'self'", 'data:', 'blob:', 'https:'],
            'media-src': ["'self'", 'data:', 'blob:', 'https:'],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        enabled: true,
        headers: '*',
        origin: [
          'http://localhost:3000',
          'https://localhost:3000',
          env('STRAPI_ADMIN_BACKEND_URL', 'https://your-app.railway.app'),
          // Add your frontend domains here
        ],
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ],

  // App configuration
  app: {
    keys: env.array('APP_KEYS'),
  },

  // Webhook configuration
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },

  // API configuration
  api: {
    rest: {
      defaultLimit: 25,
      maxLimit: 100,
      withCount: true,
    },
  },

  // Server configuration
  server: {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    proxy: env.bool('IS_PROXIED', true), // Railway uses proxy
  },

  // Trust proxy for Railway
  proxy: true,
  
  // Cron jobs (disabled in production for performance)
  cron: {
    enabled: false,
  },
});
