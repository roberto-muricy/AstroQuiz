/**
 * 🚀 Intelligent Caching Middleware
 * Memory-based caching system for API responses
 */

'use strict';

// In-memory cache storage
const cache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  size: 0
};

// Cache configuration
const config = {
  defaultTTL: 300000, // 5 minutes in milliseconds
  maxSize: 1000, // Maximum number of cached items
  cleanupInterval: 60000, // 1 minute
  
  // TTL by endpoint pattern
  endpointTTL: {
    '/api/questions': 300000, // 5 minutes
    '/api/questions/': 3600000, // 1 hour for single questions
    '/api/analytics': 60000, // 1 minute
    '/api/health': 30000, // 30 seconds
    '/api/quiz': 180000 // 3 minutes
  },
  
  // Cache strategies by endpoint
  strategies: {
    '/api/questions': 'query-based', // Cache based on query parameters
    '/api/analytics': 'time-based', // Cache for fixed time
    '/api/health': 'always-fresh', // Always fetch fresh
    '/api/quiz': 'user-based' // Cache per user/session
  }
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  cacheStats.size = cache.size;
  
  if (cleaned > 0) {
    strapi?.log?.debug(`Cache cleanup: removed ${cleaned} expired entries`);
  }
}, config.cleanupInterval);

// LRU eviction when cache is full
function evictLRU() {
  if (cache.size >= config.maxSize) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
      cacheStats.deletes++;
    }
  }
}

// Generate cache key based on request
function generateCacheKey(ctx) {
  const { method, path, query } = ctx;
  
  // Don't cache non-GET requests
  if (method !== 'GET') {
    return null;
  }
  
  // Sort query parameters for consistent keys
  const sortedQuery = Object.keys(query || {})
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  const baseKey = `${method}:${path}`;
  return sortedQuery ? `${baseKey}?${sortedQuery}` : baseKey;
}

// Determine TTL based on endpoint
function getTTL(path) {
  // Check exact matches first
  if (config.endpointTTL[path]) {
    return config.endpointTTL[path];
  }
  
  // Check pattern matches
  for (const [pattern, ttl] of Object.entries(config.endpointTTL)) {
    if (path.startsWith(pattern)) {
      return ttl;
    }
  }
  
  return config.defaultTTL;
}

// Check if endpoint should be cached
function shouldCache(ctx) {
  const { method, path } = ctx;
  
  // Only cache GET requests
  if (method !== 'GET') {
    return false;
  }
  
  // Don't cache admin routes
  if (path.startsWith('/admin')) {
    return false;
  }
  
  // Don't cache authentication routes
  if (path.includes('/auth/') || path.includes('/login')) {
    return false;
  }
  
  // Don't cache real-time endpoints
  if (path.includes('/realtime') || path.includes('/live')) {
    return false;
  }
  
  // Check if endpoint has always-fresh strategy
  const strategy = config.strategies[path] || 
                   Object.keys(config.strategies).find(pattern => path.startsWith(pattern));
  
  return strategy !== 'always-fresh';
}

