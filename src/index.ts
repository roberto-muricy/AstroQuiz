// In-memory session storage
const quizSessions = new Map();

/**
 * Get difficulty distribution for each phase (1-50)
 * Returns array of {level, count} matching the frontend progressionSystem.ts
 */
const getDifficultyDistribution = (phase) => {
  // Phases 1-3: Beginner (100% Level 1)
  if (phase <= 3) return [{ level: 1, count: 10 }];
  
  // Phases 4-7: Easy mix
  if (phase <= 7) return [{ level: 1, count: 8 }, { level: 2, count: 2 }];
  
  // Phases 8-10: Intro to Level 2
  if (phase <= 10) return [{ level: 1, count: 6 }, { level: 2, count: 4 }];
  
  // Phases 11-15: Intermediate start
  if (phase <= 15) return [{ level: 2, count: 5 }, { level: 3, count: 5 }];
  
  // Phases 16-20: More Level 3
  if (phase <= 20) return [{ level: 2, count: 3 }, { level: 3, count: 7 }];
  
  // Phases 21-25: Intermediate advanced
  if (phase <= 25) return [{ level: 3, count: 6 }, { level: 4, count: 4 }];
  
  // Phases 26-30: Balanced challenge
  if (phase <= 30) return [{ level: 3, count: 5 }, { level: 4, count: 5 }];
  
  // Phases 31-35: More Level 4
  if (phase <= 35) return [{ level: 3, count: 3 }, { level: 4, count: 7 }];
  
  // Phases 36-40: Advanced
  if (phase <= 40) return [{ level: 4, count: 6 }, { level: 5, count: 4 }];
  
  // Phases 41-45: Expert mix
  if (phase <= 45) return [{ level: 4, count: 5 }, { level: 5, count: 5 }];
  
  // Phases 46-50: Master (100% Level 5)
  return [{ level: 5, count: 10 }];
};

/**
 * Diversify questions by topic (max 3 per topic)
 */
