#!/usr/bin/env node

/**
 * 🔥 Load Testing Suite
 * Comprehensive load testing for AstroQuiz backend
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🔥 ${msg}${colors.reset}`),
  section: (msg) => console.log(`${colors.bold}${colors.cyan}\n📋 ${msg}${colors.reset}`)
};

class LoadTester {
  constructor(baseUrl = 'https://astroquiz-production.up.railway.app') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      tests: [],
      summary: {},
      recommendations: []
    };
    
    // Test configurations
    this.testSuites = {
      light: {
        name: 'Light Load Test',
        concurrency: 5,
        duration: 30000, // 30 seconds
        description: 'Basic load test with low concurrency'
      },
      moderate: {
        name: 'Moderate Load Test',
        concurrency: 20,
        duration: 60000, // 1 minute
        description: 'Medium load test for typical usage'
      },
      heavy: {
        name: 'Heavy Load Test',
        concurrency: 50,
        duration: 120000, // 2 minutes
        description: 'High load test for peak usage scenarios'
      },
      stress: {
        name: 'Stress Test',
        concurrency: 100,
        duration: 180000, // 3 minutes
        description: 'Stress test to find breaking points'
      }
    };
    
    // Test endpoints
    this.endpoints = [
      {
        name: 'Questions List',
        path: '/api/questions?pagination[limit]=25',
        weight: 0.4, // 40% of traffic
        critical: true
      },
      {
        name: 'Questions by Locale',
        path: '/api/questions?filters[locale][$eq]=en&pagination[limit]=10',
        weight: 0.25, // 25% of traffic
        critical: true
      },
      {
        name: 'Single Question',
        path: '/api/questions?pagination[limit]=1',
        weight: 0.15, // 15% of traffic
        critical: true
      },
      {
        name: 'Health Check',
        path: '/api/health',
        weight: 0.1, // 10% of traffic
        critical: false
      },
      {
        name: 'Analytics Performance',
        path: '/api/analytics/performance',
        weight: 0.1, // 10% of traffic
        critical: false
      }
    ];
  }

  async runLoadTests(suiteNames = ['light', 'moderate']) {
    log.header('Load Testing Suite Started');
    log.info(`Target: ${this.baseUrl}`);
    log.info(`Test Suites: ${suiteNames.join(', ')}`);
    
    try {
      // Run baseline test first
      await this.runBaselineTest();
      
      // Run each test suite
      for (const suiteName of suiteNames) {
        if (this.testSuites[suiteName]) {
          await this.runTestSuite(suiteName);
          
          // Cool down between tests
          if (suiteNames.indexOf(suiteName) < suiteNames.length - 1) {
            log.info('Cooling down for 30 seconds...');
            await this.sleep(30000);
          }
        } else {
          log.warning(`Unknown test suite: ${suiteName}`);
        }
      }
      
      // Generate summary and recommendations
      this.generateSummary();
      this.generateRecommendations();
      
      // Save results
      await this.saveResults();
      
      log.success('Load testing completed successfully!');
      return this.results;
      
    } catch (error) {
      log.error(`Load testing failed: ${error.message}`);
      throw error;
    }
  }

  async runBaselineTest() {
    log.section('Running Baseline Test');
    
    const baselineResults = [];
    
    for (const endpoint of this.endpoints) {
      try {
        const result = await this.measureSingleRequest(endpoint.path);
        baselineResults.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          ...result
        });
        
        log.info(`${endpoint.name}: ${result.responseTime}ms`);
        
      } catch (error) {
        log.warning(`Baseline test failed for ${endpoint.name}: ${error.message}`);
        baselineResults.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          success: false,
          error: error.message
        });
      }
      
      // Small delay between baseline requests
      await this.sleep(100);
    }
    
    this.results.baseline = {
      timestamp: new Date().toISOString(),
      results: baselineResults,
      summary: this.summarizeResults(baselineResults)
    };
    
    log.success('Baseline test completed');
  }

  async runTestSuite(suiteName) {
    const suite = this.testSuites[suiteName];
    log.section(`Running ${suite.name}`);
    log.info(`Concurrency: ${suite.concurrency} users`);
    log.info(`Duration: ${suite.duration / 1000} seconds`);
    
    const testResults = [];
    const startTime = Date.now();
    const endTime = startTime + suite.duration;
    
    // Track ongoing requests
    let activeRequests = 0;
    let completedRequests = 0;
    let totalRequests = 0;
    
    // Progress tracking
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / suite.duration) * 100, 100);
      process.stdout.write(`\r🔄 Progress: ${progress.toFixed(1)}% | Active: ${activeRequests} | Completed: ${completedRequests}`);
    }, 1000);
    
    try {
      // Maintain concurrency level
      while (Date.now() < endTime) {
        while (activeRequests < suite.concurrency && Date.now() < endTime) {
          // Select endpoint based on weight
          const endpoint = this.selectWeightedEndpoint();
          
          activeRequests++;
          totalRequests++;
          
          // Fire and forget request
          this.executeLoadTestRequest(endpoint, testResults)
            .finally(() => {
              activeRequests--;
              completedRequests++;
            });
        }
        
        // Small delay to prevent overwhelming
        await this.sleep(10);
      }
      
      // Wait for remaining requests to complete (with timeout)
      const cleanupStart = Date.now();
      while (activeRequests > 0 && (Date.now() - cleanupStart) < 30000) {
        await this.sleep(100);
      }
      
    } finally {
      clearInterval(progressInterval);
      process.stdout.write('\n');
    }
    
    // Calculate test results
    const testDuration = Date.now() - startTime;
    const testSummary = this.summarizeLoadTest(testResults, testDuration, suite);
    
    this.results.tests.push({
      suite: suiteName,
      config: suite,
      duration: testDuration,
      totalRequests: totalRequests,
      completedRequests: completedRequests,
      results: testResults,
      summary: testSummary
    });
    
    log.success(`${suite.name} completed: ${completedRequests}/${totalRequests} requests`);
    log.info(`Average response time: ${testSummary.avgResponseTime}ms`);
    log.info(`Success rate: ${testSummary.successRate}%`);
    log.info(`Requests per second: ${testSummary.rps}`);
  }

  selectWeightedEndpoint() {
    const random = Math.random();
    let weightSum = 0;
    
    for (const endpoint of this.endpoints) {
      weightSum += endpoint.weight;
      if (random <= weightSum) {
        return endpoint;
      }
    }
    
    // Fallback to first endpoint
    return this.endpoints[0];
  }

  async executeLoadTestRequest(endpoint, resultsArray) {
    try {
      const result = await this.measureSingleRequest(endpoint.path);
      
      resultsArray.push({
        timestamp: Date.now(),
        endpoint: endpoint.name,
        path: endpoint.path,
        critical: endpoint.critical,
        ...result
      });
      
    } catch (error) {
      resultsArray.push({
        timestamp: Date.now(),
        endpoint: endpoint.name,
        path: endpoint.path,
        critical: endpoint.critical,
        success: false,
        error: error.message,
        responseTime: 0
      });
    }
  }

  async measureSingleRequest(path) {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept 4xx as success for load testing
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: response.status < 400,
        responseTime,
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length,
        headers: response.headers
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.code || error.message,
        statusCode: error.response?.status || 0
      };
    }
  }

  summarizeResults(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const responseTimes = successful.map(r => r.responseTime);
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: results.length > 0 ? ((successful.length / results.length) * 100).toFixed(2) : 0,
      avgResponseTime: responseTimes.length > 0 ? 
        Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99)
    };
  }

  summarizeLoadTest(results, duration, suite) {
    const summary = this.summarizeResults(results);
    const durationSeconds = duration / 1000;
    
    // Calculate RPS
    summary.rps = (summary.successful / durationSeconds).toFixed(2);
    summary.totalRPS = (summary.total / durationSeconds).toFixed(2);
    
    // Calculate error distribution
    const errors = results.filter(r => !r.success);
    summary.errorDistribution = this.analyzeErrors(errors);
    
    // Calculate endpoint performance
    summary.endpointPerformance = this.analyzeEndpointPerformance(results);
    
    // Performance grade
    summary.grade = this.calculatePerformanceGrade(summary, suite);
    
    return summary;
  }

  analyzeErrors(errors) {
    const errorCounts = {};
    const errorsByEndpoint = {};
    
    errors.forEach(error => {
      const errorType = error.error || 'Unknown';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      
      if (!errorsByEndpoint[error.endpoint]) {
        errorsByEndpoint[error.endpoint] = {};
      }
      errorsByEndpoint[error.endpoint][errorType] = (errorsByEndpoint[error.endpoint][errorType] || 0) + 1;
    });
    
    return {
      byType: errorCounts,
      byEndpoint: errorsByEndpoint,
      totalErrors: errors.length
    };
  }

  analyzeEndpointPerformance(results) {
    const endpointStats = {};
    
    results.forEach(result => {
      if (!endpointStats[result.endpoint]) {
        endpointStats[result.endpoint] = {
          total: 0,
          successful: 0,
          failed: 0,
          responseTimes: [],
          critical: result.critical
        };
      }
      
      const stats = endpointStats[result.endpoint];
      stats.total++;
      
      if (result.success) {
        stats.successful++;
        stats.responseTimes.push(result.responseTime);
      } else {
        stats.failed++;
      }
    });
    
    // Calculate summary stats for each endpoint
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      const responseTimes = stats.responseTimes;
      
      stats.successRate = ((stats.successful / stats.total) * 100).toFixed(2);
      stats.avgResponseTime = responseTimes.length > 0 ?
        Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
      stats.p95ResponseTime = this.calculatePercentile(responseTimes, 95);
      stats.grade = this.gradeEndpointPerformance(stats);
    });
    
    return endpointStats;
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  calculatePerformanceGrade(summary, suite) {
    let score = 100;
    
    // Success rate impact (40% weight)
    if (summary.successRate < 95) score -= 40;
    else if (summary.successRate < 98) score -= 20;
    else if (summary.successRate < 99.5) score -= 10;
    
    // Response time impact (35% weight)
    if (summary.avgResponseTime > 2000) score -= 35;
    else if (summary.avgResponseTime > 1000) score -= 20;
    else if (summary.avgResponseTime > 500) score -= 10;
    
    // P95 response time impact (25% weight)
    if (summary.p95ResponseTime > 5000) score -= 25;
    else if (summary.p95ResponseTime > 3000) score -= 15;
    else if (summary.p95ResponseTime > 1500) score -= 8;
    
    const finalScore = Math.max(0, score);
    
    if (finalScore >= 90) return 'A';
    if (finalScore >= 80) return 'B';
    if (finalScore >= 70) return 'C';
    if (finalScore >= 60) return 'D';
    return 'F';
  }

  gradeEndpointPerformance(stats) {
    if (stats.successRate < 95) return 'F';
    if (stats.avgResponseTime > 2000) return 'F';
    if (stats.successRate >= 99 && stats.avgResponseTime < 500) return 'A';
    if (stats.successRate >= 98 && stats.avgResponseTime < 1000) return 'B';
    if (stats.successRate >= 97 && stats.avgResponseTime < 1500) return 'C';
    return 'D';
  }

  generateSummary() {
    const allTests = this.results.tests;
    
    if (allTests.length === 0) {
      this.results.summary = { error: 'No tests completed' };
      return;
    }
    
    // Overall performance metrics
    const overallStats = {
      totalRequests: allTests.reduce((sum, test) => sum + test.completedRequests, 0),
      avgSuccessRate: allTests.reduce((sum, test) => sum + parseFloat(test.summary.successRate), 0) / allTests.length,
      avgResponseTime: allTests.reduce((sum, test) => sum + test.summary.avgResponseTime, 0) / allTests.length,
      maxRPS: Math.max(...allTests.map(test => parseFloat(test.summary.rps))),
      bestGrade: allTests.map(test => test.summary.grade).sort()[0],
      worstGrade: allTests.map(test => test.summary.grade).sort().reverse()[0]
    };
    
    // Performance trends
    const trends = {
      responseTimeByLoad: allTests.map(test => ({
        concurrency: test.config.concurrency,
        avgResponseTime: test.summary.avgResponseTime,
        p95ResponseTime: test.summary.p95ResponseTime
      })),
      successRateByLoad: allTests.map(test => ({
        concurrency: test.config.concurrency,
        successRate: parseFloat(test.summary.successRate)
      })),
      rpsCapacity: allTests.map(test => ({
        concurrency: test.config.concurrency,
        rps: parseFloat(test.summary.rps)
      }))
    };
    
    this.results.summary = {
      ...overallStats,
      trends,
      timestamp: new Date().toISOString()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const summary = this.results.summary;
    
    if (!summary || summary.error) {
      this.results.recommendations = recommendations;
      return;
    }
    
    // Success rate recommendations
    if (summary.avgSuccessRate < 95) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        title: 'Improve Success Rate',
        description: `Average success rate is ${summary.avgSuccessRate.toFixed(2)}%. Investigate and fix error sources.`,
        expectedImpact: 'Improved user experience and system reliability'
      });
    }
    
    // Response time recommendations
    if (summary.avgResponseTime > 1000) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Optimize Response Times',
        description: `Average response time is ${summary.avgResponseTime}ms. Consider caching, database optimization, or CDN.`,
        expectedImpact: '30-50% response time improvement'
      });
    }
    
    // Scalability recommendations
    const rpsCapacity = summary.trends.rpsCapacity;
    if (rpsCapacity.length > 1) {
      const maxRPS = Math.max(...rpsCapacity.map(r => parseFloat(r.rps)));
      if (maxRPS < 10) {
        recommendations.push({
          priority: 'medium',
          category: 'scalability',
          title: 'Improve Throughput Capacity',
          description: `Maximum throughput is ${maxRPS} RPS. Consider horizontal scaling or performance optimization.`,
          expectedImpact: 'Better handling of traffic spikes'
        });
      }
    }
    
    // Critical endpoint recommendations
    const lastTest = this.results.tests[this.results.tests.length - 1];
    if (lastTest?.summary?.endpointPerformance) {
      Object.entries(lastTest.summary.endpointPerformance).forEach(([endpoint, stats]) => {
        if (stats.critical && stats.grade === 'F') {
          recommendations.push({
            priority: 'critical',
            category: 'endpoint',
            title: `Optimize Critical Endpoint: ${endpoint}`,
            description: `Critical endpoint has poor performance (Grade: ${stats.grade}, Success: ${stats.successRate}%, Avg: ${stats.avgResponseTime}ms)`,
            expectedImpact: 'Improved performance for critical user flows'
          });
        }
      });
    }
    
    this.results.recommendations = recommendations;
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(process.cwd(), 'load-test-results');
    
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save JSON results
    const jsonPath = path.join(resultsDir, `load-test-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
    
    // Save summary report
    const summaryPath = path.join(resultsDir, `load-test-summary-${timestamp}.txt`);
    const summaryContent = this.generateTextSummary();
    fs.writeFileSync(summaryPath, summaryContent);
    
    log.success(`Results saved: ${jsonPath}`);
    log.success(`Summary saved: ${summaryPath}`);
    
    return { json: jsonPath, summary: summaryPath };
  }

  generateTextSummary() {
    const lines = [];
    lines.push('🔥 AstroQuiz Load Test Results');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Generated: ${this.results.timestamp}`);
    lines.push(`Target: ${this.results.baseUrl}`);
    lines.push('');
    
    // Overall summary
    if (this.results.summary && !this.results.summary.error) {
      const summary = this.results.summary;
      lines.push('📊 OVERALL PERFORMANCE');
      lines.push('-'.repeat(25));
      lines.push(`Total Requests: ${summary.totalRequests}`);
      lines.push(`Average Success Rate: ${summary.avgSuccessRate.toFixed(2)}%`);
      lines.push(`Average Response Time: ${Math.round(summary.avgResponseTime)}ms`);
      lines.push(`Maximum RPS: ${summary.maxRPS}`);
      lines.push(`Performance Range: ${summary.bestGrade} to ${summary.worstGrade}`);
      lines.push('');
    }
    
    // Test results
    this.results.tests.forEach((test, index) => {
      lines.push(`🔥 TEST ${index + 1}: ${test.config.name.toUpperCase()}`);
      lines.push('-'.repeat(30));
      lines.push(`Concurrency: ${test.config.concurrency} users`);
      lines.push(`Duration: ${Math.round(test.duration / 1000)}s`);
      lines.push(`Completed Requests: ${test.completedRequests}`);
      lines.push(`Success Rate: ${test.summary.successRate}%`);
      lines.push(`Average Response Time: ${test.summary.avgResponseTime}ms`);
      lines.push(`P95 Response Time: ${test.summary.p95ResponseTime}ms`);
      lines.push(`Requests per Second: ${test.summary.rps}`);
      lines.push(`Performance Grade: ${test.summary.grade}`);
      lines.push('');
    });
    
    // Recommendations
    if (this.results.recommendations?.length > 0) {
      lines.push('🎯 RECOMMENDATIONS');
      lines.push('-'.repeat(20));
      this.results.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec.title} (${rec.priority})`);
        lines.push(`   ${rec.description}`);
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'https://astroquiz-production.up.railway.app';
  const suites = args.slice(1).length > 0 ? args.slice(1) : ['light', 'moderate'];
  
  try {
    const tester = new LoadTester(baseUrl);
    const results = await tester.runLoadTests(suites);
    
    console.log('\n' + '='.repeat(60));
    log.success('Load Testing Complete!');
    console.log('='.repeat(60));
    
    // Display key results
    if (results.summary && !results.summary.error) {
      const summary = results.summary;
      console.log(`\n📊 Total Requests: ${summary.totalRequests}`);
      console.log(`✅ Success Rate: ${summary.avgSuccessRate.toFixed(2)}%`);
      console.log(`⚡ Avg Response Time: ${Math.round(summary.avgResponseTime)}ms`);
      console.log(`🚀 Max RPS: ${summary.maxRPS}`);
      
      if (results.recommendations?.length > 0) {
        console.log(`\n🎯 ${results.recommendations.length} recommendations generated`);
        results.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.title} (${rec.priority})`);
        });
      }
    }
    
    console.log(`\n📄 Results saved in: ${path.join(process.cwd(), 'load-test-results')}`);
    
  } catch (error) {
    log.error(`Load testing failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Script execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = LoadTester;
