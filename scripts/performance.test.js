const axios = require('axios');

/**
 * Performance Testing Suite for AstroQuiz API
 * Tests response times, throughput, and scalability
 */

class PerformanceTester {
  constructor(baseURL = global.API_BASE_URL, apiPath = global.API_PATH) {
    this.baseURL = baseURL;
    this.apiPath = apiPath;
    this.client = axios.create({
      baseURL: `${baseURL}${apiPath}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.results = [];
  }

  async measureRequest(name, requestFn, warmupRuns = 1) {
    // Warmup runs to avoid cold start bias
    for (let i = 0; i < warmupRuns; i++) {
      try {
        await requestFn();
      } catch (error) {
        // Ignore warmup errors
      }
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await requestFn();
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      const measurement = {
        name,
        duration,
        memoryDelta,
        success: true,
        timestamp: new Date().toISOString(),
        responseSize: JSON.stringify(result.data).length
      };
      
      this.results.push(measurement);
      return measurement;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      const measurement = {
        name,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(measurement);
      throw error;
    }
  }

  async runConcurrentRequests(name, requestFn, concurrency = 5, totalRequests = 25) {
    const results = [];
    const startTime = Date.now();
    
    // Create batches of concurrent requests
    const batchSize = concurrency;
    const batches = Math.ceil(totalRequests / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const requestsInBatch = Math.min(batchSize, totalRequests - (batch * batchSize));
      const promises = [];
      
      for (let i = 0; i < requestsInBatch; i++) {
        promises.push(
          this.measureRequest(`${name}_concurrent_${batch}_${i}`, requestFn, 0)
            .catch(error => ({ error: error.message, success: false }))
        );
      }
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }
    
    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.success).length;
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / successfulRequests;
    
    return {
      name,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      totalTime,
      avgResponseTime,
      requestsPerSecond: (successfulRequests / totalTime) * 1000,
      results
    };
  }

  generateReport() {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    if (successful.length === 0) {
      return {
        totalRequests: this.results.length,
        successfulRequests: 0,
        failedRequests: failed.length,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
    }
    
    const durations = successful.map(r => r.duration).sort((a, b) => a - b);
    const avgResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      minResponseTime: Math.round(durations[0] * 100) / 100,
      maxResponseTime: Math.round(durations[durations.length - 1] * 100) / 100,
      p95ResponseTime: Math.round(durations[p95Index] * 100) / 100,
      p99ResponseTime: Math.round(durations[p99Index] * 100) / 100,
      avgMemoryDelta: successful.reduce((sum, r) => sum + (r.memoryDelta || 0), 0) / successful.length,
      avgResponseSize: successful.reduce((sum, r) => sum + (r.responseSize || 0), 0) / successful.length
    };
  }
}

describe('⚡ AstroQuiz API Performance Tests', () => {
  let tester;
  let sampleQuestionId;

  beforeAll(async () => {
    tester = new PerformanceTester();
    
    // Get a sample question ID for testing
    try {
      const response = await tester.client.get('/questions', {
        params: { 'pagination[pageSize]': 1, locale: 'en' }
      });
      if (response.data.data.length > 0) {
        sampleQuestionId = response.data.data[0].documentId;
      }
    } catch (error) {
      console.warn('Could not fetch sample question ID for performance tests:', error.message);
    }
  });

  afterAll(() => {
    const report = tester.generateReport();
    console.log('\n📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${report.totalRequests}`);
    console.log(`Successful: ${report.successfulRequests}`);
    console.log(`Failed: ${report.failedRequests}`);
    console.log(`Average Response Time: ${report.avgResponseTime}ms`);
    console.log(`Min Response Time: ${report.minResponseTime}ms`);
    console.log(`Max Response Time: ${report.maxResponseTime}ms`);
    console.log(`95th Percentile: ${report.p95ResponseTime}ms`);
    console.log(`99th Percentile: ${report.p99ResponseTime}ms`);
    console.log(`Average Memory Delta: ${Math.round(report.avgMemoryDelta / 1024)}KB`);
    console.log(`Average Response Size: ${Math.round(report.avgResponseSize / 1024)}KB`);
    console.log('='.repeat(50));
  });

