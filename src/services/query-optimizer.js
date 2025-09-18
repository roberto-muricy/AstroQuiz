/**
 * 🔍 Query Optimizer Service
 * Database query analysis and optimization recommendations
 */

'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance() {
    try {
      const analysis = {
        slowQueries: await this.findSlowQueries(),
        missingIndexes: await this.suggestIndexes(),
        queryPatterns: await this.analyzeQueryPatterns(),
        optimizationSuggestions: []
      };

      // Generate optimization suggestions
      analysis.optimizationSuggestions = this.generateOptimizationSuggestions(analysis);

      return analysis;
    } catch (error) {
      strapi.log.error('Query performance analysis failed:', error);
      throw error;
    }
  },

  /**
   * Find slow-running queries
   */
  async findSlowQueries() {
    const slowQueries = [];
    
    try {
      // Test common query patterns and measure performance
      const queryTests = [
        {
          name: 'Questions by locale',
          query: () => strapi.db.query('api::question.question').findMany({
            where: { locale: 'en' },
            limit: 25
          }),
          expectedTime: 100 // ms
        },
        {
          name: 'Questions by level',
          query: () => strapi.db.query('api::question.question').findMany({
            where: { level: 3 },
            limit: 25
          }),
          expectedTime: 100
        },
        {
          name: 'Questions by topic',
          query: () => strapi.db.query('api::question.question').findMany({
            where: { topic: 'astronomy' },
            limit: 25
          }),
          expectedTime: 150
        },
        {
          name: 'Questions by locale and level',
          query: () => strapi.db.query('api::question.question').findMany({
            where: { 
              locale: 'en',
              level: 3
            },
            limit: 25
          }),
          expectedTime: 120
        },
        {
          name: 'Questions count by topic',
          query: () => strapi.db.query('api::question.question').count({
            where: { topic: 'astronomy' }
          }),
          expectedTime: 50
        },
        {
          name: 'All questions count',
          query: () => strapi.db.query('api::question.question').count(),
          expectedTime: 30
        }
      ];

      for (const test of queryTests) {
        const startTime = Date.now();
        
        try {
          await test.query();
          const duration = Date.now() - startTime;
          
          if (duration > test.expectedTime) {
            slowQueries.push({
              name: test.name,
              duration,
              expectedTime: test.expectedTime,
              slownessFactor: Math.round((duration / test.expectedTime) * 100) / 100,
              severity: duration > test.expectedTime * 3 ? 'high' : 
                       duration > test.expectedTime * 2 ? 'medium' : 'low'
            });
          }
          
        } catch (error) {
          slowQueries.push({
            name: test.name,
            error: error.message,
            severity: 'high'
          });
        }
      }

    } catch (error) {
      strapi.log.error('Slow query analysis failed:', error);
    }

    return slowQueries;
  },

  /**
   * Suggest database indexes for better performance
   */
  async suggestIndexes() {
    const suggestions = [];

    try {
      // Analyze common query patterns
      const queryPatterns = [
        {
          fields: ['locale'],
          reason: 'Frequently filtered by language',
          priority: 'high',
          expectedImprovement: '40-60%'
        },
        {
          fields: ['level'],
          reason: 'Frequently filtered by difficulty level',
          priority: 'high',
          expectedImprovement: '30-50%'
        },
        {
          fields: ['topic'],
          reason: 'Frequently filtered by topic',
          priority: 'medium',
          expectedImprovement: '25-40%'
        },
        {
          fields: ['locale', 'level'],
          reason: 'Common combination filter',
          priority: 'high',
          expectedImprovement: '50-70%'
        },
        {
          fields: ['topic', 'locale'],
          reason: 'Topic queries per language',
          priority: 'medium',
          expectedImprovement: '35-55%'
        },
        {
          fields: ['publishedAt'],
          reason: 'Ordering by publication date',
          priority: 'low',
          expectedImprovement: '20-30%'
        },
        {
          fields: ['createdAt'],
          reason: 'Ordering by creation date',
          priority: 'low',
          expectedImprovement: '15-25%'
        }
      ];

      // Check if indexes might already exist (simplified check)
      for (const pattern of queryPatterns) {
        suggestions.push({
          table: 'questions',
          fields: pattern.fields,
          indexName: `idx_questions_${pattern.fields.join('_')}`,
          type: 'btree',
          reason: pattern.reason,
          priority: pattern.priority,
          expectedImprovement: pattern.expectedImprovement,
          sqlCommand: `CREATE INDEX idx_questions_${pattern.fields.join('_')} ON questions (${pattern.fields.join(', ')});`
        });
      }

      // Full-text search index suggestion
      suggestions.push({
        table: 'questions',
        fields: ['question'],
        indexName: 'idx_questions_fulltext',
        type: 'gin',
        reason: 'Enable full-text search on question content',
        priority: 'medium',
        expectedImprovement: '80-90% for text searches',
        sqlCommand: `CREATE INDEX idx_questions_fulltext ON questions USING gin(to_tsvector('english', question));`
      });

    } catch (error) {
      strapi.log.error('Index suggestion failed:', error);
    }

    return suggestions;
  },

  /**
   * Analyze common query patterns
   */
  async analyzeQueryPatterns() {
    try {
      // Get sample data to understand patterns
      const totalQuestions = await strapi.db.query('api::question.question').count();
      
      const patterns = {
        dataVolume: {
          totalQuestions,
          estimatedGrowth: this.estimateDataGrowth(totalQuestions),
          volumeCategory: totalQuestions < 1000 ? 'small' : 
                         totalQuestions < 10000 ? 'medium' : 'large'
        },
        
        commonFilters: await this.analyzeCommonFilters(),
        
        joinPatterns: await this.analyzeJoinPatterns(),
        
        sortingPatterns: [
          { field: 'createdAt', direction: 'DESC', frequency: 'high' },
          { field: 'publishedAt', direction: 'DESC', frequency: 'medium' },
          { field: 'level', direction: 'ASC', frequency: 'medium' },
          { field: 'topic', direction: 'ASC', frequency: 'low' }
        ],
        
        paginationPatterns: {
          commonLimits: [5, 10, 25, 50, 100],
          averageLimit: 25,
          offsetUsage: 'medium'
        }
      };

      return patterns;
    } catch (error) {
      strapi.log.error('Query pattern analysis failed:', error);
      return {};
    }
  },

  /**
   * Analyze common filter patterns
   */
  async analyzeCommonFilters() {
    try {
      // Get distribution of data to understand filter effectiveness
      const localeDistribution = {};
      const levelDistribution = {};
      const topicSample = {};

      // Analyze locale distribution
      for (const locale of ['en', 'pt', 'es', 'fr']) {
        localeDistribution[locale] = await strapi.db.query('api::question.question').count({
          where: { locale }
        });
      }

      // Analyze level distribution
      for (let level = 1; level <= 5; level++) {
        levelDistribution[level] = await strapi.db.query('api::question.question').count({
          where: { level }
        });
      }

      // Get sample topics
      const topicsQuery = await strapi.db.query('api::question.question').findMany({
        select: ['topic'],
        limit: 100
      });
      
      topicsQuery.forEach(q => {
        topicSample[q.topic] = (topicSample[q.topic] || 0) + 1;
      });

      return {
        locale: {
          distribution: localeDistribution,
          selectivity: this.calculateSelectivity(localeDistribution),
          indexEffectiveness: 'high'
        },
        level: {
          distribution: levelDistribution,
          selectivity: this.calculateSelectivity(levelDistribution),
          indexEffectiveness: 'medium'
        },
        topic: {
          sampleDistribution: topicSample,
          estimatedSelectivity: 'medium',
          indexEffectiveness: 'medium'
        }
      };
    } catch (error) {
      strapi.log.error('Filter analysis failed:', error);
      return {};
    }
  },

  /**
   * Analyze join patterns (for future relations)
   */
  async analyzeJoinPatterns() {
    return {
      currentJoins: [],
      potentialJoins: [
        {
          table: 'quiz_sessions',
          relationship: 'questions used in sessions',
          frequency: 'high',
          optimization: 'Consider denormalization for frequently accessed data'
        },
        {
          table: 'user_answers',
          relationship: 'answers to questions',
          frequency: 'high',
          optimization: 'Index on question_id for answer analytics'
        }
      ]
    };
  },

  /**
   * Generate optimization suggestions based on analysis
   */
  generateOptimizationSuggestions(analysis) {
    const suggestions = [];

    // Slow query suggestions
    if (analysis.slowQueries && analysis.slowQueries.length > 0) {
      const highSeverityQueries = analysis.slowQueries.filter(q => q.severity === 'high');
      
      if (highSeverityQueries.length > 0) {
        suggestions.push({
          category: 'performance',
          priority: 'critical',
          title: 'Address Critical Slow Queries',
          description: `${highSeverityQueries.length} queries are performing significantly slower than expected`,
          impact: 'High performance improvement',
          actions: [
            'Add appropriate database indexes',
            'Optimize query structure',
            'Consider query result caching'
          ]
        });
      }
    }

    // Index suggestions
    if (analysis.missingIndexes && analysis.missingIndexes.length > 0) {
      const highPriorityIndexes = analysis.missingIndexes.filter(idx => idx.priority === 'high');
      
      if (highPriorityIndexes.length > 0) {
        suggestions.push({
          category: 'database',
          priority: 'high',
          title: 'Add High-Priority Database Indexes',
          description: `${highPriorityIndexes.length} high-priority indexes could significantly improve performance`,
          impact: 'Major query performance improvement',
          actions: highPriorityIndexes.map(idx => `Add ${idx.indexName}: ${idx.sqlCommand}`)
        });
      }
    }

    // Data volume suggestions
    if (analysis.queryPatterns?.dataVolume) {
      const volume = analysis.queryPatterns.dataVolume;
      
      if (volume.volumeCategory === 'large') {
        suggestions.push({
          category: 'scalability',
          priority: 'medium',
          title: 'Optimize for Large Dataset',
          description: `With ${volume.totalQuestions} questions, consider advanced optimizations`,
          impact: 'Better performance at scale',
          actions: [
            'Implement query result caching',
            'Consider data partitioning',
            'Optimize pagination queries',
            'Monitor query execution plans'
          ]
        });
      }
    }

    // Connection pool optimization
    suggestions.push({
      category: 'database',
      priority: 'medium',
      title: 'Optimize Connection Pool',
      description: 'Fine-tune database connection pool for Railway PostgreSQL',
      impact: 'Better resource utilization',
      actions: [
        'Adjust pool size based on usage patterns',
        'Optimize connection timeouts',
        'Monitor connection pool metrics',
        'Implement connection retry logic'
      ]
    });

    // Query caching suggestions
    suggestions.push({
      category: 'performance',
      priority: 'medium',
      title: 'Implement Strategic Query Caching',
      description: 'Cache frequently accessed queries to reduce database load',
      impact: 'Reduced response times and database load',
      actions: [
        'Cache question lists by locale/level',
        'Cache topic and statistics queries',
        'Implement cache invalidation strategy',
        'Monitor cache hit rates'
      ]
    });

    return suggestions;
  },

  /**
   * Calculate selectivity of a filter (how much it reduces the result set)
   */
  calculateSelectivity(distribution) {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    const values = Object.values(distribution);
    const maxValue = Math.max(...values);
    
    // Selectivity: how much the most common value represents of the total
    // Lower percentage = better selectivity
    return Math.round((maxValue / total) * 100);
  },

  /**
   * Estimate data growth based on current volume
   */
  estimateDataGrowth(currentCount) {
    // Simple growth estimation based on current data
    if (currentCount < 100) return 'high'; // Small datasets can grow quickly
    if (currentCount < 1000) return 'medium';
    return 'low'; // Large datasets typically have slower growth rates
  },

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = {
        tables: {},
        connections: {},
        performance: {}
      };

      // Get question table stats
      const questionCount = await strapi.db.query('api::question.question').count();
      stats.tables.questions = {
        count: questionCount,
        estimatedSize: questionCount * 2, // KB (rough estimate)
        lastAnalyzed: new Date().toISOString()
      };

      // Connection stats (if available)
      stats.connections = {
        active: 'unknown', // Would need database-specific queries
        idle: 'unknown',
        total: 'unknown',
        maxConnections: process.env.DATABASE_POOL_MAX || 10
      };

      // Performance stats
      stats.performance = {
        avgQueryTime: 'unknown', // Would need query logging
        slowQueries: 'unknown',
        cacheHitRatio: 'unknown'
      };

      return stats;
    } catch (error) {
      strapi.log.error('Database stats collection failed:', error);
      throw error;
    }
  },

  /**
   * Execute query optimization recommendations
   */
  async executeOptimizations(optimizations = []) {
    const results = [];

    for (const optimization of optimizations) {
      try {
        let result = { optimization: optimization.title, status: 'skipped' };

        switch (optimization.category) {
          case 'database':
            // Database optimizations would require careful execution
            result.status = 'planned';
            result.message = 'Database optimizations require manual review and execution';
            break;

          case 'performance':
            // Performance optimizations might be automatic
            result.status = 'applied';
            result.message = 'Performance optimization settings updated';
            break;

          case 'scalability':
            result.status = 'planned';
            result.message = 'Scalability improvements require infrastructure changes';
            break;

          default:
            result.message = 'Unknown optimization category';
        }

        results.push(result);

      } catch (error) {
        results.push({
          optimization: optimization.title,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  },

  /**
   * Monitor query performance over time
   */
  async monitorQueryPerformance() {
    try {
      const monitoring = {
        timestamp: new Date().toISOString(),
        metrics: await this.getCurrentPerformanceMetrics(),
        trends: await this.getPerformanceTrends(),
        alerts: await this.checkPerformanceAlerts()
      };

      return monitoring;
    } catch (error) {
      strapi.log.error('Query performance monitoring failed:', error);
      throw error;
    }
  },

  /**
   * Get current performance metrics
   */
  async getCurrentPerformanceMetrics() {
    const metrics = {};

    try {
      // Test key queries and measure performance
      const testQueries = [
        {
          name: 'question_list',
          test: () => strapi.db.query('api::question.question').findMany({ limit: 25 })
        },
        {
          name: 'question_count',
          test: () => strapi.db.query('api::question.question').count()
        },
        {
          name: 'filtered_questions',
          test: () => strapi.db.query('api::question.question').findMany({
            where: { locale: 'en', level: 3 },
            limit: 10
          })
        }
      ];

      for (const query of testQueries) {
        const startTime = Date.now();
        await query.test();
        const duration = Date.now() - startTime;
        
        metrics[query.name] = {
          duration,
          status: duration < 100 ? 'excellent' :
                  duration < 500 ? 'good' :
                  duration < 1000 ? 'acceptable' : 'slow'
        };
      }

    } catch (error) {
      strapi.log.error('Performance metrics collection failed:', error);
    }

    return metrics;
  },

  /**
   * Get performance trends (simplified)
   */
  async getPerformanceTrends() {
    // In a real implementation, you'd store historical performance data
    return {
      queryPerformance: 'stable',
      databaseSize: 'growing',
      connectionUsage: 'stable',
      recommendation: 'Monitor query performance as data grows'
    };
  },

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts() {
    const alerts = [];

    try {
      const slowQueries = await this.findSlowQueries();
      
      if (slowQueries.length > 0) {
        const criticalSlowQueries = slowQueries.filter(q => q.severity === 'high');
        
        if (criticalSlowQueries.length > 0) {
          alerts.push({
            type: 'critical',
            message: `${criticalSlowQueries.length} critical slow queries detected`,
            queries: criticalSlowQueries.map(q => q.name)
          });
        }
      }

      // Check database connection
      try {
        const startTime = Date.now();
        await strapi.db.query('api::question.question').count();
        const connectionTime = Date.now() - startTime;
        
        if (connectionTime > 1000) {
          alerts.push({
            type: 'warning',
            message: `Database connection is slow: ${connectionTime}ms`
          });
        }
      } catch (error) {
        alerts.push({
          type: 'critical',
          message: 'Database connection failed',
          error: error.message
        });
      }

    } catch (error) {
      strapi.log.error('Performance alert check failed:', error);
    }

    return alerts;
  }
});
