/**
 * Production Database Configuration
 * Optimized for Railway PostgreSQL deployment
 */

const { parse } = require('pg-connection-string');

module.exports = ({ env }) => {
  // Railway provides DATABASE_URL automatically
  const databaseUrl = env('DATABASE_URL');
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required in production');
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
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      debug: false,
    },
  };
};
