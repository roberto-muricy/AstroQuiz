const axios = require('axios');
const { GAME_RULES, GameRulesHelper } = require('../config/game-rules');

/**
 * AstroQuiz Engine Test Suite
 * Comprehensive testing of quiz engine functionality
 */

// API Client for testing
class QuizEngineAPIClient {
  constructor(baseURL = global.API_BASE_URL, apiPath = global.API_PATH) {
    this.baseURL = baseURL;
    this.apiPath = apiPath;
    this.client = axios.create({
      baseURL: `${baseURL}${apiPath}`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Quiz Engine API methods
  async startQuiz(data) {
    return this.client.post('/quiz/start', data);
  }

  async getSession(sessionId) {
    return this.client.get(`/quiz/session/${sessionId}`);
  }

  async getCurrentQuestion(sessionId) {
    return this.client.get(`/quiz/question/${sessionId}`);
  }

  async submitAnswer(data) {
    return this.client.post('/quiz/answer', data);
  }

  async pauseQuiz(sessionId) {
    return this.client.post('/quiz/pause', { sessionId });
  }

  async resumeQuiz(sessionId) {
    return this.client.post('/quiz/resume', { sessionId });
  }

  async finishQuiz(sessionId, reason = 'completed') {
    return this.client.post('/quiz/finish', { sessionId, reason });
  }

  async getLeaderboard(params = {}) {
    return this.client.get('/quiz/leaderboard', { params });
  }

  async getGameRules(section = null) {
    return this.client.get('/quiz/rules', { params: { section } });
  }

  async getPoolStats(locale = 'en') {
    return this.client.get('/quiz/pool-stats', { params: { locale } });
  }

  async getSessionAnalytics(sessionId) {
    return this.client.get(`/quiz/analytics/${sessionId}`);
  }

  async healthCheck() {
    return this.client.get('/quiz/health');
  }
}

describe('🎮 AstroQuiz Engine Test Suite', () => {
  let apiClient;
  let testSessionId;

  beforeAll(async () => {
    apiClient = new QuizEngineAPIClient();
    
    // Wait a bit for services to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test session if it exists
    if (testSessionId) {
      try {
        await apiClient.finishQuiz(testSessionId, 'abandoned');
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('🏥 Health Check', () => {
    test('should return healthy status', async () => {
      const response = await apiClient.healthCheck();
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('status');
      expect(response.data.data).toHaveProperty('services');
      expect(response.data.data).toHaveProperty('config');
    });
  });

  describe('📋 Game Rules', () => {
    test('should get all game rules', async () => {
      const response = await apiClient.getGameRules();
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('general');
      expect(response.data.data).toHaveProperty('phases');
      expect(response.data.data).toHaveProperty('scoring');
    });

    test('should get specific rule section', async () => {
      const response = await apiClient.getGameRules('scoring');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('scoring');
      expect(response.data.data.scoring).toHaveProperty('basePoints');
    });

    test('should handle invalid rule section', async () => {
      try {
        await apiClient.getGameRules('invalid_section');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('📊 Question Pool Statistics', () => {
    test('should get pool stats for English', async () => {
      const response = await apiClient.getPoolStats('en');
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('stats');
      expect(response.data.data.stats).toHaveProperty('total');
      expect(response.data.data.stats).toHaveProperty('byLevel');
      expect(response.data.data.stats).toHaveProperty('byTopic');
    });

    test('should handle invalid locale', async () => {
      try {
        await apiClient.getPoolStats('invalid');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('🎯 Quiz Session Lifecycle', () => {
    test('should start a new quiz session', async () => {
      const response = await apiClient.startQuiz({
        phaseNumber: 1,
        locale: 'en',
        userId: 'test-user-123'
      });
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('sessionId');
      expect(response.data.data).toHaveProperty('phaseNumber', 1);
      expect(response.data.data).toHaveProperty('totalQuestions');
      
      testSessionId = response.data.data.sessionId;
      expect(testSessionId).toBeTruthy();
    });

    test('should validate phase number when starting quiz', async () => {
      try {
        await apiClient.startQuiz({
          phaseNumber: 999,
          locale: 'en'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('Invalid phase number');
      }
    });

    test('should validate locale when starting quiz', async () => {
      try {
        await apiClient.startQuiz({
          phaseNumber: 1,
          locale: 'invalid'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('Unsupported locale');
      }
    });

    test('should get session information', async () => {
      if (!testSessionId) {
        console.warn('Skipping session info test - no session ID available');
        return;
      }

      const response = await apiClient.getSession(testSessionId);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('session');
      expect(response.data.data).toHaveProperty('stats');
      expect(response.data.data.session.sessionId).toBe(testSessionId);
    });

    test('should get current question', async () => {
      if (!testSessionId) {
        console.warn('Skipping current question test - no session ID available');
        return;
      }

      const response = await apiClient.getCurrentQuestion(testSessionId);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('question');
      expect(response.data.data).toHaveProperty('timeRemaining');
      expect(response.data.data).toHaveProperty('questionIndex');
      expect(response.data.data.question).toHaveProperty('question');
      expect(response.data.data.question).toHaveProperty('optionA');
      expect(response.data.data.question).toHaveProperty('optionB');
      expect(response.data.data.question).toHaveProperty('optionC');
      expect(response.data.data.question).toHaveProperty('optionD');
    });

    test('should submit answer', async () => {
      if (!testSessionId) {
        console.warn('Skipping answer submission test - no session ID available');
        return;
      }

      const response = await apiClient.submitAnswer({
        sessionId: testSessionId,
        selectedOption: 'A',
        timeUsed: 15000 // 15 seconds
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('answerRecord');
      expect(response.data.data).toHaveProperty('scoreResult');
      expect(response.data.data).toHaveProperty('sessionStatus');
      
      const answerRecord = response.data.data.answerRecord;
      expect(answerRecord).toHaveProperty('selectedOption', 'A');
      expect(answerRecord).toHaveProperty('isCorrect');
      expect(answerRecord).toHaveProperty('points');
    });

    test('should validate answer submission', async () => {
      if (!testSessionId) {
        console.warn('Skipping answer validation test - no session ID available');
        return;
      }

      try {
        await apiClient.submitAnswer({
          sessionId: testSessionId,
          selectedOption: 'X', // Invalid option
          timeUsed: 15000
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('Valid selectedOption');
      }
    });
  });

  describe('⏸️ Session Control', () => {
    test('should pause and resume session', async () => {
      if (!testSessionId) {
        console.warn('Skipping pause/resume test - no session ID available');
        return;
      }

      // Pause session
      const pauseResponse = await apiClient.pauseQuiz(testSessionId);
      expect(pauseResponse.status).toBe(200);
      expect(pauseResponse.data.success).toBe(true);
      expect(pauseResponse.data.data.isPaused).toBe(true);

      // Resume session
      const resumeResponse = await apiClient.resumeQuiz(testSessionId);
      expect(resumeResponse.status).toBe(200);
      expect(resumeResponse.data.success).toBe(true);
      expect(resumeResponse.data.data.isPaused).toBe(false);
    });

    test('should handle invalid session ID for pause', async () => {
      try {
        await apiClient.pauseQuiz('invalid-session-id');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('🏆 Competitive Features', () => {
    test('should get leaderboard', async () => {
      const response = await apiClient.getLeaderboard();
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('leaderboard');
      expect(response.data.data).toHaveProperty('category');
      expect(response.data.data.leaderboard).toBeInstanceOf(Array);
    });

    test('should get leaderboard with parameters', async () => {
      const response = await apiClient.getLeaderboard({
        category: 'perfect_phases',
        limit: 5
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.category).toBe('perfect_phases');
      expect(response.data.data.leaderboard.length).toBeLessThanOrEqual(5);
    });

    test('should validate leaderboard parameters', async () => {
      try {
        await apiClient.getLeaderboard({
          category: 'invalid_category'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('📈 Analytics', () => {
    test('should get session analytics for completed session', async () => {
      // First complete the test session
      if (testSessionId) {
        try {
          await apiClient.finishQuiz(testSessionId, 'completed');
          
          const response = await apiClient.getSessionAnalytics(testSessionId);
          
          expect(response.status).toBe(200);
          expect(response.data.success).toBe(true);
          expect(response.data.data).toHaveProperty('phases');
          expect(response.data.data).toHaveProperty('summary');
        } catch (error) {
          // Analytics might not be available for incomplete sessions
          if (error.response?.status !== 404) {
            throw error;
          }
        }
      }
    });
  });

  describe('🔧 Game Rules Helper Functions', () => {
    test('should calculate points correctly', () => {
      // Test basic point calculation
      const points1 = GameRulesHelper.calculatePoints(3, 20000, 0); // Level 3, 20s remaining, no streak
      expect(points1).toBeGreaterThan(30); // Should be more than base points due to speed bonus

      const points2 = GameRulesHelper.calculatePoints(3, 5000, 5); // Level 3, 5s remaining, streak of 5
      expect(points2).toBeGreaterThan(points1); // Should be more due to streak bonus
    });

    test('should get phase configuration', () => {
      const phase1Config = GameRulesHelper.getPhaseConfig(1);
      expect(phase1Config).toBeTruthy();
      expect(phase1Config.type).toBe('beginner');
      expect(phase1Config.phase).toBe(1);

      const phase25Config = GameRulesHelper.getPhaseConfig(25);
      expect(phase25Config).toBeTruthy();
      expect(phase25Config.type).toBe('intermediate');

      const invalidConfig = GameRulesHelper.getPhaseConfig(999);
      expect(invalidConfig).toBeNull();
    });

    test('should get difficulty distribution', () => {
      const distribution = GameRulesHelper.getDifficultyDistribution(1);
      expect(distribution).toBeTruthy();
      expect(distribution[1]).toBe(0.7); // 70% level 1 for phase 1
      expect(distribution[2]).toBe(0.3); // 30% level 2 for phase 1
    });

    test('should check special challenges', () => {
      const hasSpecial40 = GameRulesHelper.hasSpecialChallenges(40);
      expect(hasSpecial40).toBe(false); // Phase 40 is advanced, not elite

      const hasSpecial45 = GameRulesHelper.hasSpecialChallenges(45);
      expect(hasSpecial45).toBe(true); // Phase 45 is elite
    });

    test('should get minimum score', () => {
      const minScore1 = GameRulesHelper.getMinimumScore(1);
      expect(minScore1).toBe(0.6); // Beginner phases require 60%

      const minScore45 = GameRulesHelper.getMinimumScore(45);
      expect(minScore45).toBe(0.85); // Elite phases require 85%
    });

    test('should validate configuration', () => {
      const errors = GameRulesHelper.validateConfig();
      expect(errors).toBeInstanceOf(Array);
      // Configuration should be valid
      expect(errors.length).toBe(0);
    });
  });

  describe('🎯 Integration Tests', () => {
    test('should complete a full quiz flow', async () => {
      // Start a new quiz
      const startResponse = await apiClient.startQuiz({
        phaseNumber: 1,
        locale: 'en',
        userId: 'integration-test-user'
      });
      
      expect(startResponse.status).toBe(201);
      const sessionId = startResponse.data.data.sessionId;

      try {
        // Get first question
        const questionResponse = await apiClient.getCurrentQuestion(sessionId);
        expect(questionResponse.status).toBe(200);

        // Submit answer
        const answerResponse = await apiClient.submitAnswer({
          sessionId,
          selectedOption: 'A',
          timeUsed: 10000
        });
        expect(answerResponse.status).toBe(200);

        // Check session status
        const sessionResponse = await apiClient.getSession(sessionId);
        expect(sessionResponse.status).toBe(200);
        expect(sessionResponse.data.data.stats.progress.currentQuestion).toBe(2);

        // Finish quiz
        const finishResponse = await apiClient.finishQuiz(sessionId, 'abandoned');
        expect(finishResponse.status).toBe(200);

      } catch (error) {
        // Clean up on error
        await apiClient.finishQuiz(sessionId, 'abandoned').catch(() => {});
        throw error;
      }
    });

    test('should handle error cases gracefully', async () => {
      // Test with non-existent session
      try {
        await apiClient.getCurrentQuestion('non-existent-session');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }

      // Test with invalid answer data
      try {
        await apiClient.submitAnswer({
          sessionId: 'non-existent-session',
          selectedOption: 'A',
          timeUsed: 15000
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('⚡ Performance Tests', () => {
    test('should handle multiple concurrent sessions', async () => {
      const sessionPromises = [];
      const sessionCount = 5;

      // Create multiple sessions concurrently
      for (let i = 0; i < sessionCount; i++) {
        sessionPromises.push(
          apiClient.startQuiz({
            phaseNumber: 1,
            locale: 'en',
            userId: `perf-test-user-${i}`
          })
        );
      }

      const responses = await Promise.all(sessionPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
      });

      // Clean up sessions
      const cleanupPromises = responses.map(response => 
        apiClient.finishQuiz(response.data.data.sessionId, 'abandoned')
          .catch(() => {}) // Ignore cleanup errors
      );
      
      await Promise.all(cleanupPromises);
    }, 30000); // 30 second timeout

    test('should respond quickly to API calls', async () => {
      const startTime = Date.now();
      
      const response = await apiClient.getGameRules();
      
      const responseTime = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
