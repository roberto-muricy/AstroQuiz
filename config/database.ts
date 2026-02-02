import path from 'path';

export default ({ env }) => {
  // DEBUG: Log environment variables to see what's being received
  console.log('🔍 DATABASE CONFIG DEBUG:');
  console.log('  process.env.DATABASE_CLIENT:', process.env.DATABASE_CLIENT);
  console.log('  process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('  process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('  env("DATABASE_CLIENT"):', env('DATABASE_CLIENT', 'NOT_SET'));

  // CRITICAL FIX: Railway env vars not being read by Strapi's env() function
  // TEMPORARY: Hardcode postgres for production to test
  const client = process.env.NODE_ENV === 'production' ? 'postgres' : (process.env.DATABASE_CLIENT || env('DATABASE_CLIENT', 'sqlite'));
  console.log('  FINAL CLIENT:', client);

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        // TEMPORARY: Hardcode for Railway production
        connectionString: process.env.NODE_ENV === 'production'
          ? 'postgresql://postgres:XfVRLiChCkBGaRTdftyYCXIJfWBDHKAr@yamabiko.proxy.rlwy.net:55170/railway'
          : (process.env.DATABASE_URL || env('DATABASE_URL')),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : (env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        }),
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
