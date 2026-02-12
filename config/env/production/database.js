/**
 * Production Database Configuration
 * Using PostgreSQL via DATABASE_URL environment variable
 */

module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: env('DATABASE_URL'),
      ssl: env.bool('DATABASE_SSL', true) ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 2, max: 10 },
  },
});
