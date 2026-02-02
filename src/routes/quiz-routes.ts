/**
 * Quiz Routes
 * API endpoints for quiz sessions
 */

import {
  quizSessions,
  getSession,
  saveQuizSession,
  createSession,
  generateSessionId,
} from '../services/quiz-session';
import {
  fetchImageUrlsByQuestionIds,
  fetchImageCandidateForPhase,
  normalizeQuestion,
} from '../services/question-service';
import {
  getDifficultyDistribution,
  diversifyTopics,
  shuffle,
  calculatePoints,
  calculateStreakBonus,
  calculatePerfectBonus,
  isValidLocale,
  SUPPORTED_LOCALES,
  SCORING,
} from '../services/quiz-logic';
import {
  createOptionalAuthMiddleware,
  AuthContext,
} from '../middlewares/auth';
import {
  validatePhaseNumber,
  validateLocale,
  validateSessionId,
  validateOption,
  validateTimeUsed,
  validateQuestionId,
  combineValidations,
  formatValidationErrors,
} from '../services/validation';

export function createQuizRoutes(strapi: any): any[] {
  const optionalAuth = createOptionalAuthMiddleware(strapi);

  return [
    // Health check
    {
      method: 'GET',
      path: '/api/quiz/health',
      handler: async (ctx: any) => {
        // Debug: Check database configuration
        const knex = strapi.db.connection;
        const clientName = knex?.client?.constructor?.name || 'unknown';

        let questionCount = 0;
        try {
          const result = await knex('questions').count('* as count');
          questionCount = parseInt(result[0]?.count || '0', 10);
        } catch (err) {
          questionCount = -1;
        }

        ctx.body = {
          success: true,
          message: 'Quiz service is healthy',
          data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            debug: {
              databaseClient: clientName,
              questionCount: questionCount,
              env: {
                DATABASE_CLIENT: process.env.DATABASE_CLIENT || 'not set',
                DATABASE_URL_SET: !!process.env.DATABASE_URL,
                NODE_ENV: process.env.NODE_ENV,
              },
            },
          },
        };
      },
      config: { auth: false },
    },

    // Game rules
    {
      method: 'GET',
      path: '/api/quiz/rules',
      handler: async (ctx: any) => {
        ctx.body = {
          success: true,
          data: {
            general: {
              totalPhases: 50,
              questionsPerPhase: 10,
              timePerQuestion: SCORING.timePerQuestion,
              supportedLocales: SUPPORTED_LOCALES,
            },
            message: 'Basic rules - full rules available via quiz service',
          },
        };
      },
      config: { auth: false },
    },

    // Start quiz (optional auth - associates session with user)
    {
      method: 'POST',
      path: '/api/quiz/start',
      handler: [
        optionalAuth,
        async (ctx: any) => {
          try {
            const user = ctx.state.user as AuthContext | undefined;
            const {
              phaseNumber = 1,
              locale = 'pt',
              excludeQuestions = [],
              forceImage = false,
              ensureImage = true,
              includeDrafts = false,
            } = ctx.request.body || {};

            // Validate inputs
            const validation = combineValidations(
              validatePhaseNumber(phaseNumber),
              validateLocale(locale)
            );

            if (!validation.valid) {
              return ctx.badRequest(formatValidationErrors(validation.errors));
            }

            let questions: any[] = [];

          const selectorService = strapi.service('api::quiz-engine.selector');
          if (selectorService && typeof selectorService.selectPhaseQuestions === 'function') {
            const selected = await selectorService.selectPhaseQuestions({
              phaseNumber,
              locale,
              excludeQuestions: Array.isArray(excludeQuestions) ? excludeQuestions : [],
              recentTopics: [],
              userPerformance: {},
              forceImage: !!forceImage || !!ensureImage,
              includeDrafts: process.env.NODE_ENV !== 'production' && !!includeDrafts,
            });
            questions = (selected || []).slice(0, 10);
          } else {
            // Fallback selection using precise phase distribution
            const distribution = getDifficultyDistribution(Number(phaseNumber));
            if (!distribution || distribution.length === 0) {
              return ctx.badRequest('Invalid phase number. Must be between 1 and 50.');
            }

            const levels = [...new Set(distribution.map((d) => d.level))];

            // Use direct SQL query for reliable locale filtering
            const knex = strapi.db.connection;
            let query = knex('questions as q')
              .leftJoin('files_related_mph as frm', function (this: any) {
                this.on('frm.related_id', '=', 'q.id')
                  .andOnVal('frm.related_type', 'api::question.question')
                  .andOnVal('frm.field', 'image');
              })
              .leftJoin('files as f', 'f.id', 'frm.file_id')
              .select(
                'q.id',
                'q.document_id as documentId',
                'q.question',
                'q.option_a as optionA',
                'q.option_b as optionB',
                'q.option_c as optionC',
                'q.option_d as optionD',
                'q.correct_option as correctOption',
                'q.explanation',
                'q.topic',
                'q.level',
                'q.locale',
                'q.base_id as baseId',
                'q.question_type as questionType',
                'f.id as imageId',
                'f.url as imageUrl',
                'f.name as imageName'
              )
              .where('q.locale', locale)
              .whereIn('q.level', levels);

            // Only filter by published in production
            if (process.env.NODE_ENV === 'production' || !includeDrafts) {
              query = query.whereNotNull('q.published_at');
            }

            const rows = await query.limit(1500);

            // Map to expected format
            const pool = rows.map((r: any) => ({
              id: r.id,
              documentId: r.documentId,
              question: r.question,
              optionA: r.optionA,
              optionB: r.optionB,
              optionC: r.optionC,
              optionD: r.optionD,
              correctOption: r.correctOption,
              explanation: r.explanation,
              topic: r.topic,
              level: r.level,
              locale: r.locale,
              baseId: r.baseId,
              questionType: r.questionType || (r.imageId ? 'image' : 'text'),
              image: r.imageId
                ? { id: r.imageId, url: r.imageUrl, name: r.imageName }
                : null,
            }));

            strapi.log.info(
              `Phase ${phaseNumber} - Locale: ${locale}, Levels: [${levels}], Pool: ${pool?.length || 0} questions`
            );

            // Group by level
            const byLevel: Record<number, any[]> = {};
            for (const lvl of levels) byLevel[lvl] = [];
            for (const q of pool || []) {
              if (byLevel[q.level]) byLevel[q.level].push(q);
            }

            // Select according to distribution
            const picked: any[] = [];
            const usedIds = new Set<number>();

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

              if (addedForLevel < count) {
                strapi.log.warn(
                  `Phase ${phaseNumber}: Only found ${addedForLevel}/${count} questions for level ${level}`
                );
              }
            }

            questions = diversifyTopics(picked, 10);
            strapi.log.info(
              `Selected ${questions.length} questions for phase ${phaseNumber}`
            );
          }

          if (!questions || questions.length === 0) {
            return ctx.badRequest(
              `No questions available for phase ${phaseNumber} in locale ${locale}`
            );
          }

          // Normalize questions
          questions = (questions || []).map((q) => normalizeQuestion(q, locale));

          // Enrich with image URLs
          try {
            const ids = (questions || []).map((q) => q?.id).filter(Boolean);
            const imageMap = await fetchImageUrlsByQuestionIds(strapi, ids);
            questions = (questions || []).map((q) => {
              const imgUrl = q?.imageUrl || imageMap.get(q?.id) || null;
              return {
                ...q,
                imageUrl: imgUrl,
                questionType: imgUrl ? 'image' : q?.questionType || 'text',
              };
            });
          } catch (e: any) {
            strapi.log.warn(`Could not enrich questions with images: ${e.message}`);
          }

          // Ensure at least one image question if requested
          if (forceImage || ensureImage) {
            const hasImage = questions.some((q) => !!q.imageUrl);
            if (!hasImage) {
              const phaseLevels = getDifficultyDistribution(Number(phaseNumber)).map(
                (d) => d.level
              );
              const candidate = await fetchImageCandidateForPhase(strapi, {
                locale,
                levels: phaseLevels,
                includeDrafts: process.env.NODE_ENV !== 'production' && !!includeDrafts,
              });

              if (candidate) {
                const imgCandidate = {
                  id: candidate.id,
                  documentId: candidate.documentId,
                  question: candidate.question,
                  optionA: candidate.optionA,
                  optionB: candidate.optionB,
                  optionC: candidate.optionC,
                  optionD: candidate.optionD,
                  explanation: candidate.explanation,
                  level: candidate.level,
                  topic: candidate.topic,
                  locale: candidate.locale || locale,
                  questionType: 'image',
                  imageUrl: candidate.imageUrl,
                };

                const sameLevelIdx = questions.findIndex(
                  (q) => q.level === imgCandidate.level
                );
                const replaceIdx = sameLevelIdx >= 0 ? sameLevelIdx : 0;
                questions[replaceIdx] = imgCandidate;
              } else {
                strapi.log.warn(
                  `ensureImage=true but no image questions found (phase=${phaseNumber}, locale=${locale})`
                );
              }
            }
          }

          // Create session (with user info if authenticated)
          const sessionId = generateSessionId();
          const sessionObj = createSession({
            sessionId,
            phaseNumber,
            locale,
            questions,
            firebaseUid: user?.firebaseUid,
          });

          quizSessions.set(sessionId, sessionObj);
          await saveQuizSession(strapi, sessionObj);

          strapi.log.info(`New session created: ${sessionId}, Phase: ${phaseNumber}`);

          ctx.body = {
            success: true,
            message: 'Quiz session started successfully',
            data: {
              sessionId,
              phaseNumber,
              totalQuestions: questions.length,
              timePerQuestion: SCORING.timePerQuestion,
              locale,
              startedAt: new Date().toISOString(),
            },
          };
        } catch (error: any) {
          strapi.log.error('Error starting quiz:', error);
          ctx.internalServerError('Failed to start quiz session');
        }
        },
      ],
      config: { auth: false },
    },

    // Pool stats
    {
      method: 'GET',
      path: '/api/quiz/pool-stats',
      handler: async (ctx: any) => {
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
              message: `${total} questions available in ${locale}`,
            },
          };
        } catch (error: any) {
          strapi.log.error('Error getting pool stats:', error);
          ctx.internalServerError('Failed to get pool statistics');
        }
      },
      config: { auth: false },
    },

    // Get current question
    {
      method: 'GET',
      path: '/api/quiz/question/:sessionId',
      handler: async (ctx: any) => {
        try {
          const { sessionId } = ctx.params;

          const session = await getSession(strapi, sessionId);
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
              questionIndex: session.currentQuestionIndex + 1,
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
                locale: question.locale,
                questionType: question.questionType || (question.imageUrl ? 'image' : 'text'),
                imageUrl: question.imageUrl || null,
              },
              timeRemaining: SCORING.timePerQuestion,
              timePerQuestion: SCORING.timePerQuestion,
              currentScore: session.score || 0,
              currentStreak: session.streakCount || 0,
            },
          };

          await saveQuizSession(strapi, session);
        } catch (error: any) {
          strapi.log.error('Error getting question:', error);
          ctx.internalServerError('Failed to get question');
        }
      },
      config: { auth: false },
    },

    // Submit answer
    {
      method: 'POST',
      path: '/api/quiz/answer',
      handler: async (ctx: any) => {
        try {
          const {
            sessionId,
            selectedOption,
            timeUsed = 15000,
            questionId,
            isTimeout = false,
          } = ctx.request.body;

          // Validate inputs
          const validations = [validateSessionId(sessionId)];

          if (!isTimeout) {
            validations.push(validateOption(selectedOption));
          }
          if (timeUsed !== undefined) {
            validations.push(validateTimeUsed(timeUsed));
          }
          if (questionId !== undefined) {
            validations.push(validateQuestionId(questionId));
          }

          const validation = combineValidations(...validations);
          if (!validation.valid) {
            return ctx.badRequest(formatValidationErrors(validation.errors));
          }

          // Get question to check answer
          let isCorrect = false;
          let correctOption = 'A';
          let questionData: any = null;
          let questionLevel = 1;

          strapi.log.info(
            `Checking answer - QuestionID: ${questionId}, Selected: ${selectedOption}, Timeout: ${isTimeout}`
          );

          if (questionId) {
            try {
              questionData = await strapi.db.query('api::question.question').findOne({
                where: { id: questionId },
                select: ['id', 'correctOption', 'explanation', 'level'],
              });

              if (questionData) {
                correctOption = questionData.correctOption;
                questionLevel = questionData.level || 1;
                isCorrect = !isTimeout && selectedOption === questionData.correctOption;

                strapi.log.info(
                  `Question found - Correct: ${correctOption}, Selected: ${selectedOption}, IsCorrect: ${isCorrect}`
                );
              } else {
                strapi.log.warn(`Question not found with ID: ${questionId}`);
              }
            } catch (error: any) {
              strapi.log.error(`Error fetching question ${questionId}:`, error);
            }
          }

          // Calculate points
          const { basePoints, speedBonus, speedMultiplier, totalPoints: initialPoints } =
            calculatePoints({
              level: questionLevel,
              timeUsed,
              isCorrect,
            });

          let totalPoints = initialPoints;

          // Get or create session
          let session = await getSession(strapi, sessionId);
          if (!session) {
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
              status: 'active',
            };
          }

          // Update session stats
          session.score += totalPoints;
          session.currentQuestionIndex += 1;
          session.totalTime += timeUsed;

          let streakBonus = 0;
          if (isCorrect) {
            session.correctAnswers += 1;
            session.streakCount += 1;
            session.maxStreak = Math.max(session.maxStreak, session.streakCount);

            streakBonus = calculateStreakBonus(session.streakCount);
            if (streakBonus > 0) {
              session.score += streakBonus;
              totalPoints += streakBonus;
              strapi.log.info(
                `Streak bonus: ${streakBonus} points (streak: ${session.streakCount})`
              );
            }
          } else {
            session.incorrectAnswers += 1;
            session.streakCount = 0;
          }

          // Record answer
          session.answers.push({
            questionId,
            selectedOption,
            correctOption,
            isCorrect,
            isTimeout,
            timeUsed,
            points: totalPoints,
          });

          // Check if phase complete
          const isPhaseComplete = session.currentQuestionIndex >= 10;
          if (isPhaseComplete) {
            session.status = 'completed';
            session.completedAt = new Date().toISOString();

            // Perfect bonus
            if (session.correctAnswers === 10) {
              const perfectBonus = calculatePerfectBonus(session.score);
              session.score += perfectBonus;
              strapi.log.info(`Perfect Bonus: +${perfectBonus} points!`);
            }
          }

          quizSessions.set(sessionId, session);
          await saveQuizSession(strapi, session);

          strapi.log.info(
            `Session ${sessionId} - Score: ${session.score}, Streak: ${session.streakCount}, Progress: ${session.currentQuestionIndex}/10`
          );

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
                level: questionLevel,
              },
              scoreResult: {
                basePoints,
                speedBonus,
                speedMultiplier,
                totalPoints,
                streakBonus,
              },
              sessionStatus: {
                currentQuestionIndex: session.currentQuestionIndex,
                totalQuestions: 10,
                score: session.score,
                streakCount: session.streakCount,
                maxStreak: session.maxStreak,
                correctAnswers: session.correctAnswers,
                incorrectAnswers: session.incorrectAnswers,
                isPhaseComplete,
              },
            },
          };
        } catch (error: any) {
          strapi.log.error('Error submitting answer:', error);
          ctx.internalServerError('Failed to submit answer');
        }
      },
      config: { auth: false },
    },

    // Get session
    {
      method: 'GET',
      path: '/api/quiz/session/:sessionId',
      handler: async (ctx: any) => {
        try {
          const { sessionId } = ctx.params;

          const session = await getSession(strapi, sessionId);
          if (!session) {
            return ctx.notFound('Session not found or expired');
          }

          ctx.body = {
            success: true,
            data: session,
          };
        } catch (error: any) {
          strapi.log.error('Error getting session:', error);
          ctx.internalServerError('Failed to get session');
        }
      },
      config: { auth: false },
    },

    // Finish quiz
    {
      method: 'POST',
      path: '/api/quiz/finish/:sessionId',
      handler: async (ctx: any) => {
        try {
          const { sessionId } = ctx.params;

          let session = await getSession(strapi, sessionId);
          if (!session) {
            return ctx.notFound('Session not found');
          }

          session.status = 'completed';
          session.completedAt = new Date().toISOString();

          const accuracy =
            session.totalQuestions > 0
              ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
              : 0;

          const passed = accuracy >= SCORING.passThreshold;

          const avgTime =
            session.answers.length > 0
              ? Math.round(session.totalTime / session.answers.length)
              : 0;

          // Detect achievements
          const achievements: string[] = [];
          if (session.correctAnswers === 10) achievements.push('perfect_score');
          if (session.maxStreak >= 10) achievements.push('streak_master');
          if (avgTime < 10000) achievements.push('speed_demon');

          quizSessions.set(sessionId, session);
          await saveQuizSession(strapi, session);

          strapi.log.info(
            `Phase ${session.phaseNumber} finished - Score: ${session.score}, Accuracy: ${accuracy}%, Passed: ${passed}`
          );

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
              nextPhaseUnlocked: passed,
            },
          };
        } catch (error: any) {
          strapi.log.error('Error finishing quiz:', error);
          ctx.internalServerError('Failed to finish quiz');
        }
      },
      config: { auth: false },
    },
  ];
}