  describe('🚀 Basic Response Time Tests', () => {
    test('GET /questions should respond within acceptable time', async () => {
      const measurement = await tester.measureRequest(
        'get_questions_basic',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 10, locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(1000); // Should be under 1 second
    });

    test('GET /questions/:id should respond quickly', async () => {
      if (!sampleQuestionId) {
        console.warn('Skipping single question performance test - no sample ID');
        return;
      }

      const measurement = await tester.measureRequest(
        'get_single_question',
        () => tester.client.get(`/questions/${sampleQuestionId}`, {
          params: { locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(500); // Should be under 500ms
    });

    test('Filtered queries should perform reasonably', async () => {
      const measurement = await tester.measureRequest(
        'filtered_query',
        () => tester.client.get('/questions', {
          params: {
            'filters[level][$eq]': 3,
            'pagination[pageSize]': 20,
            locale: 'en'
          }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(1500); // Should be under 1.5 seconds
    });

    test('Complex queries should complete within reasonable time', async () => {
      const measurement = await tester.measureRequest(
        'complex_query',
        () => tester.client.get('/questions', {
          params: {
            'filters[level][$gte]': 2,
            'filters[level][$lte]': 4,
            'filters[question][$containsi]': 'what',
            sort: 'level:asc',
            'pagination[pageSize]': 50,
            locale: 'en'
          }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(2000); // Should be under 2 seconds
    });
  });

  describe('📈 Pagination Performance', () => {
    test('Small page sizes should be fast', async () => {
      const measurement = await tester.measureRequest(
        'small_page',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 5, locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(300);
    });

    test('Medium page sizes should be reasonable', async () => {
      const measurement = await tester.measureRequest(
        'medium_page',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 50, locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(1000);
    });

    test('Large page sizes should still be acceptable', async () => {
      const measurement = await tester.measureRequest(
        'large_page',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 100, locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(2000);
    });

    test('Deep pagination should not degrade significantly', async () => {
      const measurements = [];
      
      // Test first page
      measurements.push(await tester.measureRequest(
        'pagination_page_1',
        () => tester.client.get('/questions', {
          params: { 'pagination[page]': 1, 'pagination[pageSize]': 10, locale: 'en' }
        })
      ));

      // Test middle page
      measurements.push(await tester.measureRequest(
        'pagination_page_5',
        () => tester.client.get('/questions', {
          params: { 'pagination[page]': 5, 'pagination[pageSize]': 10, locale: 'en' }
        })
      ));

      // Test later page
      measurements.push(await tester.measureRequest(
        'pagination_page_10',
        () => tester.client.get('/questions', {
          params: { 'pagination[page]': 10, 'pagination[pageSize]': 10, locale: 'en' }
        })
      ));

      // All should be successful
      measurements.forEach(m => expect(m.success).toBe(true));
      
      // Later pages shouldn't be more than 2x slower than first page
      const firstPageTime = measurements[0].duration;
      const lastPageTime = measurements[2].duration;
      expect(lastPageTime).toBeLessThan(firstPageTime * 2);
    });
  });

  describe('🌍 Localization Performance', () => {
    test.each(['en', 'pt', 'es', 'fr'])('Locale %s should perform consistently', async (locale) => {
      const measurement = await tester.measureRequest(
        `locale_${locale}`,
        () => tester.client.get('/questions', {
          params: { locale, 'pagination[pageSize]': 10 }
        })
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeLessThan(1000);
    });

    test('Cross-locale queries should not be significantly slower', async () => {
      const measurements = [];
      
      for (const locale of ['en', 'pt', 'es', 'fr']) {
        measurements.push(await tester.measureRequest(
          `cross_locale_${locale}`,
          () => tester.client.get('/questions', {
            params: { locale, 'pagination[pageSize]': 5 }
          })
        ));
      }

      const avgTime = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
      const maxTime = Math.max(...measurements.map(m => m.duration));
      
      // Max time shouldn't be more than 50% above average
      expect(maxTime).toBeLessThan(avgTime * 1.5);
    });
  });

  describe('🔥 Load Testing', () => {
    test('Should handle moderate concurrent load', async () => {
      const loadTest = await tester.runConcurrentRequests(
        'moderate_load',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 10, locale: 'en' }
        }),
        5, // 5 concurrent requests
        25  // 25 total requests
      );

      expect(loadTest.successfulRequests).toBeGreaterThanOrEqual(20); // At least 80% success
      expect(loadTest.avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(loadTest.requestsPerSecond).toBeGreaterThan(2); // At least 2 RPS
    }, 60000); // 60 second timeout

    test('Should handle single question concurrent requests', async () => {
      if (!sampleQuestionId) {
        console.warn('Skipping concurrent single question test - no sample ID');
        return;
      }

      const loadTest = await tester.runConcurrentRequests(
        'single_question_load',
        () => tester.client.get(`/questions/${sampleQuestionId}`, {
          params: { locale: 'en' }
        }),
        10, // 10 concurrent requests
        30  // 30 total requests
      );

      expect(loadTest.successfulRequests).toBeGreaterThanOrEqual(25); // At least 83% success
      expect(loadTest.avgResponseTime).toBeLessThan(1000); // Average under 1 second
    }, 45000);

    test('Should handle mixed query patterns under load', async () => {
      const queries = [
        () => tester.client.get('/questions', { params: { 'pagination[pageSize]': 10, locale: 'en' } }),
        () => tester.client.get('/questions', { params: { 'filters[level][$eq]': 3, locale: 'en' } }),
        () => tester.client.get('/questions', { params: { 'filters[level][$gte]': 2, locale: 'pt' } }),
        () => tester.client.get('/questions', { params: { sort: 'level:asc', 'pagination[pageSize]': 5, locale: 'es' } })
      ];

      const results = [];
      for (let i = 0; i < 20; i++) {
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        try {
          const measurement = await tester.measureRequest(`mixed_query_${i}`, randomQuery, 0);
          results.push(measurement);
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      const successfulResults = results.filter(r => r.success);
      const successRate = successfulResults.length / results.length;
      
      expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
      
      if (successfulResults.length > 0) {
        const avgTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
        expect(avgTime).toBeLessThan(1500); // Average under 1.5 seconds
      }
    }, 45000);
  });

  describe('💾 Memory and Resource Usage', () => {
    test('Memory usage should be reasonable for large responses', async () => {
      const measurement = await tester.measureRequest(
        'large_response_memory',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 100, locale: 'en' }
        })
      );

      expect(measurement.success).toBe(true);
      
      // Memory delta should be reasonable (less than 10MB for 100 questions)
      if (measurement.memoryDelta) {
        expect(measurement.memoryDelta).toBeLessThan(10 * 1024 * 1024);
      }
    });

    test('Response sizes should be proportional to page size', async () => {
      const smallResponse = await tester.measureRequest(
        'small_response_size',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 5, locale: 'en' }
        })
      );

      const largeResponse = await tester.measureRequest(
        'large_response_size',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 50, locale: 'en' }
        })
      );

      expect(smallResponse.success).toBe(true);
      expect(largeResponse.success).toBe(true);
      
      // Large response should be roughly 10x the size of small response
      const sizeRatio = largeResponse.responseSize / smallResponse.responseSize;
      expect(sizeRatio).toBeGreaterThan(5); // At least 5x larger
      expect(sizeRatio).toBeLessThan(15); // But not more than 15x (accounting for overhead)
    });
  });

  describe('🔍 Query Optimization', () => {
    test('Simple queries should be faster than complex ones', async () => {
      const simpleQuery = await tester.measureRequest(
        'simple_query_optimization',
        () => tester.client.get('/questions', {
          params: { 'pagination[pageSize]': 10, locale: 'en' }
        })
      );

      const complexQuery = await tester.measureRequest(
        'complex_query_optimization',
        () => tester.client.get('/questions', {
          params: {
            'filters[level][$gte]': 1,
            'filters[level][$lte]': 5,
            'filters[question][$containsi]': 'the',
            sort: 'level:desc,id:asc',
            'pagination[pageSize]': 10,
            locale: 'en'
          }
        })
      );

      expect(simpleQuery.success).toBe(true);
      expect(complexQuery.success).toBe(true);
      
      // Complex query should not be more than 3x slower
      expect(complexQuery.duration).toBeLessThan(simpleQuery.duration * 3);
    });

    test('Indexed fields should perform better', async () => {
      // Test query on level (should be indexed)
      const levelQuery = await tester.measureRequest(
        'level_query_performance',
        () => tester.client.get('/questions', {
          params: { 'filters[level][$eq]': 3, 'pagination[pageSize]': 20, locale: 'en' }
        })
      );

      // Test text search (potentially slower)
      const textQuery = await tester.measureRequest(
        'text_query_performance',
        () => tester.client.get('/questions', {
          params: { 'filters[question][$containsi]': 'galaxy', 'pagination[pageSize]': 20, locale: 'en' }
        })
      );

      expect(levelQuery.success).toBe(true);
      expect(textQuery.success).toBe(true);
      
      // Level query should generally be faster (though not always guaranteed)
      console.log(`Level query: ${levelQuery.duration}ms, Text query: ${textQuery.duration}ms`);
    });
  });

  describe('🚨 Stress Testing', () => {
    test('Should gracefully handle rapid sequential requests', async () => {
      const rapidRequests = [];
      const startTime = Date.now();
      
      // Fire 10 requests as quickly as possible
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          tester.measureRequest(
            `rapid_request_${i}`,
            () => tester.client.get('/questions', {
              params: { 'pagination[pageSize]': 5, locale: 'en' }
            }),
            0 // No warmup
          ).catch(error => ({ success: false, error: error.message }))
        );
      }
      
      const results = await Promise.all(rapidRequests);
      const totalTime = Date.now() - startTime;
      const successfulResults = results.filter(r => r.success);
      
      expect(successfulResults.length).toBeGreaterThanOrEqual(7); // At least 70% success
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Rapid requests: ${successfulResults.length}/10 successful in ${totalTime}ms`);
    }, 15000);
  });
});
