/**
 * Global Error Handler Middleware
 *
 * - Catches all unhandled errors
 * - Sanitizes error messages in production (no stack traces, no API keys)
 * - Logs errors for debugging
 * - Reports to Sentry if configured
 */

// Patterns that might contain sensitive data
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /auth[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /bearer/i,
  /authorization/i,
  /deepl/i,
  /firebase/i,
  /cloudinary/i,
  /postgresql?:\/\/[^@]+@/i,  // Database connection strings
];

// Known error types that are safe to expose
const SAFE_ERROR_TYPES = [
  'ValidationError',
  'NotFoundError',
  'UnauthorizedError',
  'ForbiddenError',
  'BadRequestError',
];

/**
 * Check if a string contains sensitive data
 */
function containsSensitiveData(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) return message;

  if (containsSensitiveData(message)) {
    return 'An internal error occurred. Please try again later.';
  }

  // Truncate very long messages
  if (message.length > 500) {
    return message.substring(0, 500) + '...';
  }

  return message;
}

/**
 * Create a safe error response for clients
 */
function createSafeErrorResponse(error: any, isProduction: boolean): {
  status: number;
  name: string;
  message: string;
  details?: any;
} {
  const status = error.status || error.statusCode || 500;
  const name = error.name || 'InternalServerError';
  let message = error.message || 'An unexpected error occurred';

  // Sanitize message
  message = sanitizeErrorMessage(message, isProduction);

  // In production, only include details for safe error types
  const includeDetails = !isProduction || SAFE_ERROR_TYPES.includes(name);

  const response: any = {
    status,
    name,
    message,
  };

  // Include validation details if safe
  if (includeDetails && error.details) {
    response.details = error.details;
  }

  return response;
}

/**
 * Log error with context (safe for all environments)
 */
function logError(strapi: any, error: any, ctx: any): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    status: error.status || error.statusCode || 500,
    path: ctx.request?.path,
    method: ctx.request?.method,
    ip: ctx.request?.ip,
    userAgent: ctx.request?.headers?.['user-agent'],
    // Don't log full stack in production logs (it goes to Sentry)
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
  };

  // Log at appropriate level
  if (errorInfo.status >= 500) {
    strapi.log.error('Server error:', errorInfo);
  } else if (errorInfo.status >= 400) {
    strapi.log.warn('Client error:', errorInfo);
  }
}

/**
 * Report to Sentry if available
 */
function reportToSentry(error: any, ctx: any): void {
  try {
    // Dynamic import to avoid errors if Sentry is not installed
    const Sentry = require('@sentry/node');

    if (Sentry && typeof Sentry.captureException === 'function') {
      Sentry.withScope((scope: any) => {
        scope.setTag('path', ctx.request?.path);
        scope.setTag('method', ctx.request?.method);
        scope.setTag('status', error.status || 500);
        scope.setUser({ ip_address: ctx.request?.ip });
        scope.setExtra('query', ctx.request?.query);
        scope.setExtra('body', sanitizeBody(ctx.request?.body));

        Sentry.captureException(error);
      });
    }
  } catch (e) {
    // Sentry not configured, ignore
  }
}

/**
 * Sanitize request body for logging (remove sensitive fields)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create the error handler middleware
 */
export function createErrorHandlerMiddleware(strapi: any) {
  const isProduction = process.env.NODE_ENV === 'production';

  return async (ctx: any, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error: any) {
      // Log the error
      logError(strapi, error, ctx);

      // Report to Sentry for 5xx errors
      if ((error.status || 500) >= 500) {
        reportToSentry(error, ctx);
      }

      // Create safe response
      const safeError = createSafeErrorResponse(error, isProduction);

      // Set response
      ctx.status = safeError.status;
      ctx.body = {
        success: false,
        error: safeError,
      };
    }
  };
}

/**
 * Middleware config for Strapi
 */
export default (config: any, { strapi }: { strapi: any }) => {
  return createErrorHandlerMiddleware(strapi);
};
