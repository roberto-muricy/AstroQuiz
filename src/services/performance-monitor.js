/**
 * 🎯 Global Performance Monitor Service
 * Centralized performance monitoring service
 */

'use strict';

const performanceMiddleware = require('../middlewares/performance-monitor');

module.exports = ({ strapi }) => ({
  /**
   * Get current performance metrics
   */
  getMetrics() {
    return performanceMiddleware.getMetrics();
  },

  /**
   * Get real-time metrics
   */
  getRealtimeMetrics() {
    return performanceMiddleware.getRealtimeMetrics();
  },

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics() {
    return performanceMiddleware.reset();
  },

  /**
   * Get performance insights and alerts
   */
  getPerformanceAlerts() {
    const metrics = this.getMetrics();
    const alerts = [];

    // High response time alert
    if (metrics.avgResponseTime > 2000) {
      alerts.push({
        type: 'warning',
        category: 'performance',
        message: `Average response time is ${metrics.avgResponseTime}ms (threshold: 2000ms)`,
        severity: metrics.avgResponseTime > 5000 ? 'critical' : 'warning',
        timestamp: Date.now()
      });
    }

    // High error rate alert
    if (metrics.errorRate > 0.05) {
      alerts.push({
        type: 'error',
        category: 'reliability',
        message: `Error rate is ${(metrics.errorRate * 100).toFixed(2)}% (threshold: 5%)`,
        severity: metrics.errorRate > 0.1 ? 'critical' : 'warning',
        timestamp: Date.now()
      });
    }

    // Memory usage alert
    const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (memoryUsageMB > 256) {
      alerts.push({
        type: 'warning',
        category: 'resources',
        message: `Memory usage is ${Math.round(memoryUsageMB)}MB (threshold: 256MB)`,
        severity: memoryUsageMB > 512 ? 'critical' : 'warning',
        timestamp: Date.now()
      });
    }

    // Low requests per second (possible downtime)
    if (metrics.requestsPerSecond === 0 && metrics.uptime > 300) {
      alerts.push({
        type: 'warning',
        category: 'availability',
        message: 'No requests received in the last minute',
        severity: 'warning',
        timestamp: Date.now()
      });
    }

    return alerts;
  },

  /**
   * Generate performance summary report
   */
  generatePerformanceSummary() {
    const metrics = this.getMetrics();
    const alerts = this.getPerformanceAlerts();
    
    // Calculate performance score
    let score = 100;
    if (metrics.avgResponseTime > 2000) score -= 20;
    if (metrics.errorRate > 0.05) score -= 30;
    if (process.memoryUsage().heapUsed / 1024 / 1024 > 256) score -= 15;
    if (metrics.requestsPerSecond < 0.1) score -= 10;

    const status = score >= 80 ? 'excellent' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'fair' : 'poor';

    return {
      score: Math.max(0, score),
      status,
      summary: {
        totalRequests: metrics.totalRequests,
        totalErrors: metrics.totalErrors,
        avgResponseTime: metrics.avgResponseTime,
        errorRate: (metrics.errorRate * 100).toFixed(2) + '%',
        uptime: this.formatUptime(metrics.uptime),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      },
      alerts,
      recommendations: this.generateRecommendations(metrics),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.avgResponseTime > 1000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Implement Response Caching',
        description: 'Add caching middleware to reduce response times for frequently accessed endpoints',
        expectedImpact: '30-50% response time improvement'
      });
    }

    if (metrics.errorRate > 0.02) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        title: 'Error Rate Investigation',
        description: 'Investigate and fix the root cause of API errors',
        expectedImpact: 'Improved user experience and system stability'
      });
    }

    if (process.memoryUsage().heapUsed / 1024 / 1024 > 200) {
      recommendations.push({
        category: 'optimization',
        priority: 'medium',
        title: 'Memory Optimization',
        description: 'Implement memory optimization strategies and garbage collection tuning',
        expectedImpact: 'Reduced memory footprint and better performance'
      });
    }

    if (metrics.topEndpoints.length > 0) {
      const slowEndpoints = metrics.topEndpoints.filter(ep => ep.avgResponseTime > 1000);
      if (slowEndpoints.length > 0) {
        recommendations.push({
          category: 'optimization',
          priority: 'medium',
          title: 'Optimize Slow Endpoints',
          description: `Optimize endpoints: ${slowEndpoints.map(ep => ep.endpoint).join(', ')}`,
          expectedImpact: 'Faster API responses for most used endpoints'
        });
      }
    }

    return recommendations;
  },

  /**
   * Format uptime in human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  /**
   * Export metrics to external monitoring systems
   */
  exportMetrics(format = 'json') {
    const metrics = this.getMetrics();
    const summary = this.generatePerformanceSummary();

    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      summary,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    switch (format) {
      case 'prometheus':
        return this.toPrometheusFormat(exportData);
      case 'csv':
        return this.toCsvFormat(exportData);
      default:
        return exportData;
    }
  },

  /**
   * Convert metrics to Prometheus format
   */
  toPrometheusFormat(data) {
    const lines = [];
    
    lines.push(`# HELP astroquiz_requests_total Total number of requests`);
    lines.push(`# TYPE astroquiz_requests_total counter`);
    lines.push(`astroquiz_requests_total ${data.metrics.totalRequests}`);
    
    lines.push(`# HELP astroquiz_errors_total Total number of errors`);
    lines.push(`# TYPE astroquiz_errors_total counter`);
    lines.push(`astroquiz_errors_total ${data.metrics.totalErrors}`);
    
    lines.push(`# HELP astroquiz_response_time_avg Average response time in milliseconds`);
    lines.push(`# TYPE astroquiz_response_time_avg gauge`);
    lines.push(`astroquiz_response_time_avg ${data.metrics.avgResponseTime}`);
    
    lines.push(`# HELP astroquiz_memory_usage Memory usage in bytes`);
    lines.push(`# TYPE astroquiz_memory_usage gauge`);
    lines.push(`astroquiz_memory_usage ${data.system.memoryUsage.heapUsed}`);
    
    return lines.join('\n');
  },

  /**
   * Convert metrics to CSV format
   */
  toCsvFormat(data) {
    const headers = [
      'timestamp',
      'total_requests',
      'total_errors',
      'avg_response_time',
      'error_rate',
      'memory_usage_mb',
      'uptime_seconds'
    ];
    
    const values = [
      data.timestamp,
      data.metrics.totalRequests,
      data.metrics.totalErrors,
      data.metrics.avgResponseTime,
      data.metrics.errorRate,
      Math.round(data.system.memoryUsage.heapUsed / 1024 / 1024),
      Math.round(data.system.uptime)
    ];
    
    return headers.join(',') + '\n' + values.join(',');
  }
});
