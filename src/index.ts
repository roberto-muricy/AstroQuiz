// In-memory session storage
const quizSessions = new Map();

// Minimal phase config fallback (avoid relying on api::quiz-engine.selector which isn't loaded without content-types)
const getPhaseConfig = (phaseNumber) => {
  if (phaseNumber >= 1 && phaseNumber <= 10) {
    return { type: 'beginner', levels: [1, 2], distribution: { 1: 0.7, 2: 0.3 } };
  }
  if (phaseNumber >= 11 && phaseNumber <= 20) {
    return { type: 'novice', levels: [1, 2, 3], distribution: { 1: 0.4, 2: 0.4, 3: 0.2 } };
  }
  if (phaseNumber >= 21 && phaseNumber <= 30) {
    return { type: 'intermediate', levels: [2, 3, 4], distribution: { 2: 0.3, 3: 0.5, 4: 0.2 } };
  }
  if (phaseNumber >= 31 && phaseNumber <= 40) {
    return { type: 'advanced', levels: [3, 4, 5], distribution: { 3: 0.2, 4: 0.5, 5: 0.3 } };
  }
  if (phaseNumber >= 41 && phaseNumber <= 50) {
    return { type: 'elite', levels: [4, 5], distribution: { 4: 0.3, 5: 0.7 } };
  }
  return null;
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
              // Fallback selection (since quiz-engine has no content-type, services may not be loaded)
              const phaseConfig = getPhaseConfig(Number(phaseNumber));
              if (!phaseConfig) {
                return ctx.badRequest('Invalid phase number. Must be between 1 and 50.');
              }

              const pool = await strapi.entityService.findMany('api::question.question', {
                filters: {
                  locale, // i18n locale filter (simple form works reliably here)
                  level: { $in: phaseConfig.levels },
                },
                limit: 1500,
                publicationState: 'live',
                // Randomize order to get different questions each time
                sort: { id: 'asc' }, // will be shuffled anyway
              });

              strapi.log.info(`📊 Pool stats - Locale: ${locale}, Levels: [${phaseConfig.levels}], Found: ${pool?.length || 0} questions`);

              const byLevel = {};
              for (const lvl of phaseConfig.levels) byLevel[lvl] = [];
              for (const q of pool || []) {
                if (!byLevel[q.level]) byLevel[q.level] = [];
                byLevel[q.level].push(q);
              }

              // Compute counts by distribution (10 questions total)
              const totalNeeded = 10;
              const levels = Object.keys(phaseConfig.distribution).map((x) => Number(x));
              const counts = {};
              let sum = 0;
              for (const lvl of levels) {
                counts[lvl] = Math.round(totalNeeded * (phaseConfig.distribution[lvl] || 0));
                sum += counts[lvl];
              }
              if (sum !== totalNeeded) {
                const maxLvl = Math.max(...levels);
                counts[maxLvl] = (counts[maxLvl] || 0) + (totalNeeded - sum);
              }

              const picked = [];
              const usedIds = new Set();

              for (const lvl of levels) {
                const candidates = shuffle(byLevel[lvl] || []);
                for (const q of candidates) {
                  if (picked.length >= totalNeeded) break;
                  if (usedIds.has(q.id)) continue;
                  if ((picked.filter((x) => x.level === lvl).length) >= (counts[lvl] || 0)) continue;
                  usedIds.add(q.id);
                  picked.push(q);
                }
              }

              // Fill remaining slots from any allowed level
              if (picked.length < totalNeeded) {
                const remaining = shuffle(pool || []);
                for (const q of remaining) {
                  if (picked.length >= totalNeeded) break;
                  if (usedIds.has(q.id)) continue;
                  usedIds.add(q.id);
                  picked.push(q);
                }
              }

              questions = picked.slice(0, totalNeeded);
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
