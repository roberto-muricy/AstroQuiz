/**
 * 🔍 Railway Deploy Verification Script
 * Comprehensive health checks for production deployment
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.RAILWAY_STATIC_URL || process.env.DEPLOY_URL || 'http://localhost:1337';
const API_BASE = `${BASE_URL}/api`;
const TIMEOUT = 30000; // 30 seconds

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🚀 ${msg}${colors.reset}`)
};

// HTTP client with timeout
const client = axios.create({
  timeout: TIMEOUT,
  headers: {
    'User-Agent': 'AstroQuiz-Deploy-Verifier/1.0'
  }
});

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Add test result
function addResult(name, status, message, responseTime = null) {
  results.tests.push({ name, status, message, responseTime });
  results[status]++;
}

// Performance measurement wrapper
async function measurePerformance(name, testFn) {
  const start = performance.now();
  try {
    await testFn();
    const duration = Math.round(performance.now() - start);
    return duration;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    throw { ...error, duration };
  }
}

// Test functions
const tests = {
  // 1. Basic connectivity
  async basicConnectivity() {
    log.header('Basic Connectivity Tests');
    
    try {
      const duration = await measurePerformance('Server Response', async () => {
        const response = await client.get(BASE_URL);
        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`);
        }
      });
      
      log.success(`Server is responding (${duration}ms)`);
      addResult('passed', 'Server connectivity', `Response time: ${duration}ms`, duration);
    } catch (error) {
      log.error(`Server is not responding: ${error.message}`);
      addResult('failed', 'Server connectivity', error.message);
    }
  },

  // 2. Quiz Engine Health Check
  async quizEngineHealth() {
    log.header('Quiz Engine Health Check');
    
    try {
      const duration = await measurePerformance('Quiz Engine Health', async () => {
        const response = await client.get(`${API_BASE}/quiz/health`);
        
        if (response.status !== 200) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
        
        const data = response.data;
        if (!data.success) {
          throw new Error('Health check returned success: false');
        }
        
        // Verify required services
        const requiredServices = ['session', 'scoring', 'selector'];
        const services = data.data.services;
        
        for (const service of requiredServices) {
          if (!services[service]) {
            throw new Error(`Service ${service} is not available`);
          }
        }
      });
      
      log.success(`Quiz Engine is healthy (${duration}ms)`);
      addResult('passed', 'Quiz Engine health', `All services running, response time: ${duration}ms`, duration);
    } catch (error) {
      log.error(`Quiz Engine health check failed: ${error.message}`);
      addResult('failed', 'Quiz Engine health', error.message);
    }
  },

  // 3. Database Connectivity
  async databaseConnectivity() {
    log.header('Database Connectivity Test');
    
    try {
      const duration = await measurePerformance('Database Query', async () => {
        const response = await client.get(`${API_BASE}/questions?pagination[pageSize]=1`);
        
        if (response.status !== 200) {
          throw new Error(`Database query failed with status ${response.status}`);
        }
        
        const data = response.data;
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format from database');
        }
      });
      
      log.success(`Database is connected and responding (${duration}ms)`);
      addResult('passed', 'Database connectivity', `Query successful, response time: ${duration}ms`, duration);
    } catch (error) {
      log.error(`Database connectivity failed: ${error.message}`);
      addResult('failed', 'Database connectivity', error.message);
    }
  },

  // 4. API Endpoints Test
  async apiEndpoints() {
    log.header('API Endpoints Test');
    
    const endpoints = [
      { path: '/questions', method: 'GET', name: 'Questions API' },
      { path: '/quiz/rules', method: 'GET', name: 'Game Rules API' },
      { path: '/quiz/pool-stats', method: 'GET', name: 'Pool Statistics API' },
      { path: '/quiz/leaderboard', method: 'GET', name: 'Leaderboard API' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const duration = await measurePerformance(endpoint.name, async () => {
          const response = await client({
            method: endpoint.method,
            url: `${API_BASE}${endpoint.path}`
          });
          
          if (response.status !== 200) {
            throw new Error(`Expected 200, got ${response.status}`);
          }
        });
        
        log.success(`${endpoint.name} is working (${duration}ms)`);
        addResult('passed', endpoint.name, `Response time: ${duration}ms`, duration);
      } catch (error) {
        log.error(`${endpoint.name} failed: ${error.message}`);
        addResult('failed', endpoint.name, error.message);
      }
    }
  },

  // 5. Environment Variables Check
  async environmentVariables() {
    log.header('Environment Variables Check');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'APP_KEYS',
      'API_TOKEN_SALT',
      'ADMIN_JWT_SECRET',
      'JWT_SECRET'
    ];
    
    // We can't directly check env vars, but we can test if the app is working
    // which indicates they're properly set
    try {
      const response = await client.get(`${API_BASE}/quiz/health`);
      const healthData = response.data;
      
      if (healthData.success && healthData.data.config) {
        log.success('Environment variables appear to be properly configured');
        addResult('passed', 'Environment variables', 'Configuration loaded successfully');
      } else {
        throw new Error('Configuration not loaded properly');
      }
    } catch (error) {
      log.error(`Environment configuration issue: ${error.message}`);
      addResult('failed', 'Environment variables', error.message);
    }
  },

  // 6. Performance Test
  async performanceTest() {
    log.header('Performance Test');
    
    const testRequests = 5;
    const responseTimes = [];
    
    try {
      for (let i = 0; i < testRequests; i++) {
        const duration = await measurePerformance(`Request ${i + 1}`, async () => {
          await client.get(`${API_BASE}/quiz/health`);
        });
        responseTimes.push(duration);
      }
      
      const avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const maxResponseTime = Math.max(...responseTimes);
      
      if (avgResponseTime < 1000) {
        log.success(`Performance is good - Average: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
        addResult('passed', 'Performance test', `Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`, avgResponseTime);
      } else if (avgResponseTime < 2000) {
        log.warning(`Performance is acceptable - Average: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
        addResult('warnings', 'Performance test', `Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`, avgResponseTime);
      } else {
        log.error(`Performance is poor - Average: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
        addResult('failed', 'Performance test', `Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`, avgResponseTime);
      }
    } catch (error) {
      log.error(`Performance test failed: ${error.message}`);
      addResult('failed', 'Performance test', error.message);
    }
  }
};

// Main execution
async function runVerification() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                🚀 AstroQuiz Deploy Verification          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  log.info(`Testing deployment at: ${BASE_URL}`);
  log.info(`API Base URL: ${API_BASE}`);
  log.info(`Timeout: ${TIMEOUT / 1000}s\n`);
  
  // Run all tests
  const testFunctions = Object.values(tests);
  for (const test of testFunctions) {
    try {
      await test();
    } catch (error) {
      log.error(`Test execution error: ${error.message}`);
    }
    console.log(''); // Add spacing between tests
  }
  
  // Print summary
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                     📊 Test Summary                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`);
  console.log(`📊 Total Tests: ${results.tests.length}\n`);
  
  // Detailed results
  if (results.tests.length > 0) {
    console.log('📋 Detailed Results:');
    results.tests.forEach(test => {
      const statusIcon = test.status === 'passed' ? '✅' : test.status === 'warnings' ? '⚠️' : '❌';
      const timeInfo = test.responseTime ? ` (${test.responseTime}ms)` : '';
      console.log(`   ${statusIcon} ${test.name}: ${test.message}${timeInfo}`);
    });
  }
  
  // Exit code
  const exitCode = results.failed > 0 ? 1 : 0;
  
  console.log('\n' + (exitCode === 0 ? 
    `${colors.green}🎉 All critical tests passed! Deployment is ready.${colors.reset}` :
    `${colors.red}💥 Some tests failed. Please check the issues above.${colors.reset}`
  ));
  
  process.exit(exitCode);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run verification
if (require.main === module) {
  runVerification().catch(error => {
    log.error(`Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runVerification, tests };
