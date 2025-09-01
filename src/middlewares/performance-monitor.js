/**
 * 🔍 Performance Monitoring Middleware
 * Real-time request monitoring and metrics collection
 */

'use strict';

// Global metrics storage
const metrics = {
  requests: [],
  errors: [],
  responseTimesMap: new Map(),
  endpointStats: new Map(),
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  memorySnapshots: []
};

// Clean old data every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  metrics.requests = metrics.requests.filter(req => req.timestamp > fiveMinutesAgo);
  metrics.errors = metrics.errors.filter(err => err.timestamp > fiveMinutesAgo);
  
  // Keep only last 100 memory snapshots
  if (metrics.memorySnapshots.length > 100) {
    metrics.memorySnapshots = metrics.memorySnapshots.slice(-100);
  }
}, 5 * 60 * 1000);

// Take memory snapshot every minute
setInterval(() => {
  const memUsage = process.memoryUsage();
  metrics.memorySnapshots.push({
    timestamp: Date.now(),
    rss: memUsage.rss,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external
  });
}, 60 * 1000);

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to context
    ctx.requestId = requestId;
    
    // Extract request information
    const requestInfo = {
      id: requestId,
      method: ctx.method,
      url: ctx.url,
      path: ctx.path,
      userAgent: ctx.get('user-agent') || 'unknown',
      ip: ctx.ip || 'unknown',
      timestamp: Date.now(),
      startTime: startTime,
      startMemory: startMemory
    };

    try {
      // Execute the request
      await next();
      
      // Calculate response time
      const endTime = process.hrtime.bigint();
      const responseTime = Number((endTime - startTime) / 1000000n); // Convert to milliseconds
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      // Record successful request
      const requestData = {
        ...requestInfo,
        responseTime,
        statusCode: ctx.status,
        memoryDelta,
        endMemory,
        success: ctx.status < 400,
        responseSize: ctx.length || 0
      };

      // Store request data
      metrics.requests.push(requestData);
      metrics.totalRequests++;

      // Update endpoint statistics
      const endpointKey = `${ctx.method} ${ctx.path}`;
      if (!metrics.endpointStats.has(endpointKey)) {
        metrics.endpointStats.set(endpointKey, {
          count: 0,
          totalResponseTime: 0,
          errors: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          memoryUsage: 0
        });
      }

      const endpointStat = metrics.endpointStats.get(endpointKey);
      endpointStat.count++;
      endpointStat.totalResponseTime += responseTime;
      endpointStat.minResponseTime = Math.min(endpointStat.minResponseTime, responseTime);
      endpointStat.maxResponseTime = Math.max(endpointStat.maxResponseTime, responseTime);
      endpointStat.memoryUsage += memoryDelta;

      // Update response times map for percentile calculations
      if (!metrics.responseTimesMap.has(endpointKey)) {
        metrics.responseTimesMap.set(endpointKey, []);
      }
      const responseTimes = metrics.responseTimesMap.get(endpointKey);
      responseTimes.push(responseTime);
      
      // Keep only last 1000 response times per endpoint
      if (responseTimes.length > 1000) {
        responseTimes.splice(0, responseTimes.length - 1000);
      }

      // Log slow requests
      if (responseTime > 2000) {
        strapi.log.warn(`Slow request detected: ${endpointKey} took ${responseTime}ms`, {
          requestId,
          responseTime,
          memoryDelta: `${Math.round(memoryDelta / 1024 / 1024 * 100) / 100}MB`,
          url: ctx.url
        });
      }

    } catch (error) {
      // Calculate response time even for errors
      const endTime = process.hrtime.bigint();
      const responseTime = Number((endTime - startTime) / 1000000n);
      const endMemory = process.memoryUsage();

      // Record error
      const errorData = {
        ...requestInfo,
        responseTime,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        statusCode: ctx.status || 500,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed
      };

      metrics.errors.push(errorData);
      metrics.totalErrors++;

      // Update endpoint error statistics
      const endpointKey = `${ctx.method} ${ctx.path}`;
      if (metrics.endpointStats.has(endpointKey)) {
        metrics.endpointStats.get(endpointKey).errors++;
      }

      // Log error with context
      strapi.log.error(`Request error: ${endpointKey}`, {
        requestId,
        error: error.message,
        responseTime,
        stack: error.stack
      });

      // Re-throw error to maintain normal error handling
      throw error;
    }
  };
};

// Export metrics accessor functions
module.exports.getMetrics = () => {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const minuteAgo = now - 60 * 1000;

  // Calculate aggregated metrics
  const recentRequests = metrics.requests.filter(req => req.timestamp > hourAgo);
  const recentErrors = metrics.errors.filter(err => err.timestamp > hourAgo);

  // Calculate response time percentiles
  const allResponseTimes = metrics.requests.map(req => req.responseTime).sort((a, b) => a - b);
  const p95Index = Math.floor(allResponseTimes.length * 0.95);
  const p99Index = Math.floor(allResponseTimes.length * 0.99);

  // Calculate requests per second
  const requestsLastMinute = metrics.requests.filter(req => req.timestamp > minuteAgo).length;
  const requestsPerSecond = requestsLastMinute / 60;

  // Top endpoints by usage
  const topEndpoints = Array.from(metrics.endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
      errorRate: stats.errors / stats.count,
      minResponseTime: stats.minResponseTime === Infinity ? 0 : stats.minResponseTime,
      maxResponseTime: stats.maxResponseTime
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    requestsPerSecond,
    errorRate: metrics.totalRequests > 0 ? metrics.totalErrors / metrics.totalRequests : 0,
    avgResponseTime: allResponseTimes.length > 0 ? 
      Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length) : 0,
    p95ResponseTime: allResponseTimes.length > 0 ? Math.round(allResponseTimes[p95Index] || 0) : 0,
    p99ResponseTime: allResponseTimes.length > 0 ? Math.round(allResponseTimes[p99Index] || 0) : 0,
    recentRequests: recentRequests.length,
    recentErrors: recentErrors.length,
    topEndpoints,
    endpoints: Object.fromEntries(metrics.endpointStats),
    uptime: Math.round((now - metrics.startTime) / 1000),
    memoryTrend: metrics.memorySnapshots.slice(-10), // Last 10 minutes
    timestamp: now
  };
};

module.exports.getRealtimeMetrics = () => {
  const now = Date.now();
  const lastMinute = now - 60 * 1000;
  const last5Minutes = now - 5 * 60 * 1000;

  const recentRequests = metrics.requests.filter(req => req.timestamp > lastMinute);
  const recent5MinRequests = metrics.requests.filter(req => req.timestamp > last5Minutes);

  return {
    currentRPS: recentRequests.length / 60,
    last5MinRPS: recent5MinRequests.length / 300,
    activeRequests: recentRequests.length,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime(),
    timestamp: now
  };
};

module.exports.reset = () => {
  metrics.requests = [];
  metrics.errors = [];
  metrics.responseTimesMap.clear();
  metrics.endpointStats.clear();
  metrics.totalRequests = 0;
  metrics.totalErrors = 0;
  metrics.memorySnapshots = [];
  metrics.startTime = Date.now();
};