const diversifyTopics = (questions, targetCount) => {
  const selected = [];
  const topicCount = {};
  const shuffled = shuffle(questions);
  
  for (const question of shuffled) {
    const topic = question.topic || 'General';
    const currentCount = topicCount[topic] || 0;
    
    // Limit to max 3 questions per topic
    if (currentCount < 3) {
      selected.push(question);
      topicCount[topic] = currentCount + 1;
      
      if (selected.length >= targetCount) {
        break;
      }
    }
  }
  
  // If we didn't get enough (strict topic limit), fill remaining
  if (selected.length < targetCount) {
    for (const question of shuffled) {
      if (selected.length >= targetCount) break;
      if (!selected.find(q => q.id === question.id)) {
        selected.push(question);
      }
    }
  }
  
  return selected;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Register quiz-engine routes with inline handlers
    strapi.server.routes([
      {
        method: 'GET',
        path: '/api/quiz/health',
        handler: async (ctx) => {
          ctx.body = {
            success: true,
            message: 'Quiz service is healthy',
            data: {
              status: 'ok',
              timestamp: new Date().toISOString(),
              version: '1.0.0'
            }
          };
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/quiz/rules',
        handler: async (ctx) => {
          ctx.body = {
            success: true,
            data: {
              general: {
                totalPhases: 50,
                questionsPerPhase: 10,
                timePerQuestion: 30000,
                supportedLocales: ['en', 'pt', 'es', 'fr']
              },
              message: 'Basic rules - full rules available via quiz service'
            }
          };
        },
        config: { auth: false },
      },
      {
        method: 'POST',
        path: '/api/quiz/start',
        handler: async (ctx) => {
          try {
            const { phaseNumber = 1, locale = 'pt' } = ctx.request.body;

            // Validate locale (keep aligned with mobile support)
            const supportedLocales = ['en', 'pt', 'es', 'fr'];
            if (!supportedLocales.includes(locale)) {
              return ctx.badRequest(`Unsupported locale: ${locale}. Supported: ${supportedLocales.join(', ')}`);
            }

            // Select 10 questions for this phase (avoid repeats within the session)
            let questions = [];

            const selectorService = strapi.service('api::quiz-engine.selector');
            if (selectorService && typeof selectorService.selectPhaseQuestions === 'function') {
              const selected = await selectorService.selectPhaseQuestions({
                phaseNumber,
                locale,
                excludeQuestions: [],
                recentTopics: [],
                userPerformance: {},
              });
              questions = (selected || []).slice(0, 10);
            } else {
              // Fallback selection using precise phase distribution
              const distribution = getDifficultyDistribution(Number(phaseNumber));
              if (!distribution || distribution.length === 0) {
                return ctx.badRequest('Invalid phase number. Must be between 1 and 50.');
              }

              // Extract unique levels needed for this phase
              const levels = [...new Set(distribution.map(d => d.level))];

              // Fetch 2x more questions than needed to enable topic diversification
              const pool = await strapi.entityService.findMany('api::question.question', {
                filters: {
                  locale,
                  level: { $in: levels },
                },
                limit: 1500,
                publicationState: 'live',
                sort: { id: 'asc' },
              });

              strapi.log.info(`📊 Phase ${phaseNumber} - Locale: ${locale}, Levels: [${levels}], Pool: ${pool?.length || 0} questions`);

              // Group questions by level
              const byLevel = {};
              for (const lvl of levels) byLevel[lvl] = [];
              for (const q of pool || []) {
                if (byLevel[q.level]) byLevel[q.level].push(q);
              }

              // Select questions according to distribution
              const picked = [];
              const usedIds = new Set();

              for (const { level, count } of distribution) {
                const candidates = shuffle(byLevel[level] || []);
                let addedForLevel = 0;
                
                for (const q of candidates) {
                  if (addedForLevel >= count) break;
                  if (usedIds.has(q.id)) continue;
                  
                  usedIds.add(q.id);
                  picked.push(q);
                  addedForLevel++;
                }
                
                // Log if we couldn't fulfill the distribution
                if (addedForLevel < count) {
                  strapi.log.warn(`⚠️ Phase ${phaseNumber}: Only found ${addedForLevel}/${count} questions for level ${level}`);
                }
              }

              // Apply topic diversification (max 3 per topic)
              questions = diversifyTopics(picked, 10);
              
              strapi.log.info(`✅ Selected ${questions.length} questions for phase ${phaseNumber} (distribution: ${distribution.map(d => `${d.count}xL${d.level}`).join(', ')})`);
            }

            if (!questions || questions.length === 0) {
              return ctx.badRequest(`No questions available for phase ${phaseNumber} in locale ${locale}`);
            }

            // Create simple session ID
            const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Inicializar sessão em memória
            quizSessions.set(sessionId, {
              sessionId,
              phaseNumber,
              locale,
              totalQuestions: questions.length,
              currentQuestionIndex: 0,
              questions, // preselected questions to avoid repeats
              answers: [],
              score: 0,
              streakCount: 0,
              maxStreak: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
              totalTime: 0,
              startedAt: new Date().toISOString(),
              status: 'active'
            });
            
            strapi.log.info(`🎮 Nova sessão criada: ${sessionId}, Fase: ${phaseNumber}`);
            
            ctx.body = {
              success: true,
              message: 'Quiz session started successfully',
              data: {
                sessionId,
                phaseNumber,
                totalQuestions: questions.length,
                timePerQuestion: 30000,
                locale,
                startedAt: new Date().toISOString()
              }
            };
          } catch (error) {
            strapi.log.error('Error starting quiz:', error);
            ctx.internalServerError('Failed to start quiz session');
          }
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/quiz/pool-stats',
        handler: async (ctx) => {
          try {
            const { locale = 'pt', phaseNumber = 1 } = ctx.query;
            
            const total = await strapi.db.query('api::question.question').count({
              where: { locale },
            });

            ctx.body = {
              success: true,
              data: {
                locale,
                phaseNumber,
                totalQuestions: total,
                available: total >= 10,
                message: `${total} questions available in ${locale}`
              }
            };
          } catch (error) {
            strapi.log.error('Error getting pool stats:', error);
            ctx.internalServerError('Failed to get pool statistics');
          }
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/quiz/question/:sessionId',
        handler: async (ctx) => {
          try {
            const { sessionId } = ctx.params;

            const session = quizSessions.get(sessionId);
            if (!session) {
              return ctx.notFound('Session not found or expired');
            }

            if (session.status !== 'active') {
              return ctx.badRequest(`Session is not active. Status: ${session.status}`);
            }

            const question = session.questions?.[session.currentQuestionIndex];
            if (!question) {
              return ctx.notFound('No more questions available');
            }

            ctx.body = {
              success: true,
              data: {
                sessionId,
                questionIndex: session.currentQuestionIndex,
                totalQuestions: session.totalQuestions,
                question: {
                  id: question.id,
                  documentId: question.documentId,
                  question: question.question,
                  optionA: question.optionA,
                  optionB: question.optionB,
                  optionC: question.optionC,
                  optionD: question.optionD,
                  explanation: question.explanation,
                  level: question.level,
                  topic: question.topic,
                },
                timeRemaining: 30000,
                timePerQuestion: 30000,
                currentScore: session.score || 0,
                currentStreak: session.streakCount || 0
              }
            };
          } catch (error) {
            strapi.log.error('Error getting question:', error);
            ctx.internalServerError('Failed to get question');
          }
        },
        config: { auth: false },
      },
      {
        method: 'POST',
        path: '/api/quiz/answer',
        handler: async (ctx) => {
          try {
            const { sessionId, selectedOption, timeUsed = 15000, questionId, isTimeout = false } = ctx.request.body;

            if (!sessionId) {
              return ctx.badRequest('sessionId is required');
            }
            if (!isTimeout && !selectedOption) {
              return ctx.badRequest('selectedOption is required');
            }

            // Get the question to check correct answer
            let isCorrect = false;
            let correctOption = 'A'; // Default fallback
            let questionData = null;
            
            strapi.log.info(`📝 Checking answer - QuestionID: ${questionId}, Selected: ${selectedOption}, Timeout: ${isTimeout}`);
            
            if (questionId) {
              try {
                // Buscar a pergunta no banco para verificar resposta
                questionData = await strapi.db.query('api::question.question').findOne({
                  where: { id: questionId },
                  select: ['id', 'correctOption', 'explanation'],
                });
                
                if (questionData) {
                  correctOption = questionData.correctOption;
                  isCorrect = !isTimeout && selectedOption === questionData.correctOption;
                  
                  strapi.log.info(`✅ Question found - Correct: ${correctOption}, Selected: ${selectedOption}, IsCorrect: ${isCorrect}`);
                } else {
                  strapi.log.warn(`⚠️ Question not found with ID: ${questionId}`);
                }
              } catch (error) {
                strapi.log.error(`❌ Error fetching question ${questionId}:`, error);
              }
            } else {
              strapi.log.warn('⚠️ No questionId provided in request');
            }

            // Get question level for points calculation
            let questionLevel = 1;
            if (questionData) {
              // Buscar o level da pergunta
              const fullQuestion = await strapi.db.query('api::question.question').findOne({
                where: { id: questionId },
                select: ['level'],
              });
              questionLevel = fullQuestion?.level || 1;
            }

            // Calculate points usando as regras do game-rules.js
            let totalPoints = 0;
            let basePoints = 0;
            let speedBonus = 0;
            let speedMultiplier = 1.0;
            
            if (isCorrect) {
              // Pontos base por nível
              const pointsByLevel = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 };
              basePoints = pointsByLevel[questionLevel] || 10;
              
              // Calcular tempo restante
              const timePerQuestion = 30000; // 30 segundos
              const timeRemaining = timePerQuestion - timeUsed;
              
              // Multiplicador de velocidade
              if (timeRemaining >= 20000) {
                speedMultiplier = 2.0; // Excelente (<10s usado)
              } else if (timeRemaining >= 15000) {
                speedMultiplier = 1.5; // Bom (<15s usado)
              } else if (timeRemaining >= 10000) {
                speedMultiplier = 1.2; // Normal (<20s usado)
              } else {
                speedMultiplier = 1.0; // Lento (>20s usado)
              }
              
              // Aplicar multiplicador
              const pointsWithSpeed = Math.round(basePoints * speedMultiplier);
              speedBonus = pointsWithSpeed - basePoints;
              totalPoints = pointsWithSpeed;
              
              strapi.log.info(`💰 Points calculation - Base: ${basePoints}, Multiplier: ${speedMultiplier}x, Speed Bonus: ${speedBonus}, Total: ${totalPoints}`);
            }

            // Atualizar sessão em memória
            let session = quizSessions.get(sessionId);
            if (!session) {
              // Criar sessão se não existir
              session = {
                sessionId,
                phaseNumber: 1,
                answers: [],
                score: 0,
                streakCount: 0,
                maxStreak: 0,
                correctAnswers: 0,
                incorrectAnswers: 0,
                totalTime: 0,
                currentQuestionIndex: 0,
                totalQuestions: 10,
                status: 'active'
              };
            }

            // Atualizar estatísticas da sessão
            session.score += totalPoints;
            session.currentQuestionIndex += 1;
            session.totalTime += timeUsed;
            
            if (isCorrect) {
              session.correctAnswers += 1;
              session.streakCount += 1;
              session.maxStreak = Math.max(session.maxStreak, session.streakCount);
              
              // Bônus de streak (a partir de 3 acertos seguidos)
              if (session.streakCount >= 3) {
                const streakBonus = Math.min(session.streakCount * 5, 50);
                session.score += streakBonus;
                totalPoints += streakBonus;
                strapi.log.info(`🔥 Streak bonus: ${streakBonus} points (streak: ${session.streakCount})`);
              }
            } else {
              session.incorrectAnswers += 1;
              session.streakCount = 0;
            }

            // Registrar resposta
            session.answers.push({
              questionId,
              selectedOption,
              correctOption,
              isCorrect,
              isTimeout,
              timeUsed,
              points: totalPoints
            });

            // Verificar se completou a fase
            const isPhaseComplete = session.currentQuestionIndex >= 10;
            if (isPhaseComplete) {
              session.status = 'completed';
              session.completedAt = new Date().toISOString();
              
              // Perfect bonus se acertou todas
              if (session.correctAnswers === 10) {
                const perfectBonus = Math.round(session.score * 0.5);
                session.score += perfectBonus;
                strapi.log.info(`👑 Perfect Bonus: +${perfectBonus} points!`);
              }
            }

            quizSessions.set(sessionId, session);
            
            strapi.log.info(`📊 Session ${sessionId} - Score: ${session.score}, Streak: ${session.streakCount}, Progress: ${session.currentQuestionIndex}/10`);

            ctx.body = {
              success: true,
              data: {
                answerRecord: {
                  selectedOption,
                  correctOption,
                  isCorrect,
                  isTimeout,
                  timeUsed,
                  points: totalPoints,
                  level: questionLevel
                },
                scoreResult: {
                  basePoints,
                  speedBonus,
                  speedMultiplier,
                  totalPoints,
                  streakBonus: isCorrect && session.streakCount >= 3 ? Math.min(session.streakCount * 5, 50) : 0
                },
                sessionStatus: {
                  currentQuestionIndex: session.currentQuestionIndex,
                  totalQuestions: 10,
                  score: session.score,
                  streakCount: session.streakCount,
                  maxStreak: session.maxStreak,
                  correctAnswers: session.correctAnswers,
                  incorrectAnswers: session.incorrectAnswers,
                  isPhaseComplete
                }
              }
            };
          } catch (error) {
            strapi.log.error('Error submitting answer:', error);
            ctx.internalServerError('Failed to submit answer');
          }
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/quiz/session/:sessionId',
        handler: async (ctx) => {
          try {
            const { sessionId } = ctx.params;
            
            const session = quizSessions.get(sessionId);
            
            if (!session) {
              return ctx.notFound('Session not found or expired');
            }

            ctx.body = {
              success: true,
              data: session
            };
          } catch (error) {
            strapi.log.error('Error getting session:', error);
            ctx.internalServerError('Failed to get session');
          }
        },
        config: { auth: false },
      },
      {
        method: 'POST',
        path: '/api/quiz/finish/:sessionId',
        handler: async (ctx) => {
          try {
            const { sessionId } = ctx.params;
            
            const session = quizSessions.get(sessionId);
            
            if (!session) {
              return ctx.notFound('Session not found');
            }

            // Marcar como completada
            session.status = 'completed';
            session.completedAt = new Date().toISOString();
            
            // Calcular accuracy
            const accuracy = session.totalQuestions > 0 
              ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
              : 0;
            
            // Verificar se passou (60% mínimo)
            const passed = accuracy >= 60;
            
            // Calcular tempo médio
            const avgTime = session.answers.length > 0
              ? Math.round(session.totalTime / session.answers.length)
              : 0;
            
            // Detectar achievements
            const achievements = [];
            if (session.correctAnswers === 10) achievements.push('perfect_score');
            if (session.maxStreak >= 10) achievements.push('streak_master');
            if (avgTime < 10000) achievements.push('speed_demon');
            
            quizSessions.set(sessionId, session);
            
            strapi.log.info(`🏁 Fase ${session.phaseNumber} finalizada - Score: ${session.score}, Accuracy: ${accuracy}%, Passou: ${passed}`);

            ctx.body = {
              success: true,
              message: 'Quiz session completed',
              data: {
                ...session,
                finalScore: session.score,
                accuracy,
                passed,
                averageTimePerQuestion: avgTime,
                achievements,
                nextPhaseUnlocked: passed
              }
            };
          } catch (error) {
            strapi.log.error('Error finishing quiz:', error);
            ctx.internalServerError('Failed to finish quiz');
          }
        },
        config: { auth: false },
      },
    ]);
    
    strapi.log.info('✅ Quiz Engine routes registered successfully');
  },
};
