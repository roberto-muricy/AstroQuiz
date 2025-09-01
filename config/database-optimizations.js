/**
 * 🗄️ Database Optimization Configuration
 * PostgreSQL optimizations for Railway deployment
 */

'use strict';

module.exports = {
  // Connection pool configuration for Railway PostgreSQL
  connectionPool: {
    // Railway-optimized pool settings
    min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
    max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
    
    // Connection timeouts
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    
    // Pool maintenance
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    
    // Railway-specific optimizations
    propagateCreateError: false,
    
    // Connection validation
    afterCreate: function (conn, done) {
      // Optimize connection for performance
      conn.query('SET timezone="UTC"', function (err) {
        if (err) {
          done(err, conn);
        } else {
          conn.query('SET statement_timeout = 30000', function (err) {
            done(err, conn);
          });
        }
      });
    }
  },

  // Query optimization settings
  queryOptimizations: {
    // Enable query logging for slow queries
    logSlowQueries: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 1000, // 1 second
    
    // Query timeout settings
    statementTimeout: 30000, // 30 seconds
    queryTimeout: 25000, // 25 seconds
    
    // Connection settings
    applicationName: 'AstroQuiz-CMS',
    
    // Performance settings
    defaultRowMode: 'array', // Faster for large result sets
    parseInputDatesAsUTC: true,
    
    // Memory optimizations
    maxMemoryUsage: '256MB',
    workMem: '16MB',
    maintenanceWorkMem: '64MB'
  },

  // Strategic indexes for question queries
  strategicIndexes: [
    // Primary performance indexes
    {
      table: 'questions',
      name: 'idx_questions_locale_level',
      columns: ['locale', 'level'],
      type: 'btree',
      description: 'Optimize filtering by locale and difficulty level'
    },
    {
      table: 'questions',
      name: 'idx_questions_topic_locale',
      columns: ['topic', 'locale'],
      type: 'btree',
      description: 'Optimize topic-based queries per language'
    },
    {
      table: 'questions',
      name: 'idx_questions_level_topic',
      columns: ['level', 'topic'],
      type: 'btree',
      description: 'Optimize difficulty and topic combinations'
    },
    {
      table: 'questions',
      name: 'idx_questions_base_id',
      columns: ['baseId'],
      type: 'btree',
      description: 'Fast lookup for question translations'
    },
    {
      table: 'questions',
      name: 'idx_questions_published_at',
      columns: ['publishedAt'],
      type: 'btree',
      description: 'Optimize queries by publication date'
    },
    
    // Composite indexes for complex queries
    {
      table: 'questions',
      name: 'idx_questions_quiz_selection',
      columns: ['locale', 'level', 'topic', 'publishedAt'],
      type: 'btree',
      description: 'Optimize quiz question selection queries'
    },
    
    // Full-text search indexes
    {
      table: 'questions',
      name: 'idx_questions_question_text',
      columns: ['question'],
      type: 'gin',
      expression: 'to_tsvector(\'english\', question)',
      description: 'Full-text search on question content'
    }
  ],

  // Query patterns optimization
  commonQueryOptimizations: {
    // Frequently used WHERE clauses
    frequentFilters: [
      'locale = ?',
      'level = ?',
      'topic = ?',
      'locale = ? AND level = ?',
      'locale = ? AND topic = ?',
      'level = ? AND topic = ?',
      'locale = ? AND level = ? AND topic = ?'
    ],
    
    // Recommended LIMIT values for pagination
    recommendedLimits: [5, 10, 25, 50, 100],
    maxLimit: 100,
    
    // Order by optimizations
    commonOrderBy: [
      'publishedAt DESC',
      'level ASC',
      'topic ASC',
      'createdAt DESC'
    ]
  },

  // Performance monitoring queries
  monitoringQueries: {
    // Check index usage
    indexUsage: `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE tablename = 'questions'
      ORDER BY n_distinct DESC;
    `,
    
    // Find slow queries
    slowQueries: `
      SELECT 
        query,
        mean_time,
        calls,
        total_time,
        min_time,
        max_time
      FROM pg_stat_statements 
      WHERE query LIKE '%questions%'
      ORDER BY mean_time DESC 
      LIMIT 10;
    `,
    
    // Connection pool status
    connectionStats: `
      SELECT 
        state,
        COUNT(*) as count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state;
    `,
    
    // Table size and bloat
    tableStats: `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_stat_get_tuples_returned(c.oid) as tuples_returned,
        pg_stat_get_tuples_fetched(c.oid) as tuples_fetched
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `
  },

  // Cache configuration for query results
  queryCache: {
    enabled: true,
    ttl: {
      questions: {
        byLocale: 300, // 5 minutes
        byTopic: 600, // 10 minutes
        byLevel: 300, // 5 minutes
        single: 3600, // 1 hour
        search: 180 // 3 minutes
      }
    },
    maxSize: 100, // Maximum cached queries
    keyPrefix: 'astroquiz:query:'
  },

  // Railway-specific optimizations
  railwayOptimizations: {
    // Connection string optimizations
    connectionOptions: {
      ssl: {
        rejectUnauthorized: false
      },
      
      // Performance settings
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      
      // Railway proxy optimizations
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      
      // Query optimizations
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 60000
    },
    
    // Memory management for Railway limits
    memoryOptimizations: {
      maxConnections: 10,
      sharedPreloadLibraries: [],
      effectiveCacheSize: '128MB',
      randomPageCost: 1.1 // SSD optimization
    }
  },

  // Backup and maintenance
  maintenanceSchedule: {
    // Automatic VACUUM and ANALYZE
    autoVacuum: {
      enabled: true,
      vacuumThreshold: 50,
      analyzeThreshold: 50,
      vacuumScaleFactor: 0.2,
      analyzeScaleFactor: 0.1
    },
    
    // Statistics update
    statisticsTarget: 100,
    
    // Maintenance queries to run periodically
    maintenanceQueries: [
      'VACUUM ANALYZE questions;',
      'REINDEX TABLE questions;',
      'UPDATE pg_stat_statements_reset();'
    ]
  }
};
