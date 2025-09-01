/**
 * Production Database Configuration
 * Optimized for Railway PostgreSQL deployment
 */

const { parse } = require('pg-connection-string');

module.exports = ({ env }) => {
  // Railway provides DATABASE_URL automatically
  const databaseUrl = env('DATABASE_URL');
  
  if (!databaseUrl) {
    // During build phase, DATABASE_URL might not be available yet
    // Use a fallback configuration that won't crash the build
    console.warn('DATABASE_URL not found, using fallback configuration for build phase');
    return {
      connection: {
        client: 'postgres',
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'strapi_build',
          user: 'strapi',
          password: 'strapi',
        },
        useNullAsDefault: true,
      },
    };
  }

  const config = parse(databaseUrl);

  return {
    connection: {
      client: 'postgres',
      connection: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: {
          rejectUnauthorized: false, // Railway requires this for SSL
        },
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
        acquireTimeoutMillis: env.int('DATABASE_ACQUIRE_TIMEOUT', 60000),
        createTimeoutMillis: env.int('DATABASE_CREATE_TIMEOUT', 30000),
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      debug: false,
    },
  };
};
