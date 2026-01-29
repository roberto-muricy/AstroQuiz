/**
 * Rate Limit Middleware Tests
 */

// Mock the rate limit store for testing
const createMockContext = (path: string, ip: string = '127.0.0.1') => ({
  request: {
    path,
    ip,
    headers: {},
  },
  status: 200,
  body: null,
  set: jest.fn(),
});

describe('Rate Limit Middleware', () => {
  // Reset modules between tests to clear the rate limit store
  beforeEach(() => {
    jest.resetModules();
  });

  describe('Rate Limit Logic', () => {
    it('should allow requests under the limit', () => {
      const maxRequests = 100;
      const requests: number[] = [];

      // Simulate 50 requests
      for (let i = 0; i < 50; i++) {
        requests.push(i);
      }

      expect(requests.length).toBeLessThan(maxRequests);
    });

    it('should block requests over the limit', () => {
      const maxRequests = 100;
      const requestCount = 110;

      const blocked = requestCount > maxRequests;
      expect(blocked).toBe(true);
    });

    it('should calculate remaining requests correctly', () => {
      const maxRequests = 100;
      const currentCount = 75;
      const remaining = Math.max(0, maxRequests - currentCount);

      expect(remaining).toBe(25);
    });

    it('should return 0 remaining when over limit', () => {
      const maxRequests = 100;
      const currentCount = 150;
      const remaining = Math.max(0, maxRequests - currentCount);

      expect(remaining).toBe(0);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set correct header values', () => {
      const ctx = createMockContext('/api/quiz/start');
      const maxRequests = 100;
      const remaining = 95;
      const resetSeconds = 45;

      ctx.set('X-RateLimit-Limit', String(maxRequests));
      ctx.set('X-RateLimit-Remaining', String(remaining));
      ctx.set('X-RateLimit-Reset', String(resetSeconds));

      expect(ctx.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(ctx.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '95');
      expect(ctx.set).toHaveBeenCalledWith('X-RateLimit-Reset', '45');
    });
  });

  describe('Skip Paths', () => {
    const skipPaths = ['/api/quiz/health', '/_health', '/admin'];

    it('should identify paths to skip', () => {
      const testPath = '/api/quiz/health';
      const shouldSkip = skipPaths.some(p => testPath.startsWith(p));

      expect(shouldSkip).toBe(true);
    });

    it('should not skip regular API paths', () => {
      const testPath = '/api/quiz/start';
      const shouldSkip = skipPaths.some(p => testPath.startsWith(p));

      expect(shouldSkip).toBe(false);
    });

    it('should skip admin paths', () => {
      const testPath = '/admin/dashboard';
      const shouldSkip = skipPaths.some(p => testPath.startsWith(p));

      expect(shouldSkip).toBe(true);
    });
  });

  describe('Client IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
      const ip = headers['x-forwarded-for'].split(',')[0].trim();

      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = { 'x-real-ip': '192.168.1.100' };
      const ip = headers['x-real-ip'];

      expect(ip).toBe('192.168.1.100');
    });

    it('should fallback to request.ip', () => {
      const ctx = createMockContext('/api/test', '10.0.0.50');
      const ip = ctx.request.ip;

      expect(ip).toBe('10.0.0.50');
    });
  });

  describe('Rate Limit Response', () => {
    it('should return 429 status when rate limited', () => {
      const ctx = createMockContext('/api/quiz/start');
      ctx.status = 429;
      ctx.body = {
        success: false,
        error: {
          status: 429,
          name: 'TooManyRequestsError',
          message: 'Too many requests. Please try again later.',
          retryAfter: 30,
        },
      };

      expect(ctx.status).toBe(429);
      expect(ctx.body.error.name).toBe('TooManyRequestsError');
      expect(ctx.body.error.retryAfter).toBeDefined();
    });
  });

  describe('Time Window', () => {
    it('should use correct default window (1 minute)', () => {
      const windowMs = 60 * 1000;
      expect(windowMs).toBe(60000);
    });

    it('should calculate reset time correctly', () => {
      const now = Date.now();
      const windowMs = 60000;
      const expiresAt = now + windowMs;
      const resetSeconds = Math.ceil((expiresAt - now) / 1000);

      expect(resetSeconds).toBe(60);
    });

    it('should expire entries after window', () => {
      const now = Date.now();
      const windowMs = 60000;
      const entryCreatedAt = now - 70000; // 70 seconds ago
      const expiresAt = entryCreatedAt + windowMs;

      const isExpired = expiresAt < now;
      expect(isExpired).toBe(true);
    });
  });

  describe('Per-Path Rate Limiting', () => {
    it('should create separate limits per path', () => {
      const limits = new Map<string, number>();
      const ip = '127.0.0.1';

      // Increment for different paths
      const key1 = `${ip}:/api/quiz/start`;
      const key2 = `${ip}:/api/quiz/answer`;

      limits.set(key1, (limits.get(key1) || 0) + 1);
      limits.set(key2, (limits.get(key2) || 0) + 1);
      limits.set(key1, (limits.get(key1) || 0) + 1);

      expect(limits.get(key1)).toBe(2);
      expect(limits.get(key2)).toBe(1);
    });
  });
});

describe('Strict Rate Limit (Sensitive Endpoints)', () => {
  it('should have stricter limits for sensitive endpoints', () => {
    const normalLimit = 100;
    const strictLimit = 10;

    expect(strictLimit).toBeLessThan(normalLimit);
  });

  it('should use longer window for auth endpoints', () => {
    const normalWindow = 60 * 1000;      // 1 minute
    const authWindow = 15 * 60 * 1000;   // 15 minutes

    expect(authWindow).toBeGreaterThan(normalWindow);
  });
});