// Invalidate cache entries by pattern
function invalidateByPattern(pattern) {
  let invalidated = 0;
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      invalidated++;
    }
  }
  
  cacheStats.deletes += invalidated;
  cacheStats.size = cache.size;
  
  return invalidated;
}

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Skip caching if not applicable
    if (!shouldCache(ctx)) {
      return await next();
    }
    
    const cacheKey = generateCacheKey(ctx);
    if (!cacheKey) {
      return await next();
    }
    
    // Check for cached response
    const cachedEntry = cache.get(cacheKey);
    const now = Date.now();
    
    if (cachedEntry && cachedEntry.expiresAt > now) {
      // Cache hit
      cacheStats.hits++;
      
      // Set response from cache
      ctx.status = cachedEntry.status;
      ctx.body = cachedEntry.body;
      ctx.set(cachedEntry.headers);
      ctx.set('X-Cache', 'HIT');
      ctx.set('X-Cache-TTL', Math.round((cachedEntry.expiresAt - now) / 1000));
      
      strapi.log.debug(`Cache hit for ${cacheKey}`);
      return;
    }
    
    // Cache miss - execute request
    cacheStats.misses++;
    
    try {
      await next();
      
      // Cache successful responses
      if (ctx.status >= 200 && ctx.status < 300 && ctx.body) {
        evictLRU(); // Make room if needed
        
        const ttl = getTTL(ctx.path);
        const cacheEntry = {
          status: ctx.status,
          body: ctx.body,
          headers: { ...ctx.response.headers },
          createdAt: now,
          expiresAt: now + ttl,
          ttl: ttl,
          key: cacheKey
        };
        
        cache.set(cacheKey, cacheEntry);
        cacheStats.sets++;
        cacheStats.size = cache.size;
        
        // Add cache headers
        ctx.set('X-Cache', 'MISS');
        ctx.set('X-Cache-TTL', Math.round(ttl / 1000));
        
        strapi.log.debug(`Cached response for ${cacheKey} (TTL: ${ttl}ms)`);
      }
      
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
};

// Export cache management functions
module.exports.getStats = () => ({
  ...cacheStats,
  hitRate: cacheStats.hits + cacheStats.misses > 0 ? 
    (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100 : 0,
  totalEntries: cache.size,
  memoryUsage: cache.size * 1024, // Rough estimate
  config: {
    maxSize: config.maxSize,
    defaultTTL: config.defaultTTL,
    cleanupInterval: config.cleanupInterval
  }
});

module.exports.clear = () => {
  const clearedCount = cache.size;
  cache.clear();
  cacheStats.deletes += clearedCount;
  cacheStats.size = 0;
  return clearedCount;
};

module.exports.invalidate = (pattern) => {
  return invalidateByPattern(pattern);
};

module.exports.get = (key) => {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry;
  }
  return null;
};

module.exports.set = (key, value, ttl = config.defaultTTL) => {
  evictLRU();
  
  const entry = {
    ...value,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
    ttl: ttl,
    key: key
  };
  
  cache.set(key, entry);
  cacheStats.sets++;
  cacheStats.size = cache.size;
  
  return entry;
};

module.exports.delete = (key) => {
  const deleted = cache.delete(key);
  if (deleted) {
    cacheStats.deletes++;
    cacheStats.size = cache.size;
  }
  return deleted;
};

module.exports.keys = () => {
  return Array.from(cache.keys());
};

module.exports.entries = () => {
  const now = Date.now();
  const validEntries = [];
  
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt > now) {
      validEntries.push({
        key,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        ttl: entry.ttl,
        size: JSON.stringify(entry.body).length
      });
    }
  }
  
  return validEntries;
};

// Cache warming functions
module.exports.warmCache = async (strapi) => {
  const warmupEndpoints = [
    '/api/questions?pagination[limit]=25',
    '/api/questions?filters[locale][$eq]=en&pagination[limit]=25',
    '/api/questions?filters[locale][$eq]=pt&pagination[limit]=25',
    '/api/questions?filters[locale][$eq]=es&pagination[limit]=25',
    '/api/questions?filters[locale][$eq]=fr&pagination[limit]=25',
    '/api/analytics/questions'
  ];
  
  let warmed = 0;
  
  for (const endpoint of warmupEndpoints) {
    try {
      // Simulate request to warm cache
      const mockCtx = {
        method: 'GET',
        path: endpoint.split('?')[0],
        query: endpoint.includes('?') ? 
          Object.fromEntries(new URLSearchParams(endpoint.split('?')[1])) : {}
      };
      
      // This would need actual implementation based on your routing
      strapi.log.info(`Cache warming: ${endpoint}`);
      warmed++;
      
    } catch (error) {
      strapi.log.warn(`Cache warming failed for ${endpoint}:`, error.message);
    }
  }
  
  strapi.log.info(`Cache warmed with ${warmed} endpoints`);
  return warmed;
};
