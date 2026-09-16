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
  comTravaDaSessao,
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
  preferirIneditas,
  embaralharAlternativas,
  letraOriginal,
  letraEmbaralhada,
  isValidLocale,
  SUPPORTED_LOCALES,
  SCORING,
} from '../services/quiz-logic';
import {
  decidirResposta,
  aplicarResposta,
  tempoEfetivo,
  marcarEntrega,
  encerrarSessao,
  sessaoParaCliente,
  corpoDeRegistroAntigo,
} from '../services/quiz-answer-rules';
import { registrarResultadoDaSessao } from '../services/phase-results';
import { limparCacheDoRanking } from '../services/leaderboard-service';
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
  validateRequestId,
  combineValidations,
  formatValidationErrors,
} from '../services/validation';

/**
 * Quanto o health check espera pelo banco antes de considerar que ele nao
 * responde. Curto de proposito: um banco que trava e tao ruim quanto um banco
 * fora, e o health nao pode ficar pendurado ate o tempo de conexao (60 s).
 */
export const TEMPO_LIMITE_DO_HEALTH_MS = 2000;

/**
 * O banco responde? Uma consulta minima, sem contar linhas: o health e chamado
 * com frequencia, inclusive pelo Railway a cada deploy.
 */
async function bancoRespondendo(strapi: any): Promise<boolean> {
  let temporizador: any;
  try {
    await Promise.race([
      strapi.db.connection.raw('select 1'),
      new Promise((_, rejeitar) => {
        temporizador = setTimeout(() => rejeitar(new Error('tempo esgotado')), TEMPO_LIMITE_DO_HEALTH_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

export function createQuizRoutes(strapi: any): any[] {
  const optionalAuth = createOptionalAuthMiddleware(strapi);

  // Grava o resultado da fase uma unica vez. Uma falha aqui nao derruba a
  // resposta do jogador: /finish tenta gravar de novo.
  async function registrarResultado(session: any): Promise<void> {
    try {
      // Resultado novo muda o ranking: a proxima leitura recalcula.
      if (await registrarResultadoDaSessao(strapi.db.connection, session)) {
        limparCacheDoRanking();
      }
    } catch (error: any) {
      strapi.log.error(`Error recording phase result for ${session?.sessionId}:`, error);
    }
  }

  return [
    // Health check
    //
    // Responde 503 quando o banco nao responde. Ate 16/09/2026 devolvia 200
    // sempre: uma instancia com o banco fora passava por saudavel, e o Railway
    // promovia e mantinha um container que so sabia devolver erro 500. Quem
    // consome isto (o Railway e o app) trata 2xx como saudavel, entao o codigo
    // e o que importa aqui, mais do que o corpo.
    {
      method: 'GET',
      path: '/api/quiz/health',
      handler: async (ctx: any) => {
        const instante = new Date().toISOString();

        if (!(await bancoRespondendo(strapi))) {
          strapi.log.error('Health check failed: database is not responding');
          ctx.status = 503;
          ctx.body = {
            success: false,
            message: 'Database is not responding',
            data: { status: 'degraded', database: 'down', timestamp: instante, version: '1.0.0' },
          };
          return;
        }

        const response: any = {
          success: true,
          message: 'Quiz service is healthy',
          data: { status: 'ok', database: 'up', timestamp: instante, version: '1.0.0' },
        };

        // Only expose debug info in non-production
        if (process.env.NODE_ENV !== 'production') {
          response.data.debug = {
            databaseClient: strapi.db.connection?.client?.constructor?.name || 'unknown',
            env: {
              DATABASE_CLIENT: process.env.DATABASE_CLIENT || 'not set',
              DATABASE_URL_SET: !!process.env.DATABASE_URL,
              NODE_ENV: process.env.NODE_ENV,
            },
          };
        }

        ctx.body = response;
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

            // Perguntas que o jogador ja viu, enviadas pelo cliente.
            //
            // Este caminho ignorava excludeQuestions por completo. Nao era um
            // caso de borda: o `strapi.service('api::quiz-engine.selector')`
            // logo acima nunca resolve — a api quiz-engine nao tem
            // content-types, entao o Strapi 5 nao a registra — e portanto ESTE
            // e o unico caminho de selecao que roda em producao. Medido contra
            // o ar: excluindo as 237 perguntas de nivel 1-2 em pt, a fase 1
            // devolvia 10 perguntas, todas da lista excluida.
            const jaVistas = new Set<number>(
              (Array.isArray(excludeQuestions) ? excludeQuestions : [])
                .map((id: any) => Number(id))
                .filter((id: number) => Number.isFinite(id))
            );

            // Select according to distribution
            const picked: any[] = [];
            const usedIds = new Set<number>();

            for (const { level, count } of distribution) {
              const candidates = preferirIneditas(byLevel[level] || [], jaVistas);
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

          // Embaralha as alternativas de cada pergunta.
          //
          // Fica aqui, depois da troca por pergunta com imagem, senao a
          // substituta escaparia do embaralhamento.
          //
          // A ordem sorteada vive na sessao: e ela que o app recebe e e contra
          // o `correctOption` dela que a resposta e conferida mais abaixo. O
          // banco continua com a ordem original e nao e tocado.
          questions = questions.map((q) => embaralharAlternativas(q));

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

          // Relogio do servidor para esta pergunta. So a primeira entrega
          // conta: buscar a mesma pergunta de novo nao zera o tempo.
          marcarEntrega(session, session.currentQuestionIndex, Date.now());

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
    //
    // As decisoes (repeticao, ordem, fim da fase, tempo e pontos) vivem em
    // src/services/quiz-answer-rules.ts, que e puro e testado. Aqui so se busca
    // o gabarito no banco e se persiste o resultado.
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
            isSkipped = false,
            requestId,
          } = ctx.request.body || {};

          const validations = [validateSessionId(sessionId), validateRequestId(requestId)];
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

          // Uma resposta por vez por sessao. Entre decidir e gravar ha um await
          // (a busca do gabarito); sem a trava, o toque e o tempo esgotado
          // chegando juntos contavam a mesma pergunta duas vezes.
          await comTravaDaSessao(sessionId, async () => {
            const session = await getSession(strapi, sessionId);

            // Sessao desconhecida nao e mais criada na hora. Aquilo existia para
            // nao perder respostas de sessoes expiradas, mas deixava qualquer um
            // corrigir perguntas avulsas do banco e ler o gabarito delas.
            if (!session) {
              ctx.notFound('Session not found or expired');
              return;
            }

            const decisao = decidirResposta(session, { questionId, requestId });

            if (decisao.tipo === 'repetida') {
              ctx.body =
                decisao.registro.resposta || corpoDeRegistroAntigo(session, decisao.registro);
              return;
            }
            if (decisao.tipo === 'encerrada') {
              ctx.conflict('Session already completed');
              return;
            }
            if (decisao.tipo === 'fora-de-ordem') {
              ctx.conflict('Question does not match session');
              return;
            }

            const { pergunta, indice } = decisao;

            // As alternativas foram embaralhadas quando a sessao foi criada, e a
            // sessao guarda a permutacao (nunca o gabarito). A letra que o app
            // mandou e traduzida para a do banco, e a correcao e feita contra o
            // banco. So a pergunta atual da sessao e corrigida.
            const escolhidaNoBanco = letraOriginal(selectedOption, pergunta.ordemAlternativas);

            let questionData: any = null;
            try {
              questionData = await strapi.db.query('api::question.question').findOne({
                where: { id: pergunta.id },
                select: ['id', 'correctOption', 'explanation', 'level'],
              });
            } catch (error: any) {
              strapi.log.error(`Error fetching question ${pergunta.id}:`, error);
            }
            if (!questionData) {
              strapi.log.warn(`Question not found with ID: ${pergunta.id}`);
            }

            const isCorrect =
              !isTimeout && !!questionData && escolhidaNoBanco === questionData.correctOption;
            // Devolvido na posicao em que o app desenhou a alternativa: e com
            // esta letra que a tela destaca a resposta certa.
            const correctOption = questionData
              ? letraEmbaralhada(questionData.correctOption, pergunta.ordemAlternativas)
              : 'A';
            const agora = Date.now();

            const { corpo, completouAgora } = aplicarResposta(session, {
              questionId: pergunta.id,
              indice,
              selectedOption,
              correctOption,
              isCorrect,
              isTimeout: !!isTimeout,
              isSkipped: !!isSkipped,
              level: questionData?.level || pergunta.level || 1,
              requestId,
              explanation: questionData?.explanation ?? null,
              tempo: tempoEfetivo({
                clienteMs: timeUsed,
                entregueEm: session.servedAt?.[indice],
                agora,
                indice,
              }),
              agora,
            });

            quizSessions.set(sessionId, session);
            await saveQuizSession(strapi, session);

            if (completouAgora) {
              await registrarResultado(session);
            }

            strapi.log.info(
              `Session ${sessionId} - Question ${pergunta.id} correct: ${isCorrect}, Score: ${session.score}, Progress: ${session.currentQuestionIndex}/${session.totalQuestions}`
            );

            ctx.body = corpo;
          });
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

          const validation = validateSessionId(sessionId);
          if (!validation.valid) {
            return ctx.badRequest(formatValidationErrors(validation.errors));
          }

          const session = await getSession(strapi, sessionId);
          if (!session) {
            return ctx.notFound('Session not found or expired');
          }

          // Rota publica e o app nao a usa. Sai sem o uid do dono, sem os
          // instantes de entrega, sem os corpos guardados das respostas e sem
          // as explicacoes, que muitas vezes contem a resposta certa.
          ctx.body = {
            success: true,
            data: sessaoParaCliente(session, { comPerguntas: true }),
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
      handler: [
        optionalAuth,
        async (ctx: any) => {
          try {
            const { sessionId } = ctx.params;

            const validation = validateSessionId(sessionId);
            if (!validation.valid) {
              return ctx.badRequest(formatValidationErrors(validation.errors));
            }

            await comTravaDaSessao(sessionId, async () => {
              const session = await getSession(strapi, sessionId);
              if (!session) {
                ctx.notFound('Session not found');
                return;
              }

              // Token ausente ou vencido segue em frente: o id da sessao ja e o
              // segredo, e tudo aqui e idempotente. So um token VALIDO de outra
              // pessoa e recusado. Exigir login prenderia a tela de resultado de
              // versoes antigas, que guardam o token mesmo depois de vencido.
              const user = ctx.state.user as AuthContext | undefined;
              if (user && session.firebaseUid && user.firebaseUid !== session.firebaseUid) {
                ctx.forbidden('Session belongs to another user');
                return;
              }

              const resumo = encerrarSessao(session, Date.now());
              if (resumo.mudou) {
                quizSessions.set(sessionId, session);
                await saveQuizSession(strapi, session);
              }

              // Normalmente ja foi gravado na ultima resposta. Aqui cobre o caso
              // em que aquela gravacao falhou; a linha nunca e duplicada.
              if (session.status === 'completed') {
                await registrarResultado(session);
              }

              strapi.log.info(
                `Phase ${session.phaseNumber} finished - Score: ${session.score}, Accuracy: ${resumo.accuracy}%, Passed: ${resumo.passed}, Status: ${session.status}`
              );

              ctx.body = {
                success: true,
                message: 'Quiz session completed',
                data: {
                  ...sessaoParaCliente(session, { comPerguntas: false }),
                  finalScore: session.score,
                  accuracy: resumo.accuracy,
                  passed: resumo.passed,
                  averageTimePerQuestion: resumo.averageTimePerQuestion,
                  achievements: resumo.achievements,
                  nextPhaseUnlocked: resumo.passed,
                },
              };
            });
          } catch (error: any) {
            strapi.log.error('Error finishing quiz:', error);
            ctx.internalServerError('Failed to finish quiz');
          }
        },
      ],
      config: { auth: false },
    },
  ];
}
