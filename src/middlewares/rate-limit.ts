/**
 * Rate Limiting Middleware
 * Limits requests per IP to prevent API abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for multiple instances)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Error message
  skipPaths?: string[];  // Paths to skip rate limiting
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 100,      // 100 requests per minute
  message: 'Too many requests. Please try again later.',
  skipPaths: ['/api/quiz/health', '/_health'],
};

/**
 * Get client IP from request
 */
function getClientIp(ctx: any): string {
  // Check common proxy headers
  const forwarded = ctx.request.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = ctx.request.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  return ctx.request.ip || 'unknown';
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return async (ctx: any, next: () => Promise<void>) => {
    const path = ctx.request.path;

    // Skip rate limiting for certain paths
    if (cfg.skipPaths?.some(p => path.startsWith(p))) {
      await next();
      return;
    }

    const clientIp = getClientIp(ctx);
    const key = `${clientIp}:${path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      entry = {
        count: 1,
        resetAt: now + cfg.windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, cfg.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    ctx.set('X-RateLimit-Limit', String(cfg.maxRequests));
    ctx.set('X-RateLimit-Remaining', String(remaining));
    ctx.set('X-RateLimit-Reset', String(resetSeconds));

    // Check if over limit
    if (entry.count > cfg.maxRequests) {
      ctx.status = 429;
      ctx.body = {
        success: false,
        error: {
          status: 429,
          name: 'TooManyRequestsError',
          message: cfg.message,
          retryAfter: resetSeconds,
        },
      };
      return;
    }

    await next();
  };
}

/**
 * Create stricter rate limit for sensitive endpoints
 */
export function createStrictRateLimitMiddleware() {
  return createRateLimitMiddleware({
    windowMs: 60 * 1000,   // 1 minute
    maxRequests: 10,       // Only 10 requests per minute
    message: 'Rate limit exceeded for this endpoint. Please wait.',
  });
}

/**
 * Create rate limit for authentication endpoints
 */
export function createAuthRateLimitMiddleware() {
  return createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 min
    message: 'Too many authentication attempts. Please try again later.',
  });
}
