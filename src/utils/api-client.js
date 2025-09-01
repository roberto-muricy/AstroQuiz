/**
 * AstroQuiz API Client
 * Comprehensive client for interacting with AstroQuiz Strapi backend
 */

class AstroQuizAPIError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'AstroQuizAPIError';
    this.status = status;
    this.details = details;
  }
}

class AstroQuizAPIClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:1337';
    this.apiPath = options.apiPath || '/api';
    this.timeout = options.timeout || 10000;
    this.defaultLocale = options.defaultLocale || 'en';
    this.apiKey = options.apiKey || null; // For future JWT authentication
    
    // Cache configuration
    this.enableCache = options.enableCache || false;
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    this.cache = new Map();
    
    // Rate limiting
    this.enableRateLimit = options.enableRateLimit || false;
    this.requestsPerSecond = options.requestsPerSecond || 10;
    this.requestQueue = [];
    this.lastRequestTime = 0;
    
    // Initialize fetch with proper error handling
    this.fetch = this._createFetchWrapper();
  }

  /**
   * Create a fetch wrapper with error handling and rate limiting
   */
  _createFetchWrapper() {
    return async (url, options = {}) => {
      // Rate limiting
      if (this.enableRateLimit) {
        await this._enforceRateLimit();
      }

      // Prepare request
      const fullURL = url.startsWith('http') ? url : `${this.baseURL}${this.apiPath}${url}`;
      const config = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      // Add authentication if available
      if (this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      config.signal = controller.signal;

      try {
        const response = await fetch(fullURL, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AstroQuizAPIError(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.error?.details || null
          );
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new AstroQuizAPIError('Request timeout', 408);
        }
        
        if (error instanceof AstroQuizAPIError) {
          throw error;
        }
        
        throw new AstroQuizAPIError(
          error.message || 'Network error',
          0,
          { originalError: error.message }
        );
      }
    };
  }

  /**
   * Rate limiting implementation
   */
  async _enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Cache management
   */
  _getCacheKey(url, params) {
    return `${url}?${new URLSearchParams(params).toString()}`;
  }

  _getFromCache(key) {
    if (!this.enableCache) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    if (!this.enableCache) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Build query string from parameters
   */
  _buildQueryString(params) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    return searchParams.toString();
  }

  // ==================== QUESTIONS API ====================

  /**
   * Get all questions with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Questions response
   */
  async getQuestions(options = {}) {
    const params = {
      locale: options.locale || this.defaultLocale,
      'pagination[page]': options.page || 1,
      'pagination[pageSize]': options.pageSize || 25,
      ...options.filters && this._buildFilters(options.filters),
      ...options.sort && { sort: options.sort },
      ...options.populate && { populate: options.populate }
    };

    const queryString = this._buildQueryString(params);
    const url = `/questions${queryString ? `?${queryString}` : ''}`;
    
    // Check cache
    const cacheKey = this._getCacheKey('/questions', params);
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const response = await this.fetch(url);
    
    // Cache successful responses
    this._setCache(cacheKey, response);
    
    return response;
  }

  /**
   * Get a single question by ID
   * @param {string} id - Question document ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Question response
   */
  async getQuestion(id, options = {}) {
    if (!id) {
      throw new AstroQuizAPIError('Question ID is required', 400);
    }

    const params = {
      locale: options.locale || this.defaultLocale,
      ...options.populate && { populate: options.populate }
    };

    const queryString = this._buildQueryString(params);
    const url = `/questions/${id}${queryString ? `?${queryString}` : ''}`;
    
    return await this.fetch(url);
  }

  /**
   * Get random questions for quiz
   * @param {Object} options - Options for random selection
   * @returns {Promise<Array>} Array of random questions
   */
  async getRandomQuestions(options = {}) {
    const {
      count = 10,
      locale = this.defaultLocale,
      level = null,
      topic = null,
      excludeIds = []
    } = options;

    // Get a larger pool to select from
    const poolSize = Math.max(count * 3, 50);
    const filters = {};
    
    if (level) filters.level = { $eq: level };
    if (topic) filters.topic = { $eq: topic };
    if (excludeIds.length > 0) {
      filters.documentId = { $notIn: excludeIds };
    }

    const response = await this.getQuestions({
      locale,
      pageSize: poolSize,
      filters,
      sort: 'id:asc' // Deterministic for caching
    });

    // Shuffle and return requested count
    const shuffled = response.data.sort(() => Math.random() - 0.5);
    return {
      ...response,
      data: shuffled.slice(0, count)
    };
  }

  /**
   * Build filters object for Strapi API
   * @param {Object} filters - Filter conditions
   * @returns {Object} Strapi-formatted filters
   */
  _buildFilters(filters) {
    const strapiFilters = {};
    
    Object.entries(filters).forEach(([field, condition]) => {
      if (typeof condition === 'object' && condition !== null) {
        Object.entries(condition).forEach(([operator, value]) => {
          strapiFilters[`filters[${field}][${operator}]`] = value;
        });
      } else {
        strapiFilters[`filters[${field}][$eq]`] = condition;
      }
    });
    
    return strapiFilters;
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Get questions by topic
   * @param {string} topic - Topic name
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Questions response
   */
  async getQuestionsByTopic(topic, options = {}) {
    return this.getQuestions({
      ...options,
      filters: { topic: { $eq: topic } }
    });
  }

  /**
   * Get questions by level
   * @param {number} level - Difficulty level (1-5)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Questions response
   */
  async getQuestionsByLevel(level, options = {}) {
    return this.getQuestions({
      ...options,
      filters: { level: { $eq: level } }
    });
  }

  /**
   * Get questions by level range
   * @param {number} minLevel - Minimum level
   * @param {number} maxLevel - Maximum level
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Questions response
   */
  async getQuestionsByLevelRange(minLevel, maxLevel, options = {}) {
    return this.getQuestions({
      ...options,
      filters: { 
        level: { 
          $gte: minLevel, 
          $lte: maxLevel 
        } 
      }
    });
  }

  /**
   * Search questions by text content
   * @param {string} searchTerm - Search term
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Questions response
   */
  async searchQuestions(searchTerm, options = {}) {
    return this.getQuestions({
      ...options,
      filters: {
        $or: [
          { question: { $containsi: searchTerm } },
          { explanation: { $containsi: searchTerm } },
          { topic: { $containsi: searchTerm } }
        ]
      }
    });
  }

  /**
   * Get available topics
   * @param {string} locale - Locale
   * @returns {Promise<Array>} Array of unique topics
   */
  async getTopics(locale = this.defaultLocale) {
    const response = await this.getQuestions({
      locale,
      pageSize: 100,
      fields: ['topic']
    });

    const topics = [...new Set(response.data.map(q => q.topic))];
    return topics.sort();
  }

  /**
   * Get question statistics
   * @param {string} locale - Locale
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics(locale = this.defaultLocale) {
    const response = await this.getQuestions({
      locale,
      pageSize: 1
    });

    const total = response.meta.pagination.total;
    
    // Get level distribution
    const levelStats = {};
    for (let level = 1; level <= 5; level++) {
      const levelResponse = await this.getQuestions({
        locale,
        pageSize: 1,
        filters: { level: { $eq: level } }
      });
      levelStats[level] = levelResponse.meta.pagination.total;
    }

    return {
      total,
      levelDistribution: levelStats,
      topics: await this.getTopics(locale)
    };
  }

  // ==================== DEEPL TRANSLATION API ====================

  /**
   * Translate text using DeepL
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code
   * @param {string} sourceLang - Source language code
   * @returns {Promise<Object>} Translation response
   */
  async translateText(text, targetLang, sourceLang = 'EN') {
    if (!text) {
      throw new AstroQuizAPIError('Text is required for translation', 400);
    }

    const data = {
      text,
      targetLang,
      sourceLang
    };

    return await this.fetch('/deepl/translate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Translate a question to target language
   * @param {string} questionId - Question document ID
   * @param {string} targetLang - Target language code
   * @param {Array} fields - Fields to translate
   * @returns {Promise<Object>} Translation response
   */
  async translateQuestion(questionId, targetLang, fields = null) {
    if (!questionId) {
      throw new AstroQuizAPIError('Question ID is required for translation', 400);
    }

    const data = {
      targetLang,
      ...(fields && { fields })
    };

    return await this.fetch(`/deepl/translate-question/${questionId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.apiKey = token;
  }

  /**
   * Remove authentication token
   */
  removeAuthToken() {
    this.apiKey = null;
  }

  /**
   * Get client configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      apiPath: this.apiPath,
      timeout: this.timeout,
      defaultLocale: this.defaultLocale,
      enableCache: this.enableCache,
      enableRateLimit: this.enableRateLimit,
      hasAuthToken: !!this.apiKey
    };
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.getQuestions({ pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ==================== FACTORY FUNCTIONS ====================

/**
 * Create a new AstroQuiz API client with default settings
 * @param {Object} options - Configuration options
 * @returns {AstroQuizAPIClient} API client instance
 */
function createAstroQuizClient(options = {}) {
  return new AstroQuizAPIClient(options);
}

/**
 * Create a cached API client for better performance
 * @param {Object} options - Configuration options
 * @returns {AstroQuizAPIClient} Cached API client instance
 */
function createCachedClient(options = {}) {
  return new AstroQuizAPIClient({
    enableCache: true,
    cacheTimeout: 300000, // 5 minutes
    ...options
  });
}

/**
 * Create a rate-limited API client
 * @param {Object} options - Configuration options
 * @returns {AstroQuizAPIClient} Rate-limited API client instance
 */
function createRateLimitedClient(options = {}) {
  return new AstroQuizAPIClient({
    enableRateLimit: true,
    requestsPerSecond: 5,
    ...options
  });
}

// ==================== EXPORTS ====================

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AstroQuizAPIClient,
    AstroQuizAPIError,
    createAstroQuizClient,
    createCachedClient,
    createRateLimitedClient
  };
}

// For browser environments
if (typeof window !== 'undefined') {
  window.AstroQuizAPIClient = AstroQuizAPIClient;
  window.AstroQuizAPIError = AstroQuizAPIError;
  window.createAstroQuizClient = createAstroQuizClient;
  window.createCachedClient = createCachedClient;
  window.createRateLimitedClient = createRateLimitedClient;
}

// For ES6 modules
export {
  AstroQuizAPIClient,
  AstroQuizAPIError,
  createAstroQuizClient,
  createCachedClient,
  createRateLimitedClient
};
