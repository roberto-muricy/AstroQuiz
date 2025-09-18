#!/usr/bin/env node

/**
 * 📊 Performance Report Generator
 * Automated performance analysis and reporting for AstroQuiz
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
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n📊 ${msg}${colors.reset}`),
  section: (msg) => console.log(`${colors.bold}${colors.cyan}\n📋 ${msg}${colors.reset}`)
};

class PerformanceReporter {
  constructor(baseUrl = 'https://astroquiz-production.up.railway.app') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {},
      details: {},
      recommendations: [],
      alerts: []
    };
  }

  async generateReport() {
    log.header('Performance Report Generation Started');
    log.info(`Analyzing: ${this.baseUrl}`);

    try {
      // Collect all metrics
      await this.collectAnalytics();
      await this.collectHealthMetrics();
      await this.performLoadTest();
      await this.analyzeDatabase();
      await this.checkCachePerformance();
      
      // Generate insights
      this.generateInsights();
      this.generateRecommendations();
      
      // Save reports
      await this.saveReports();
      
      log.success('Performance report generated successfully!');
      return this.reportData;
      
    } catch (error) {
      log.error(`Report generation failed: ${error.message}`);
      throw error;
    }
  }

  async collectAnalytics() {
    log.section('Collecting Analytics Data');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/overview`, {
        timeout: 10000
      });
      
      if (response.data.success) {
        this.reportData.details.analytics = response.data.data;
        log.success('Analytics data collected');
      } else {
        log.warning('Analytics data collection failed');
      }
    } catch (error) {
      log.error(`Analytics collection error: ${error.message}`);
      this.reportData.details.analytics = { error: error.message };
    }
  }

  async collectHealthMetrics() {
    log.section('Collecting Health Metrics');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health/advanced`, {
        timeout: 15000
      });
      
      if (response.data.success) {
        this.reportData.details.health = response.data.data;
        this.reportData.summary.healthScore = response.data.score;
        this.reportData.summary.healthStatus = response.data.status;
        log.success(`Health metrics collected (Score: ${response.data.score})`);
      } else {
        log.warning('Health metrics collection failed');
      }
    } catch (error) {
      log.error(`Health metrics error: ${error.message}`);
      this.reportData.details.health = { error: error.message };
    }
  }

  async performLoadTest() {
    log.section('Performing Basic Load Test');
    
    const testEndpoints = [
      '/api/questions?pagination[limit]=10',
      '/api/questions?filters[locale][$eq]=en&pagination[limit]=5',
      '/api/health',
      '/api/analytics/performance'
    ];
    
    const loadTestResults = [];
    
    for (const endpoint of testEndpoints) {
      try {
        const results = await this.testEndpointLoad(endpoint, 10); // 10 concurrent requests
        loadTestResults.push(results);
        log.info(`Load test completed for ${endpoint}: ${results.avgResponseTime}ms avg`);
      } catch (error) {
        log.warning(`Load test failed for ${endpoint}: ${error.message}`);
        loadTestResults.push({
          endpoint,
          error: error.message,
          success: false
        });
      }
    }
    
    this.reportData.details.loadTest = {
      results: loadTestResults,
      summary: this.summarizeLoadTest(loadTestResults)
    };
  }

  async testEndpointLoad(endpoint, concurrency = 10) {
    const url = `${this.baseUrl}${endpoint}`;
    const promises = [];
    const startTime = Date.now();
    
    // Create concurrent requests
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.measureRequest(url));
    }
    
    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
    
    const responseTimes = successful.map(r => r.value.responseTime);
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    return {
      endpoint,
      concurrency,
      totalRequests: concurrency,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / concurrency) * 100,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      totalTestTime: totalTime,
      requestsPerSecond: (successful.length / (totalTime / 1000)).toFixed(2),
      success: successful.length > 0
    };
  }

  async measureRequest(url) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        success: response.status >= 200 && response.status < 300,
        responseTime,
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  summarizeLoadTest(results) {
    const successful = results.filter(r => r.success);
    const avgResponseTimes = successful.map(r => r.avgResponseTime);
    const successRates = successful.map(r => r.successRate);
    
    return {
      totalEndpoints: results.length,
      successfulEndpoints: successful.length,
      overallAvgResponseTime: avgResponseTimes.length > 0 ? 
        Math.round(avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length) : 0,
      overallSuccessRate: successRates.length > 0 ?
        (successRates.reduce((a, b) => a + b, 0) / successRates.length).toFixed(2) + '%' : '0%',
      performance: avgResponseTimes.length > 0 && avgResponseTimes.every(t => t < 1000) ? 'excellent' :
                   avgResponseTimes.length > 0 && avgResponseTimes.every(t => t < 2000) ? 'good' : 'needs_improvement'
    };
  }

  async analyzeDatabase() {
    log.section('Analyzing Database Performance');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/database`, {
        timeout: 10000
      });
      
      if (response.data.success) {
        const dbData = response.data.data;
        this.reportData.details.database = dbData;
        
        // Analyze database health
        const analysis = {
          totalQuestions: dbData.totalQuestions || 0,
          languageDistribution: dbData.byLocale || {},
          levelDistribution: dbData.byLevel || {},
          connectionHealth: dbData.connection?.status === 'connected',
          recommendations: []
        };
        
        // Generate database recommendations
        if (analysis.totalQuestions === 0) {
          analysis.recommendations.push('No questions found - consider importing question data');
        } else if (analysis.totalQuestions < 100) {
          analysis.recommendations.push('Low question count - consider adding more questions');
        }
        
        // Check language balance
        const locales = Object.values(analysis.languageDistribution);
        if (locales.length > 0) {
          const minQuestions = Math.min(...locales);
          const maxQuestions = Math.max(...locales);
          if (maxQuestions / minQuestions > 2) {
            analysis.recommendations.push('Unbalanced language distribution - consider equalizing question counts');
          }
        }
        
        this.reportData.details.databaseAnalysis = analysis;
        log.success(`Database analyzed: ${analysis.totalQuestions} questions`);
      }
    } catch (error) {
      log.error(`Database analysis error: ${error.message}`);
      this.reportData.details.database = { error: error.message };
    }
  }

  async checkCachePerformance() {
    log.section('Checking Cache Performance');
    
    try {
      // Test cache performance by making repeated requests
      const testUrl = `${this.baseUrl}/api/questions?pagination[limit]=5`;
      
      // First request (cache miss)
      const firstRequest = await this.measureRequest(testUrl);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second request (potential cache hit)
      const secondRequest = await this.measureRequest(testUrl);
      
      const cachePerformance = {
        firstRequestTime: firstRequest.responseTime,
        secondRequestTime: secondRequest.responseTime,
        improvement: firstRequest.success && secondRequest.success ?
          Math.round(((firstRequest.responseTime - secondRequest.responseTime) / firstRequest.responseTime) * 100) : 0,
        cacheEffective: secondRequest.responseTime < firstRequest.responseTime * 0.8
      };
      
      this.reportData.details.cache = cachePerformance;
      log.success(`Cache performance checked: ${cachePerformance.improvement}% improvement`);
      
    } catch (error) {
      log.error(`Cache performance check error: ${error.message}`);
      this.reportData.details.cache = { error: error.message };
    }
  }

  generateInsights() {
    log.section('Generating Performance Insights');
    
    const insights = [];
    
    // Health insights
    if (this.reportData.summary.healthScore) {
      if (this.reportData.summary.healthScore >= 90) {
        insights.push({
          type: 'positive',
          category: 'health',
          message: `Excellent system health score: ${this.reportData.summary.healthScore}/100`
        });
      } else if (this.reportData.summary.healthScore < 70) {
        insights.push({
          type: 'warning',
          category: 'health',
          message: `Low system health score: ${this.reportData.summary.healthScore}/100`
        });
      }
    }
    
    // Load test insights
    if (this.reportData.details.loadTest?.summary) {
      const loadSummary = this.reportData.details.loadTest.summary;
      if (loadSummary.performance === 'excellent') {
        insights.push({
          type: 'positive',
          category: 'performance',
          message: `Excellent load test performance: ${loadSummary.overallAvgResponseTime}ms average response time`
        });
      } else if (loadSummary.performance === 'needs_improvement') {
        insights.push({
          type: 'warning',
          category: 'performance',
          message: `Load test shows room for improvement: ${loadSummary.overallAvgResponseTime}ms average response time`
        });
      }
    }
    
    // Database insights
    if (this.reportData.details.databaseAnalysis) {
      const dbAnalysis = this.reportData.details.databaseAnalysis;
      if (dbAnalysis.totalQuestions > 1000) {
        insights.push({
          type: 'positive',
          category: 'database',
          message: `Rich question database: ${dbAnalysis.totalQuestions} questions available`
        });
      }
    }
    
    // Cache insights
    if (this.reportData.details.cache?.cacheEffective) {
      insights.push({
        type: 'positive',
        category: 'cache',
        message: `Cache system is effective: ${this.reportData.details.cache.improvement}% performance improvement`
      });
    }
    
    this.reportData.insights = insights;
    log.success(`Generated ${insights.length} performance insights`);
  }

  generateRecommendations() {
    log.section('Generating Recommendations');
    
    const recommendations = [];
    
    // Health-based recommendations
    if (this.reportData.summary.healthScore < 80) {
      recommendations.push({
        priority: 'high',
        category: 'health',
        title: 'Improve System Health',
        description: 'System health score is below optimal. Check memory usage, database connections, and error rates.',
        expectedImpact: 'Improved stability and performance'
      });
    }
    
    // Performance recommendations
    const loadSummary = this.reportData.details.loadTest?.summary;
    if (loadSummary && loadSummary.overallAvgResponseTime > 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Response Times',
        description: 'Average response times are above 1 second. Consider implementing caching, database indexing, or query optimization.',
        expectedImpact: '30-50% response time improvement'
      });
    }
    
    // Database recommendations
    const dbAnalysis = this.reportData.details.databaseAnalysis;
    if (dbAnalysis?.recommendations) {
      dbAnalysis.recommendations.forEach(rec => {
        recommendations.push({
          priority: 'medium',
          category: 'database',
          title: 'Database Optimization',
          description: rec,
          expectedImpact: 'Better data consistency and performance'
        });
      });
    }
    
    // Cache recommendations
    if (this.reportData.details.cache && !this.reportData.details.cache.cacheEffective) {
      recommendations.push({
        priority: 'low',
        category: 'cache',
        title: 'Improve Caching Strategy',
        description: 'Cache system is not showing significant performance improvements. Review cache TTL settings and coverage.',
        expectedImpact: '20-30% response time improvement'
      });
    }
    
    this.reportData.recommendations = recommendations;
    log.success(`Generated ${recommendations.length} recommendations`);
  }

  async saveReports() {
    log.section('Saving Reports');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save JSON report
    const jsonPath = path.join(reportsDir, `performance-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.reportData, null, 2));
    log.success(`JSON report saved: ${jsonPath}`);
    
    // Save HTML report
    const htmlPath = path.join(reportsDir, `performance-report-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport();
    fs.writeFileSync(htmlPath, htmlContent);
    log.success(`HTML report saved: ${htmlPath}`);
    
    // Save summary report
    const summaryPath = path.join(reportsDir, `performance-summary-${timestamp}.txt`);
    const summaryContent = this.generateTextSummary();
    fs.writeFileSync(summaryPath, summaryContent);
    log.success(`Summary report saved: ${summaryPath}`);
    
    return {
      json: jsonPath,
      html: htmlPath,
      summary: summaryPath
    };
  }

  generateHTMLReport() {
    const healthScore = this.reportData.summary.healthScore || 0;
    const healthStatus = this.reportData.summary.healthStatus || 'unknown';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AstroQuiz Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; color: ${healthScore >= 80 ? '#28a745' : healthScore >= 60 ? '#ffc107' : '#dc3545'}; }
        .status { font-size: 24px; text-transform: uppercase; margin-top: 10px; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .section h2 { color: #007bff; margin-top: 0; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #f8f9fa; border-radius: 5px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .insight { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AstroQuiz Performance Report</h1>
            <div class="score">${healthScore}/100</div>
            <div class="status">${healthStatus}</div>
            <div class="timestamp">Generated: ${this.reportData.timestamp}</div>
            <div class="timestamp">URL: ${this.reportData.baseUrl}</div>
        </div>
        
        <div class="section">
            <h2>📊 Performance Summary</h2>
            ${this.reportData.details.loadTest?.summary ? `
                <div class="metric">
                    <strong>Avg Response Time:</strong> ${this.reportData.details.loadTest.summary.overallAvgResponseTime}ms
                </div>
                <div class="metric">
                    <strong>Success Rate:</strong> ${this.reportData.details.loadTest.summary.overallSuccessRate}
                </div>
                <div class="metric">
                    <strong>Performance Grade:</strong> ${this.reportData.details.loadTest.summary.performance}
                </div>
            ` : '<p>Load test data not available</p>'}
        </div>
        
        <div class="section">
            <h2>🗄️ Database Status</h2>
            ${this.reportData.details.databaseAnalysis ? `
                <div class="metric">
                    <strong>Total Questions:</strong> ${this.reportData.details.databaseAnalysis.totalQuestions}
                </div>
                <div class="metric">
                    <strong>Languages:</strong> ${Object.keys(this.reportData.details.databaseAnalysis.languageDistribution || {}).length}
                </div>
                <div class="metric">
                    <strong>Connection:</strong> ${this.reportData.details.databaseAnalysis.connectionHealth ? 'Healthy' : 'Issues'}
                </div>
            ` : '<p>Database analysis data not available</p>'}
        </div>
        
        <div class="section">
            <h2>💡 Insights</h2>
            ${this.reportData.insights?.map(insight => `
                <div class="insight">
                    <strong>${insight.category.toUpperCase()}:</strong> ${insight.message}
                </div>
            `).join('') || '<p>No insights available</p>'}
        </div>
        
        <div class="section">
            <h2>🎯 Recommendations</h2>
            ${this.reportData.recommendations?.map(rec => `
                <div class="recommendation">
                    <strong>${rec.title}</strong> (${rec.priority} priority)<br>
                    ${rec.description}<br>
                    <em>Expected Impact: ${rec.expectedImpact}</em>
                </div>
            `).join('') || '<p>No recommendations available</p>'}
        </div>
    </div>
</body>
</html>`;
  }

  generateTextSummary() {
    const lines = [];
    lines.push('🚀 AstroQuiz Performance Report Summary');
    lines.push('=' .repeat(50));
    lines.push('');
    lines.push(`Generated: ${this.reportData.timestamp}`);
    lines.push(`URL: ${this.reportData.baseUrl}`);
    lines.push('');
    
    // Health Summary
    lines.push('🏥 HEALTH SUMMARY');
    lines.push('-'.repeat(20));
    lines.push(`Overall Score: ${this.reportData.summary.healthScore || 'N/A'}/100`);
    lines.push(`Status: ${this.reportData.summary.healthStatus || 'Unknown'}`);
    lines.push('');
    
    // Performance Summary
    if (this.reportData.details.loadTest?.summary) {
      const summary = this.reportData.details.loadTest.summary;
      lines.push('⚡ PERFORMANCE SUMMARY');
      lines.push('-'.repeat(25));
      lines.push(`Average Response Time: ${summary.overallAvgResponseTime}ms`);
      lines.push(`Success Rate: ${summary.overallSuccessRate}`);
      lines.push(`Performance Grade: ${summary.performance}`);
      lines.push('');
    }
    
    // Database Summary
    if (this.reportData.details.databaseAnalysis) {
      const db = this.reportData.details.databaseAnalysis;
      lines.push('🗄️ DATABASE SUMMARY');
      lines.push('-'.repeat(20));
      lines.push(`Total Questions: ${db.totalQuestions}`);
      lines.push(`Languages: ${Object.keys(db.languageDistribution || {}).length}`);
      lines.push(`Connection Health: ${db.connectionHealth ? 'Healthy' : 'Issues'}`);
      lines.push('');
    }
    
    // Top Recommendations
    if (this.reportData.recommendations?.length > 0) {
      lines.push('🎯 TOP RECOMMENDATIONS');
      lines.push('-'.repeat(25));
      this.reportData.recommendations.slice(0, 3).forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec.title} (${rec.priority} priority)`);
        lines.push(`   ${rec.description}`);
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'https://astroquiz-production.up.railway.app';
  
  try {
    const reporter = new PerformanceReporter(baseUrl);
    const report = await reporter.generateReport();
    
    console.log('\n' + '='.repeat(60));
    log.success('Performance Report Generation Complete!');
    console.log('='.repeat(60));
    
    // Display summary
    if (report.summary.healthScore) {
      console.log(`\n🏥 Health Score: ${report.summary.healthScore}/100 (${report.summary.healthStatus})`);
    }
    
    if (report.details.loadTest?.summary) {
      const summary = report.details.loadTest.summary;
      console.log(`⚡ Performance: ${summary.overallAvgResponseTime}ms avg, ${summary.overallSuccessRate} success rate`);
    }
    
    if (report.recommendations?.length > 0) {
      console.log(`\n🎯 Generated ${report.recommendations.length} recommendations for improvement`);
    }
    
    console.log(`\n📊 Reports saved in: ${path.join(process.cwd(), 'reports')}`);
    
  } catch (error) {
    log.error(`Report generation failed: ${error.message}`);
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

module.exports = PerformanceReporter;
