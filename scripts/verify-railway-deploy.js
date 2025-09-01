#!/usr/bin/env node

/**
 * 🔍 Railway Deployment Verification Script
 * Comprehensive testing of deployed AstroQuiz application
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
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🔍 ${msg}${colors.reset}`),
  section: (msg) => console.log(`${colors.bold}${colors.cyan}\n📋 ${msg}${colors.reset}`)
};

/**
 * Test results collector
 */
class TestResults {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
  }

  addTest(name, status, message = '', data = null) {
    this.tests.push({
      name,
      status, // 'pass', 'fail', 'warn'
      message,
      data,
      timestamp: new Date().toISOString()
    });

    if (status === 'pass') this.passed++;
    else if (status === 'fail') this.failed++;
    else if (status === 'warn') this.warnings++;
  }

  getSummary() {
    return {
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      success: this.failed === 0
    };
  }

  generateReport() {
    const summary = this.getSummary();
    const report = {
      summary,
      tests: this.tests,
      generatedAt: new Date().toISOString()
    };

    const reportPath = path.join(process.cwd(), 'railway-deploy-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}

/**
 * HTTP client with timeout and retry
 */
class HttpClient {
  constructor(baseURL, timeout = 30000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  async get(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      validateStatus: () => true, // Don't throw on any status
      ...options
    };

    try {
      const response = await axios.get(url, config);
      return {
        success: response.status < 400,
        status: response.status,
        data: response.data,
        headers: response.headers,
        url
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error.message,
        url
      };
    }
  }

  async post(endpoint, data, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      validateStatus: () => true,
      ...options
    };

    try {
      const response = await axios.post(url, data, config);
      return {
        success: response.status < 400,
        status: response.status,
        data: response.data,
        headers: response.headers,
        url
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error.message,
        url
      };
    }
  }
}

/**
 * Railway deployment verifier
 */
class RailwayVerifier {
  constructor(baseURL) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.client = new HttpClient(this.baseURL);
    this.results = new TestResults();
  }

  async verifyHealthCheck() {
    log.section('Health Check Verification');
    
    const response = await this.client.get('/api/health');
    
    if (response.success) {
      log.success(`Health check passed (${response.status})`);
      this.results.addTest('Health Check', 'pass', `Status: ${response.status}`, response.data);
      
      // Verify health data structure
      if (response.data && response.data.data) {
        const health = response.data.data;
        
        if (health.database === 'connected') {
          log.success('Database connectivity verified');
          this.results.addTest('Database Connection', 'pass', 'Database connected');
        } else {
          log.warning('Database connection issue detected');
          this.results.addTest('Database Connection', 'warn', `Database status: ${health.database}`);
        }
        
        if (health.environment === 'production') {
          log.success('Production environment confirmed');
          this.results.addTest('Environment', 'pass', 'Running in production mode');
        } else {
          log.warning(`Environment: ${health.environment}`);
          this.results.addTest('Environment', 'warn', `Environment: ${health.environment}`);
        }
      }
    } else {
      log.error(`Health check failed: ${response.status} - ${response.error || 'Unknown error'}`);
      this.results.addTest('Health Check', 'fail', `Status: ${response.status}, Error: ${response.error}`);
    }
  }

  async verifyQuizEngine() {
    log.section('Quiz Engine Verification');
    
    // Test quiz health
    const healthResponse = await this.client.get('/api/quiz/health');
    
    if (healthResponse.success) {
      log.success('Quiz Engine health check passed');
      this.results.addTest('Quiz Engine Health', 'pass', `Status: ${healthResponse.status}`);
    } else {
      log.error('Quiz Engine health check failed');
      this.results.addTest('Quiz Engine Health', 'fail', `Status: ${healthResponse.status}`);
    }

    // Test game rules endpoint
    const rulesResponse = await this.client.get('/api/quiz/rules');
    
    if (rulesResponse.success && rulesResponse.data) {
      log.success('Game rules endpoint working');
      this.results.addTest('Game Rules API', 'pass', 'Rules retrieved successfully');
    } else {
      log.error('Game rules endpoint failed');
      this.results.addTest('Game Rules API', 'fail', `Status: ${rulesResponse.status}`);
    }

    // Test pool stats for different locales
    const locales = ['en', 'pt', 'es', 'fr'];
    for (const locale of locales) {
      const poolResponse = await this.client.get(`/api/quiz/pool-stats/${locale}`);
      
      if (poolResponse.success && poolResponse.data) {
        const stats = poolResponse.data.data;
        if (stats && stats.totalQuestions > 0) {
          log.success(`${locale.toUpperCase()} question pool: ${stats.totalQuestions} questions`);
          this.results.addTest(`${locale.toUpperCase()} Question Pool`, 'pass', `${stats.totalQuestions} questions available`);
        } else {
          log.warning(`${locale.toUpperCase()} question pool appears empty`);
          this.results.addTest(`${locale.toUpperCase()} Question Pool`, 'warn', 'No questions found');
        }
      } else {
        log.error(`${locale.toUpperCase()} pool stats failed`);
        this.results.addTest(`${locale.toUpperCase()} Question Pool`, 'fail', `Status: ${poolResponse.status}`);
      }
    }
  }

  async verifyQuestionsAPI() {
    log.section('Questions API Verification');
    
    // Test basic questions endpoint
    const questionsResponse = await this.client.get('/api/questions?pagination[limit]=5');
    
    if (questionsResponse.success && questionsResponse.data) {
      const data = questionsResponse.data;
      if (data.data && data.data.length > 0) {
        log.success(`Questions API working: ${data.data.length} questions retrieved`);
        this.results.addTest('Questions API', 'pass', `Retrieved ${data.data.length} questions`);
        
        // Test question structure
        const firstQuestion = data.data[0];
        const requiredFields = ['documentId', 'question', 'level', 'topic', 'locale'];
        const hasAllFields = requiredFields.every(field => firstQuestion.hasOwnProperty(field));
        
        if (hasAllFields) {
          log.success('Question data structure verified');
          this.results.addTest('Question Structure', 'pass', 'All required fields present');
        } else {
          log.warning('Question data structure incomplete');
          this.results.addTest('Question Structure', 'warn', 'Some fields missing');
        }
      } else {
        log.warning('Questions API returned empty results');
        this.results.addTest('Questions API', 'warn', 'No questions returned');
      }
    } else {
      log.error('Questions API failed');
      this.results.addTest('Questions API', 'fail', `Status: ${questionsResponse.status}`);
    }

    // Test filtering
    const filterResponse = await this.client.get('/api/questions?filters[level][$eq]=1&pagination[limit]=3');
    
    if (filterResponse.success && filterResponse.data) {
      log.success('Question filtering working');
      this.results.addTest('Question Filtering', 'pass', 'Level filtering functional');
    } else {
      log.error('Question filtering failed');
      this.results.addTest('Question Filtering', 'fail', `Status: ${filterResponse.status}`);
    }
  }

  async verifyDeepLIntegration() {
    log.section('DeepL Integration Verification');
    
    // Test DeepL connection (if configured)
    const testResponse = await this.client.post('/api/deepl/translate', {
      text: 'Hello, world!',
      targetLang: 'PT'
    });
    
    if (testResponse.success && testResponse.data) {
      log.success('DeepL translation working');
      this.results.addTest('DeepL Translation', 'pass', 'Translation API functional');
    } else if (testResponse.status === 404) {
      log.warning('DeepL endpoint not found (may not be configured)');
      this.results.addTest('DeepL Translation', 'warn', 'Endpoint not configured');
    } else {
      log.warning('DeepL translation failed (may not be configured)');
      this.results.addTest('DeepL Translation', 'warn', `Status: ${testResponse.status}`);
    }
  }

  async verifyAdminPanel() {
    log.section('Admin Panel Verification');
    
    const adminResponse = await this.client.get('/admin');
    
    if (adminResponse.success) {
      log.success('Admin panel accessible');
      this.results.addTest('Admin Panel Access', 'pass', 'Admin panel loads successfully');
    } else {
      log.error('Admin panel not accessible');
      this.results.addTest('Admin Panel Access', 'fail', `Status: ${adminResponse.status}`);
    }
  }

  async verifyPerformance() {
    log.section('Performance Verification');
    
    const startTime = Date.now();
    const response = await this.client.get('/api/health');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.success) {
      if (responseTime < 2000) {
        log.success(`Response time: ${responseTime}ms (Good)`);
        this.results.addTest('Response Time', 'pass', `${responseTime}ms`);
      } else if (responseTime < 5000) {
        log.warning(`Response time: ${responseTime}ms (Acceptable)`);
        this.results.addTest('Response Time', 'warn', `${responseTime}ms`);
      } else {
        log.error(`Response time: ${responseTime}ms (Slow)`);
        this.results.addTest('Response Time', 'fail', `${responseTime}ms`);
      }
    } else {
      log.error('Performance test failed - endpoint not responding');
      this.results.addTest('Response Time', 'fail', 'Endpoint not responding');
    }
  }

  async runAllTests() {
    log.header(`Railway Deployment Verification: ${this.baseURL}`);
    
    try {
      await this.verifyHealthCheck();
      await this.verifyQuizEngine();
      await this.verifyQuestionsAPI();
      await this.verifyDeepLIntegration();
      await this.verifyAdminPanel();
      await this.verifyPerformance();
    } catch (error) {
      log.error(`Verification failed: ${error.message}`);
      this.results.addTest('Overall Verification', 'fail', error.message);
    }

    this.displaySummary();
    return this.results.generateReport();
  }

  displaySummary() {
    const summary = this.results.getSummary();
    
    console.log(`${colors.bold}${colors.blue}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                 📊 Verification Summary                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);
    
    console.log(`${colors.bold}Total Tests:${colors.reset} ${summary.total}`);
    console.log(`${colors.green}✅ Passed:${colors.reset} ${summary.passed}`);
    console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${summary.warnings}`);
    console.log(`${colors.red}❌ Failed:${colors.reset} ${summary.failed}`);
    console.log('');
    
    if (summary.success) {
      log.success('🎉 All critical tests passed! Deployment is healthy.');
    } else {
      log.error('❌ Some tests failed. Please check the issues above.');
    }
    
    console.log('');
    log.info(`Application URL: ${this.baseURL}`);
    log.info(`Admin Panel: ${this.baseURL}/admin`);
    log.info(`Health Check: ${this.baseURL}/api/health`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  let baseURL = args[0];
  
  if (!baseURL) {
    console.log(`${colors.yellow}Usage: npm run deploy:verify <URL>${colors.reset}`);
    console.log(`${colors.yellow}Example: npm run deploy:verify https://astroquiz-production.railway.app${colors.reset}`);
    console.log('');
    
    // Try to guess from Railway environment
    if (process.env.RAILWAY_STATIC_URL) {
      baseURL = `https://${process.env.RAILWAY_STATIC_URL}`;
      log.info(`Using Railway URL: ${baseURL}`);
    } else {
      log.error('Please provide the deployment URL as an argument');
      process.exit(1);
    }
  }
  
  // Ensure URL has protocol
  if (!baseURL.startsWith('http')) {
    baseURL = `https://${baseURL}`;
  }
  
  const verifier = new RailwayVerifier(baseURL);
  const reportPath = await verifier.runAllTests();
  
  log.info(`Detailed report saved to: ${reportPath}`);
  
  const summary = verifier.results.getSummary();
  process.exit(summary.success ? 0 : 1);
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
    log.error(`Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { RailwayVerifier, TestResults, HttpClient };
