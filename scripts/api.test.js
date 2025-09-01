const axios = require('axios');

// API Client for testing
class APIClient {
  constructor(baseURL = global.API_BASE_URL, apiPath = global.API_PATH) {
    this.baseURL = baseURL;
    this.apiPath = apiPath;
    this.client = axios.create({
      baseURL: `${baseURL}${apiPath}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getQuestions(params = {}) {
    return this.client.get('/questions', { params });
  }

  async getQuestion(id, params = {}) {
    return this.client.get(`/questions/${id}`, { params });
  }

  async translateText(data) {
    return this.client.post('/deepl/translate', data);
  }

  async translateQuestion(id, data) {
    return this.client.post(`/deepl/translate-question/${id}`, data);
  }
}

describe('🚀 AstroQuiz API Test Suite', () => {
  let apiClient;
  let sampleQuestionId;

  beforeAll(async () => {
    apiClient = new APIClient();
    
    // Get a sample question ID for testing
    try {
      const response = await apiClient.getQuestions({ 
        'pagination[pageSize]': 1,
        locale: 'en'
      });
      if (response.data.data.length > 0) {
        sampleQuestionId = response.data.data[0].documentId;
      }
    } catch (error) {
      console.warn('Could not fetch sample question ID:', error.message);
    }
  });

  describe('📋 Health Check', () => {
    test('should connect to Strapi API', async () => {
      const response = await apiClient.getQuestions({ 'pagination[pageSize]': 1 });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('meta');
    });

    test('should have questions in database', async () => {
      const response = await apiClient.getQuestions({ locale: 'en' });
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.meta.pagination.total).toBeGreaterThan(0);
    });
  });

  describe('📝 Questions API - Basic Operations', () => {
    test('should get all questions with default pagination', async () => {
      const response = await apiClient.getQuestions();
      
      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.meta).toHaveProperty('pagination');
      expect(response.data.meta.pagination).toHaveProperty('page');
      expect(response.data.meta.pagination).toHaveProperty('pageSize');
      expect(response.data.meta.pagination).toHaveProperty('total');
    });

    test('should get questions with custom pagination', async () => {
      const response = await apiClient.getQuestions({
        'pagination[page]': 1,
        'pagination[pageSize]': 5
      });
      
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(5);
      expect(response.data.meta.pagination.page).toBe(1);
      expect(response.data.meta.pagination.pageSize).toBe(5);
    });

    test('should get single question by ID', async () => {
      if (!sampleQuestionId) {
        console.warn('Skipping single question test - no sample ID available');
        return;
      }

      const response = await apiClient.getQuestion(sampleQuestionId);
      
      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Object);
      expect(response.data.data.documentId).toBe(sampleQuestionId);
    });

    test('should return 404 for invalid question ID', async () => {
      try {
        await apiClient.getQuestion('invalid-id-123');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('🔍 Questions API - Filtering', () => {
    test('should filter questions by level', async () => {
      const response = await apiClient.getQuestions({
        'filters[level][$eq]': 3,
        locale: 'en',
        'pagination[pageSize]': 10
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(question => {
        expect(question.level).toBe(3);
      });
    });

    test('should filter questions by level range', async () => {
      const response = await apiClient.getQuestions({
        'filters[level][$gte]': 2,
        'filters[level][$lte]': 4,
        locale: 'en',
        'pagination[pageSize]': 10
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(question => {
        expect(question.level).toBeGreaterThanOrEqual(2);
        expect(question.level).toBeLessThanOrEqual(4);
      });
    });

    test('should filter questions by topic', async () => {
      // First get available topics
      const allResponse = await apiClient.getQuestions({
        locale: 'en',
        'pagination[pageSize]': 50
      });
      
      if (allResponse.data.data.length === 0) {
        console.warn('No questions available for topic filtering test');
        return;
      }

      const firstTopic = allResponse.data.data[0].topic;
      
      const response = await apiClient.getQuestions({
        'filters[topic][$eq]': firstTopic,
        locale: 'en',
        'pagination[pageSize]': 10
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(question => {
        expect(question.topic).toBe(firstTopic);
      });
    });

    test('should search questions by content', async () => {
      const response = await apiClient.getQuestions({
        'filters[question][$containsi]': 'what',
        locale: 'en',
        'pagination[pageSize]': 5
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(question => {
        expect(question.question.toLowerCase()).toContain('what');
      });
    });
  });

  describe('🌍 Localization Tests', () => {
    test.each(global.LOCALES)('should get questions in %s locale', async (locale) => {
      const response = await apiClient.getQuestions({
        locale,
        'pagination[pageSize]': 5
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(question => {
        expect(question.locale).toBe(locale);
      });
    });

    test('should return same baseId across different locales', async () => {
      if (!sampleQuestionId) {
        console.warn('Skipping cross-locale test - no sample ID available');
        return;
      }

      // First, get the English question to find its baseId
      const enResponse = await apiClient.getQuestion(sampleQuestionId, { locale: 'en' });
      
      if (!enResponse.data.data) {
        console.warn('Skipping cross-locale test - English question not found');
        return;
      }

      const baseId = enResponse.data.data.baseId;
      
      // Now search for the same baseId in Portuguese
      const ptSearchResponse = await apiClient.getQuestions({
        locale: 'pt',
        'filters[baseId][$eq]': baseId,
        'pagination[pageSize]': 1
      });

      if (ptSearchResponse.data.data.length > 0) {
        const ptQuestion = ptSearchResponse.data.data[0];
        
        // Verify they have the same baseId and invariant fields
        expect(ptQuestion.baseId).toBe(enResponse.data.data.baseId);
        expect(ptQuestion.level).toBe(enResponse.data.data.level);
        expect(ptQuestion.correctOption).toBe(enResponse.data.data.correctOption);
        
        console.log(`✅ Cross-locale test passed for baseId: ${baseId}`);
      } else {
        console.warn(`⚠️  No Portuguese translation found for baseId: ${baseId} - this is expected for some questions`);
        // This is not a failure - just means not all questions have all translations
      }
    });
  });

  describe('📊 Data Validation', () => {
    test('should validate question schema', async () => {
      const response = await apiClient.getQuestions({
        locale: 'en',
        'pagination[pageSize]': 1
      });

      expect(response.status).toBe(200);
      
      if (response.data.data.length > 0) {
        const question = response.data.data[0];
        
        // Required fields
        expect(question).toHaveProperty('baseId');
        expect(question).toHaveProperty('topic');
        expect(question).toHaveProperty('level');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('optionA');
        expect(question).toHaveProperty('optionB');
        expect(question).toHaveProperty('optionC');
        expect(question).toHaveProperty('optionD');
        expect(question).toHaveProperty('correctOption');
        expect(question).toHaveProperty('explanation');
        expect(question).toHaveProperty('locale');

        // Data types and constraints
        expect(typeof question.baseId).toBe('string');
        expect(typeof question.topic).toBe('string');
        expect(typeof question.level).toBe('number');
        expect(question.level).toBeGreaterThanOrEqual(1);
        expect(question.level).toBeLessThanOrEqual(5);
        expect(['A', 'B', 'C', 'D']).toContain(question.correctOption);
        expect(global.LOCALES).toContain(question.locale);
      }
    });

    test('should have consistent question counts across locales', async () => {
      const results = {};
      
      for (const locale of global.LOCALES) {
        const response = await apiClient.getQuestions({
          locale,
          'pagination[pageSize]': 1
        });
        results[locale] = response.data.meta.pagination.total;
      }

      // Check that we have questions in each locale
      Object.values(results).forEach(count => {
        expect(count).toBeGreaterThan(0);
      });

      // Log the counts for reference
      console.log('Question counts by locale:', results);
    });
  });

  describe('🔧 DeepL Translation API', () => {
    test('should translate simple text or handle gracefully if not configured', async () => {
      try {
        const response = await apiClient.translateText({
          text: 'Hello world',
          targetLang: 'PT-BR',
          sourceLang: 'EN'
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        
        if (response.data.success) {
          expect(response.data.data).toHaveProperty('translatedText');
          expect(response.data.data.translatedText).toBeTruthy();
          console.log('✅ DeepL translation working:', response.data.data.translatedText);
        }
      } catch (error) {
        // Check for expected error conditions
        if (error.response?.status === 404 || error.response?.status === 405) {
          console.warn('⚠️  DeepL API endpoints not available - this is expected if not configured');
          return; // This is not a failure
        } else if (error.response?.status === 500 && error.response?.data?.message?.includes('DEEPL_API_KEY')) {
          console.warn('⚠️  DeepL API key not configured - this is expected in test environment');
          return; // This is not a failure
        }
        
        // Only fail for unexpected errors
        console.error('❌ Unexpected DeepL error:', error.response?.data || error.message);
        throw error;
      }
    });

    test('should translate question fields or handle gracefully if not configured', async () => {
      if (!sampleQuestionId) {
        console.warn('Skipping question translation test - no sample ID available');
        return;
      }

      try {
        const response = await apiClient.translateQuestion(sampleQuestionId, {
          targetLang: 'ES',
          fields: ['question', 'optionA', 'optionB']
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        
        if (response.data.success) {
          expect(response.data.data).toHaveProperty('translatedFields');
          expect(response.data.data.translatedFields).toHaveProperty('question');
          console.log('✅ DeepL question translation working');
        }
      } catch (error) {
        // Check for expected error conditions
        if (error.response?.status === 404 || error.response?.status === 405) {
          console.warn('⚠️  DeepL question translation API not available - this is expected if not configured');
          return; // This is not a failure
        } else if (error.response?.status === 500 && error.response?.data?.message?.includes('DEEPL_API_KEY')) {
          console.warn('⚠️  DeepL API key not configured - this is expected in test environment');
          return; // This is not a failure
        }
        
        // Only fail for unexpected errors
        console.error('❌ Unexpected DeepL question translation error:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('⚡ Performance Tests', () => {
    test('should handle large page sizes efficiently', async () => {
      const startTime = Date.now();
      
      const response = await apiClient.getQuestions({
        locale: 'en',
        'pagination[pageSize]': 100
      });
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(response.data.data.length).toBeLessThanOrEqual(100);
    });

    test('should handle complex filters efficiently', async () => {
      const startTime = Date.now();
      
      const response = await apiClient.getQuestions({
        'filters[level][$gte]': 2,
        'filters[level][$lte]': 4,
        locale: 'en',
        sort: 'level:asc',
        'pagination[pageSize]': 50
      });
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify sorting
      if (response.data.data.length > 1) {
        for (let i = 1; i < response.data.data.length; i++) {
          expect(response.data.data[i].level).toBeGreaterThanOrEqual(
            response.data.data[i - 1].level
          );
        }
      }
    });
  });

  describe('❌ Error Handling', () => {
    test('should handle invalid pagination parameters', async () => {
      try {
        await apiClient.getQuestions({
          'pagination[page]': -1,
          'pagination[pageSize]': 1000
        });
      } catch (error) {
        // Strapi might handle this gracefully or return an error
        // Either response is acceptable
        if (error.response) {
          expect([400, 200]).toContain(error.response.status);
        }
      }
    });

    test('should handle invalid filter values gracefully', async () => {
      try {
        const response = await apiClient.getQuestions({
          'filters[level][$eq]': 'invalid',
          locale: 'en',
          'pagination[pageSize]': 5
        });
        
        // Strapi v5 may return 200 with empty results for invalid filters
        expect(response.status).toBe(200);
        expect(response.data.data).toBeInstanceOf(Array);
        // Invalid filter should return empty results
        expect(response.data.data.length).toBe(0);
        
      } catch (error) {
        // Or it might return a 400 error, which is also acceptable
        expect([400, 500]).toContain(error.response.status);
        expect(error.response.data).toHaveProperty('error');
        console.log('✅ Invalid filter properly rejected with error:', error.response.status);
      }
    });

    test('should handle network timeout gracefully', async () => {
      const slowClient = new APIClient();
      slowClient.client.defaults.timeout = 1; // 1ms timeout

      try {
        await slowClient.getQuestions();
        fail('Should have timed out');
      } catch (error) {
        expect(error.code).toBe('ECONNABORTED');
      }
    }, 10000);
  });

  describe('📈 Statistics and Aggregation', () => {
    test('should provide accurate pagination metadata', async () => {
      const response = await apiClient.getQuestions({
        locale: 'en',
        'pagination[pageSize]': 10
      });

      expect(response.status).toBe(200);
      
      const { pagination } = response.data.meta;
      expect(pagination.page).toBeGreaterThan(0);
      expect(pagination.pageSize).toBe(10);
      expect(pagination.pageCount).toBeGreaterThan(0);
      expect(pagination.total).toBeGreaterThan(0);
      
      // Mathematical consistency
      const expectedPageCount = Math.ceil(pagination.total / pagination.pageSize);
      expect(pagination.pageCount).toBe(expectedPageCount);
    });

    test('should handle empty result sets correctly', async () => {
      const response = await apiClient.getQuestions({
        'filters[baseId][$eq]': 'non-existent-id-12345',
        locale: 'en'
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.data.length).toBe(0);
      expect(response.data.meta.pagination.total).toBe(0);
    });
  });
});
