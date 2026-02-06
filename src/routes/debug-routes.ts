/**
 * Debug Routes
 * Endpoints for debugging configuration issues
 */

export function createDebugRoutes(strapi: any): any[] {
  return [
    // Check upload/Cloudinary configuration
    {
      method: 'GET',
      path: '/api/debug/upload-config',
      handler: async (ctx: any) => {
        try {
          const uploadConfig = strapi.config.get('plugin.upload') || {};

          // List all env vars containing CLOUD
          const cloudVars = Object.keys(process.env)
            .filter(k => k.toUpperCase().includes('CLOUD'))
            .map(k => `${k}=${process.env[k]?.substring(0, 8)}...`);

          ctx.body = {
            success: true,
            data: {
              provider: uploadConfig.config?.provider || 'local (default)',
              hasCloudinaryName: !!process.env.CLOUDINARY_NAME,
              hasCloudinaryKey: !!process.env.CLOUDINARY_KEY,
              hasCloudinarySecret: !!process.env.CLOUDINARY_SECRET,
              cloudinaryName: process.env.CLOUDINARY_NAME || 'not set',
              nodeEnv: process.env.NODE_ENV,
              // Show all CLOUD* vars found
              cloudVarsFound: cloudVars,
              // Show total env var count
              totalEnvVars: Object.keys(process.env).length,
              // Check if Railway vars exist
              hasRailwayEnv: !!process.env.RAILWAY_ENVIRONMENT,
              railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'not set',
            },
          };
        } catch (error: any) {
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/api/debug/db-config',
      handler: async (ctx: any) => {
        try {
          const dbConfig = strapi.config.get('database');
          const connection = dbConfig?.connection || {};

          // Get actual database client being used
          const knex = strapi.db.connection;
          const clientName = knex?.client?.constructor?.name || 'unknown';

          // Test query to verify connection
          let testQuery;
          try {
            testQuery = await knex.raw('SELECT 1 as test');
          } catch (err: any) {
            testQuery = { error: err.message };
          }

          // Count questions in current database
          let questionCount;
          try {
            const result = await knex('questions').count('* as count');
            questionCount = result[0]?.count || 0;
          } catch (err: any) {
            questionCount = { error: err.message };
          }

          ctx.body = {
            success: true,
            data: {
              // Environment variables
              env: {
                DATABASE_CLIENT: process.env.DATABASE_CLIENT,
                DATABASE_URL_SET: !!process.env.DATABASE_URL,
                DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) || 'not set',
                NODE_ENV: process.env.NODE_ENV,
              },
              // Strapi config
              config: {
                client: connection.client,
                clientName: clientName,
                hasConnectionString: !!connection.connectionString,
                connectionString: connection.connectionString?.substring(0, 30) || 'not set',
              },
              // Database test
              test: {
                queryResult: testQuery,
                questionCount: questionCount,
              },
            },
          };
        } catch (error: any) {
          strapi.log.error('GET /api/debug/db-config error:', error);
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },
  ];
}
