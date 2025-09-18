/**
 * 📝 Structured Logging Service
 * Advanced logging system with structured data and multiple outputs
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  VERBOSE: 4,
  DEBUG: 5,
  SILLY: 6
};

// Log colors for console output
const LOG_COLORS = {
  ERROR: '\x1b[31m',   // Red
  WARN: '\x1b[33m',    // Yellow
  INFO: '\x1b[36m',    // Cyan
  HTTP: '\x1b[35m',    // Magenta
  VERBOSE: '\x1b[34m', // Blue
  DEBUG: '\x1b[32m',   // Green
  SILLY: '\x1b[37m',   // White
  RESET: '\x1b[0m'     // Reset
};

class StructuredLogger {
  constructor(options = {}) {
    this.level = options.level || 'INFO';
    this.service = options.service || 'AstroQuiz';
    this.version = options.version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
    
    // Output configuration
    this.outputs = {
      console: options.console !== false,
      file: options.file !== false,
      json: options.json || false
    };
    
    // File logging configuration
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Log rotation
    this.currentLogFile = null;
    this.logFileSize = 0;
    
    // Performance tracking
    this.logStats = {
      total: 0,
      byLevel: {},
      errors: 0,
      startTime: Date.now()
    };
    
    // Initialize log files
    this.initializeLogFiles();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  initializeLogFiles() {
    const timestamp = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.logDir, `astroquiz-${timestamp}.log`);
    
    // Check current file size
    if (fs.existsSync(this.currentLogFile)) {
      const stats = fs.statSync(this.currentLogFile);
      this.logFileSize = stats.size;
    }
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.service,
      version: this.version,
      environment: this.environment,
      message,
      ...meta
    };

    // Add context information
    if (meta.requestId) {
      logEntry.requestId = meta.requestId;
    }
    
    if (meta.userId) {
      logEntry.userId = meta.userId;
    }
    
    if (meta.endpoint) {
      logEntry.endpoint = meta.endpoint;
    }
    
    if (meta.responseTime) {
      logEntry.responseTime = meta.responseTime;
    }
    
    if (meta.error) {
      logEntry.error = {
        message: meta.error.message,
        stack: meta.error.stack,
        name: meta.error.name
      };
    }

    return logEntry;
  }

  formatConsoleOutput(logEntry) {
    const color = LOG_COLORS[logEntry.level] || LOG_COLORS.INFO;
    const reset = LOG_COLORS.RESET;
    
    let output = `${color}[${logEntry.timestamp}] ${logEntry.level}${reset}: ${logEntry.message}`;
    
    // Add context information
    const context = [];
    if (logEntry.requestId) context.push(`req:${logEntry.requestId}`);
    if (logEntry.endpoint) context.push(`${logEntry.endpoint}`);
    if (logEntry.responseTime) context.push(`${logEntry.responseTime}ms`);
    
    if (context.length > 0) {
      output += ` [${context.join(' | ')}]`;
    }
    
    // Add error details
    if (logEntry.error) {
      output += `\n  Error: ${logEntry.error.message}`;
      if (this.environment === 'development' && logEntry.error.stack) {
        output += `\n  Stack: ${logEntry.error.stack}`;
      }
    }
    
    return output;
  }

  async writeToFile(logEntry) {
    if (!this.outputs.file) return;
    
    try {
      // Check if log rotation is needed
      if (this.logFileSize > this.maxFileSize) {
        await this.rotateLogFile();
      }
      
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Append to current log file
      fs.appendFileSync(this.currentLogFile, logLine);
      this.logFileSize += logLine.length;
      
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async rotateLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
    
    try {
      // Rename current log file
      if (fs.existsSync(this.currentLogFile)) {
        fs.renameSync(this.currentLogFile, rotatedFile);
      }
      
      // Reset current log file
      this.logFileSize = 0;
      
      // Clean up old log files
      await this.cleanupOldLogs();
      
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  async cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('astroquiz-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stats: fs.statSync(path.join(this.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);
      
      // Remove old log files beyond maxFiles limit
      if (logFiles.length > this.maxFiles) {
        const filesToDelete = logFiles.slice(this.maxFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    
    // Update statistics
    this.logStats.total++;
    this.logStats.byLevel[level] = (this.logStats.byLevel[level] || 0) + 1;
    if (level === 'ERROR') this.logStats.errors++;
    
    // Format log entry
    const logEntry = this.formatMessage(level, message, meta);
    
    // Output to console
    if (this.outputs.console) {
      const consoleOutput = this.formatConsoleOutput(logEntry);
      console.log(consoleOutput);
    }
    
    // Write to file
    this.writeToFile(logEntry);
    
    return logEntry;
  }

  // Convenience methods
  error(message, meta = {}) {
    return this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    return this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    return this.log('INFO', message, meta);
  }

  http(message, meta = {}) {
    return this.log('HTTP', message, meta);
  }

  verbose(message, meta = {}) {
    return this.log('VERBOSE', message, meta);
  }

  debug(message, meta = {}) {
    return this.log('DEBUG', message, meta);
  }

  silly(message, meta = {}) {
    return this.log('SILLY', message, meta);
  }

  // Request logging
  logRequest(ctx, responseTime) {
    const meta = {
      requestId: ctx.requestId,
      method: ctx.method,
      url: ctx.url,
      userAgent: ctx.get('user-agent'),
      ip: ctx.ip,
      statusCode: ctx.status,
      responseTime,
      endpoint: `${ctx.method} ${ctx.path}`
    };
    
    const level = ctx.status >= 500 ? 'ERROR' : 
                  ctx.status >= 400 ? 'WARN' : 'HTTP';
    
    const message = `${ctx.method} ${ctx.url} ${ctx.status} ${responseTime}ms`;
    
    return this.log(level, message, meta);
  }

  // Error logging with stack trace
  logError(error, context = {}) {
    return this.error(error.message, {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      }
    });
  }

  // Performance logging
  logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'WARN' : 'INFO';
    const message = `${operation} completed in ${duration}ms`;
    
    return this.log(level, message, {
      ...meta,
      operation,
      duration,
      performance: true
    });
  }

  // Database query logging
  logDatabaseQuery(query, duration, meta = {}) {
    const level = duration > 1000 ? 'WARN' : 'DEBUG';
    const message = `Database query: ${query.slice(0, 100)}${query.length > 100 ? '...' : ''}`;
    
    return this.log(level, message, {
      ...meta,
      query,
      duration,
      database: true
    });
  }

  // User activity logging
  logUserActivity(userId, action, meta = {}) {
    return this.info(`User activity: ${action}`, {
      ...meta,
      userId,
      action,
      userActivity: true
    });
  }

  // Security event logging
  logSecurityEvent(event, severity = 'WARN', meta = {}) {
    return this.log(severity, `Security event: ${event}`, {
      ...meta,
      securityEvent: event,
      security: true
    });
  }

  // Business logic logging
  logBusinessEvent(event, meta = {}) {
    return this.info(`Business event: ${event}`, {
      ...meta,
      businessEvent: event,
      business: true
    });
  }

  // Get logging statistics
  getStats() {
    const uptime = Date.now() - this.logStats.startTime;
    
    return {
      ...this.logStats,
      uptime,
      logsPerMinute: this.logStats.total / (uptime / 60000),
      errorRate: this.logStats.total > 0 ? (this.logStats.errors / this.logStats.total) * 100 : 0,
      currentLogFile: this.currentLogFile,
      logFileSize: this.logFileSize
    };
  }

  // Export logs for analysis
  async exportLogs(startDate, endDate, format = 'json') {
    try {
      const logs = [];
      const files = fs.readdirSync(this.logDir);
      
      for (const file of files) {
        if (file.startsWith('astroquiz-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line);
              const logDate = new Date(logEntry.timestamp);
              
              if ((!startDate || logDate >= startDate) && (!endDate || logDate <= endDate)) {
                logs.push(logEntry);
              }
            } catch (error) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      // Sort by timestamp
      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      switch (format) {
        case 'csv':
          return this.formatLogsAsCSV(logs);
        case 'json':
        default:
          return logs;
      }
      
    } catch (error) {
      this.logError(error, { operation: 'exportLogs' });
      throw error;
    }
  }

  formatLogsAsCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = ['timestamp', 'level', 'message', 'requestId', 'endpoint', 'responseTime', 'error'];
    const csvLines = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.requestId || '',
        log.endpoint || '',
        log.responseTime || '',
        log.error ? `"${log.error.message.replace(/"/g, '""')}"` : ''
      ];
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }

  // Graceful shutdown
  async shutdown() {
    this.info('Logger shutting down');
    
    // Final statistics
    const stats = this.getStats();
    this.info('Final logging statistics', stats);
    
    // Ensure all logs are written
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

module.exports = ({ strapi }) => {
  // Create logger instance
  const logger = new StructuredLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'),
    service: 'AstroQuiz-CMS',
    version: '1.0.0',
    console: true,
    file: true,
    logDir: path.join(process.cwd(), 'logs')
  });

  // Add to strapi instance
  strapi.customLogger = logger;

  return {
    // Main logging methods
    log: (level, message, meta) => logger.log(level, message, meta),
    error: (message, meta) => logger.error(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    info: (message, meta) => logger.info(message, meta),
    debug: (message, meta) => logger.debug(message, meta),
    
    // Specialized logging methods
    logRequest: (ctx, responseTime) => logger.logRequest(ctx, responseTime),
    logError: (error, context) => logger.logError(error, context),
    logPerformance: (operation, duration, meta) => logger.logPerformance(operation, duration, meta),
    logDatabaseQuery: (query, duration, meta) => logger.logDatabaseQuery(query, duration, meta),
    logUserActivity: (userId, action, meta) => logger.logUserActivity(userId, action, meta),
    logSecurityEvent: (event, severity, meta) => logger.logSecurityEvent(event, severity, meta),
    logBusinessEvent: (event, meta) => logger.logBusinessEvent(event, meta),
    
    // Utility methods
    getStats: () => logger.getStats(),
    exportLogs: (startDate, endDate, format) => logger.exportLogs(startDate, endDate, format),
    shutdown: () => logger.shutdown(),
    
    // Direct access to logger instance
    logger
  };
};
