// In-memory session storage
const quizSessions = new Map();

// Persist quiz sessions to survive Strapi restarts/hot-reload (prevents 404 "Session not found")
const QUIZ_SESSION_TABLE = 'quiz_sessions';
const QUIZ_SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function ensureQuizSessionTable(strapi) {
  const knex = strapi.db.connection;
  const has = await knex.schema.hasTable(QUIZ_SESSION_TABLE);
  if (has) return;

  await knex.schema.createTable(QUIZ_SESSION_TABLE, (t) => {
    t.string('session_id').primary();
    t.text('data').notNullable(); // JSON string
    t.datetime('created_at').notNullable();
    t.datetime('updated_at').notNullable();
    t.datetime('expires_at').notNullable();
  });

  strapi.log.info(`✅ Created ${QUIZ_SESSION_TABLE} table`);
}

async function cleanupExpiredQuizSessions(strapi) {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  try {
    const deleted = await knex(QUIZ_SESSION_TABLE).where('expires_at', '<', nowIso).del();
    if (deleted > 0) strapi.log.info(`🧹 Deleted ${deleted} expired quiz sessions`);
  } catch (e) {
    // ignore cleanup failures
  }
}

async function saveQuizSession(strapi, session) {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + QUIZ_SESSION_TTL_MS).toISOString();
  const payload = JSON.stringify(session);

  await knex(QUIZ_SESSION_TABLE)
    .insert({
      session_id: session.sessionId,
      data: payload,
      created_at: session.startedAt || nowIso,
      updated_at: nowIso,
      expires_at: expiresIso,
    })
    .onConflict('session_id')
    .merge({
      data: payload,
      updated_at: nowIso,
      expires_at: expiresIso,
    });
}

async function loadQuizSession(strapi, sessionId) {
  const knex = strapi.db.connection;
  const nowIso = new Date().toISOString();
  const row = await knex(QUIZ_SESSION_TABLE)
    .where({ session_id: sessionId })
    .andWhere('expires_at', '>=', nowIso)
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

async function fetchImageUrlsByQuestionIds(strapi, questionIds) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return new Map();
  const knex = strapi.db.connection;

  const rows = await knex('files_related_mph as frm')
    .join('files as f', 'f.id', 'frm.file_id')
    .select('frm.related_id as questionId', 'f.url as imageUrl')
    .whereIn('frm.related_id', questionIds)
    .andWhere('frm.related_type', 'api::question.question')
    .andWhere('frm.field', 'image');

  const map = new Map();
  for (const r of rows || []) {
    if (r?.questionId && r?.imageUrl) map.set(r.questionId, r.imageUrl);
  }
  return map;
}

async function fetchImageCandidateForPhase(strapi, { locale, levels, includeDrafts }) {
  const knex = strapi.db.connection;

  let query = knex('questions as q')
    .join('files_related_mph as frm', function (this: any) {
      this.on('frm.related_id', '=', 'q.id')
        .andOnVal('frm.related_type', 'api::question.question')
        .andOnVal('frm.field', 'image');
    })
    .join('files as f', 'f.id', 'frm.file_id')
    .select(
      'q.id',
      'q.document_id as documentId',
      'q.question',
      'q.option_a as optionA',
      'q.option_b as optionB',
      'q.option_c as optionC',
      'q.option_d as optionD',
      'q.explanation',
      'q.level',
      'q.topic',
      'q.locale',
      'f.url as imageUrl',
    )
    .where('q.locale', locale)
    .whereIn('q.level', Array.isArray(levels) ? levels : [])
    .orderBy('q.id', 'asc')
    .limit(1);

  if (!includeDrafts) {
    query = query.andWhereRaw("q.published_at IS NOT NULL AND q.published_at != ''");
  }

  const rows = await query;
  return rows?.[0] || null;
}

function requireWriteTokenIfConfigured(ctx) {
  const requiredToken = process.env.STRAPI_WRITE_TOKEN;
  if (!requiredToken) return;

  const authHeader = ctx.request.headers?.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  if (!bearer || bearer !== requiredToken) {
    ctx.unauthorized('Invalid or missing write token');
  }
}

async function fetchQuestionRowById(strapi, id) {
  const knex = strapi.db.connection;
  const rows = await knex('questions as q')
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
      'q.topic_key as topicKey',
      'q.level',
      'q.locale',
      'q.base_id as baseId',
      'q.question_type as questionType',
      'q.published_at as publishedAt',
      'q.created_at as createdAt',
      'q.updated_at as updatedAt',
      'f.id as imageId',
      'f.url as imageUrl',
      'f.name as imageName',
    )
    .where('q.id', Number(id))
    .limit(1);

  const r = rows?.[0];
  if (!r) return null;
  return {
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
    topicKey: r.topicKey,
    level: r.level,
    locale: r.locale,
    baseId: r.baseId,
    questionType: r.questionType || (r.imageId ? 'image' : 'text'),
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    image: r.imageId ? { id: r.imageId, url: r.imageUrl, name: r.imageName } : null,
  };
}

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
    await ensureQuizSessionTable(strapi);
    await cleanupExpiredQuizSessions(strapi);

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
      // Questions API routes - uses raw DB query for reliable image population
      {
        method: 'GET',
        path: '/api/questions',
        handler: async (ctx) => {
          try {
            const {
              locale = 'en',
              limit = 100,
              start = 0,
              baseId,
              questionType,
              published,
              withImage,
            } = ctx.query;

            // Use Knex raw SQL for reliable image relation lookup
            // (Strapi entityService has issues with media populate + i18n)
            const knex = strapi.db.connection;

            let query = knex('questions as q')
              .leftJoin('files_related_mph as frm', function(this: any) {
                this.on('frm.related_id', '=', 'q.id')
                  .andOnVal('frm.related_type', 'api::question.question')
                  .andOnVal('frm.field', 'image');
              })
              .leftJoin('files as f', 'f.id', 'frm.file_id')
              .select(
                'q.id', 'q.document_id as documentId', 'q.question',
                'q.option_a as optionA', 'q.option_b as optionB',
                'q.option_c as optionC', 'q.option_d as optionD',
                'q.correct_option as correctOption', 'q.explanation',
                'q.topic', 'q.topic_key as topicKey', 'q.level', 'q.locale',
                'q.base_id as baseId', 'q.question_type as questionType',
                'q.published_at as publishedAt', 'q.created_at as createdAt',
                'f.id as imageId', 'f.url as imageUrl', 'f.name as imageName'
              )
              .where('q.locale', locale);

            if (baseId) query = query.andWhere('q.base_id', baseId);
            if (published === 'true') query = query.andWhereRaw("q.published_at IS NOT NULL AND q.published_at != ''");
            if (published === 'false') query = query.andWhereRaw("(q.published_at IS NULL OR q.published_at = '')");
            if (withImage === 'true') query = query.whereNotNull('f.id');
            if (withImage === 'false') query = query.whereNull('f.id');
            if (questionType === 'image') query = query.andWhereRaw("(q.question_type = 'image' OR f.id IS NOT NULL)");
            else if (questionType === 'text') query = query.andWhereRaw("(q.question_type IS NULL OR q.question_type = 'text') AND f.id IS NULL");
            else if (questionType) query = query.andWhere('q.question_type', questionType);

            query = query.orderBy('q.id', 'desc');
            const rows = await query;

            // Transform to API format
            const data = rows.slice(Number(start) || 0, (Number(start) || 0) + (Number(limit) || 100)).map((r: any) => ({
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
              topicKey: r.topicKey,
              level: r.level,
              locale: r.locale,
              baseId: r.baseId,
              questionType: r.questionType || (r.imageId ? 'image' : 'text'),
              publishedAt: r.publishedAt,
              createdAt: r.createdAt,
              image: r.imageId ? { id: r.imageId, url: r.imageUrl, name: r.imageName } : null,
            }));

            ctx.body = { data, meta: { total: rows.length } };
          } catch (error) {
            strapi.log.error('GET /api/questions error:', error);
            ctx.throw(500, error.message);
          }
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/questions/:id',
        handler: async (ctx) => {
          try {
            const { id } = ctx.params;
            const row = await fetchQuestionRowById(strapi, id);
            if (!row) return ctx.notFound('Question not found');
            ctx.body = { data: row };
          } catch (error) {
            strapi.log.error('GET /api/questions/:id error:', error);
            ctx.throw(500, error.message);
          }
        },
        config: { auth: false },
      },
      {
        method: 'POST',
        path: '/api/questions',
        handler: async (ctx) => {
          try {
            requireWriteTokenIfConfigured(ctx);

            // Accept both shapes:
            // - { data: {...} } (Strapi-standard)
            // - { ... } (simple)
            const body = ctx.request.body || {};
            const data = body?.data && typeof body.data === 'object' ? body.data : body;

            // Allow publishing via ?publish=true or by passing publishedAt explicitly.
            const publish = ctx.query?.publish === 'true';
            const normalizedData = {
              ...data,
              ...(publish && !data.publishedAt ? { publishedAt: new Date().toISOString() } : {}),
            };

            const question = await strapi.entityService.create('api::question.question', {
              data: normalizedData,
              populate: { image: true },
            });
            ctx.body = { data: question };
          } catch (error) {
            ctx.throw(500, error.message);
          }
        },
        config: { auth: false },
      },
      {
        method: 'PUT',
        path: '/api/questions/:id',
        handler: async (ctx) => {
          try {
            requireWriteTokenIfConfigured(ctx);

            const { id } = ctx.params;
            const body = ctx.request.body || {};
            const data = body?.data && typeof body.data === 'object' ? body.data : body;

            // Allow editing localized text fields + (optionally) correctOption/topicKey/questionType/level
            const patch: Record<string, any> = {};
            const mapField = (key: string, col: string) => {
              if (data[key] !== undefined) patch[col] = data[key];
            };

            mapField('question', 'question');
            mapField('optionA', 'option_a');
            mapField('optionB', 'option_b');
            mapField('optionC', 'option_c');
            mapField('optionD', 'option_d');
            mapField('explanation', 'explanation');
            mapField('topic', 'topic');

            mapField('correctOption', 'correct_option');
            mapField('topicKey', 'topic_key');
            mapField('questionType', 'question_type');
            mapField('level', 'level');

            // Always bump updated_at
            patch.updated_at = new Date().toISOString();

            const knex = strapi.db.connection;
            const changed = await knex('questions').where('id', Number(id)).update(patch);
            if (!changed) return ctx.notFound('Question not found');

            const row = await fetchQuestionRowById(strapi, id);
            ctx.body = { data: row };
          } catch (error) {
            strapi.log.error('PUT /api/questions/:id error:', error);
            ctx.throw(500, error.message);
          }
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
            const {
              phaseNumber = 1,
              locale = 'pt',
              excludeQuestions = [],
              forceImage = false,
              // New default behavior: ensure at least one image question if available for the phase/locale.
              ensureImage = true,
              includeDrafts = false,
            } = ctx.request.body || {};

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
                excludeQuestions: Array.isArray(excludeQuestions) ? excludeQuestions : [],
                recentTopics: [],
                userPerformance: {},
                // Ensure at least one image question when available (can be disabled by client if needed).
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

              // Extract unique levels needed for this phase
              const levels = [...new Set(distribution.map(d => d.level))];

              // Fetch 2x more questions than needed to enable topic diversification
              const pool = await strapi.entityService.findMany('api::question.question', {
                filters: {
                  locale,
                  level: { $in: levels },
                },
                limit: 1500,
                // NOTE: for draftAndPublish collections, this keeps only published.
                // For dev testing, allow drafts explicitly.
                ...(process.env.NODE_ENV !== 'production' && includeDrafts ? {} : { publicationState: 'live' }),
                populate: { image: true },
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

            // Normalize question objects and include image info for the mobile app
            const normalizeQuestion = (q) => {
              const imgUrl =
                q?.imageUrl ||
                q?.image?.url ||
                (Array.isArray(q?.image) ? q.image?.[0]?.url : null) ||
                null;

              // Be defensive: if we have an image URL, it's an image question (even if questionType is wrong).
              const qType = imgUrl ? 'image' : (q?.questionType || q?.question_type || 'text');

              return {
                id: q.id,
                documentId: q.documentId,
                question: q.question,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                explanation: q.explanation,
                level: q.level,
                topic: q.topic,
                locale: q.locale || locale,
                questionType: qType,
                imageUrl: imgUrl,
              };
            };

            questions = (questions || []).map(normalizeQuestion);

            // Enrich selected questions with imageUrl using DB join (entityService populate can miss it).
            try {
              const ids = (questions || []).map(q => q?.id).filter(Boolean);
              const imageMap = await fetchImageUrlsByQuestionIds(strapi, ids);
              questions = (questions || []).map((q) => {
                const imgUrl = q?.imageUrl || imageMap.get(q?.id) || null;
                return {
                  ...q,
                  imageUrl: imgUrl,
                  questionType: imgUrl ? 'image' : (q?.questionType || 'text'),
                };
              });
            } catch (e) {
              strapi.log.warn(`⚠️ Could not enrich questions with images: ${e.message}`);
            }

            // Ensure at least one image question is present (if any exists in the pool)
            if (forceImage || ensureImage) {
              const hasImage = questions.some(q => !!q.imageUrl);
              if (!hasImage) {
                const phaseLevels = getDifficultyDistribution(Number(phaseNumber)).map(d => d.level);
                const candidate = await fetchImageCandidateForPhase(strapi, {
                  locale,
                  levels: phaseLevels,
                  includeDrafts: process.env.NODE_ENV !== 'production' && !!includeDrafts,
                });

                const imgCandidate = candidate
                  ? {
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
                    }
                  : null;

                if (imgCandidate) {
                  // Replace a question of the same level when possible
                  const sameLevelIdx = questions.findIndex(q => q.level === imgCandidate.level);
                  const replaceIdx = sameLevelIdx >= 0 ? sameLevelIdx : 0;
                  questions[replaceIdx] = imgCandidate;
                } else {
                  strapi.log.warn(`⚠️ ensureImage=true but no image questions found (phase=${phaseNumber}, locale=${locale})`);
                }
              }
            }

            // Create simple session ID
            const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Inicializar sessão em memória + persistir no DB (survive restarts)
            const sessionObj = {
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
            };

            quizSessions.set(sessionId, sessionObj);
            await saveQuizSession(strapi, sessionObj);
            
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

            let session = quizSessions.get(sessionId);
            if (!session) {
              session = await loadQuizSession(strapi, sessionId);
              if (session) quizSessions.set(sessionId, session);
            }
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
                timeRemaining: 30000,
                timePerQuestion: 30000,
                currentScore: session.score || 0,
                currentStreak: session.streakCount || 0
              }
            };

            // Keep session fresh in DB
            await saveQuizSession(strapi, session);
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
              session = await loadQuizSession(strapi, sessionId);
              if (session) quizSessions.set(sessionId, session);
            }
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
            await saveQuizSession(strapi, session);
            
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
            
            let session = quizSessions.get(sessionId);
            if (!session) {
              session = await loadQuizSession(strapi, sessionId);
              if (session) quizSessions.set(sessionId, session);
            }
            
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
            
            let session = quizSessions.get(sessionId);
            if (!session) {
              session = await loadQuizSession(strapi, sessionId);
              if (session) quizSessions.set(sessionId, session);
            }
            
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
            await saveQuizSession(strapi, session);
            
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
      // User Profile routes (Firebase UID sync)
      {
        method: 'POST',
        path: '/api/user-profile/sync',
        handler: async (ctx) => {
          try {
            const { firebaseUid, email, displayName, photoURL } = ctx.request.body;

            if (!firebaseUid) {
              return ctx.badRequest('Firebase UID is required');
            }

            // Try to find existing profile
            let profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid }
            });

            if (!profile) {
              // Create new profile with default stats
              profile = await strapi.db.query('api::user-profile.user-profile').create({
                data: {
                  firebaseUid,
                  email,
                  displayName,
                  photoURL,
                  totalXP: 0,
                  phasesCompleted: 0,
                  perfectPhases: 0,
                  totalQuestionsAnswered: 0,
                  totalCorrectAnswers: 0,
                  maxStreak: 0,
                  currentStreak: 0,
                  fastAnswers: 0,
                  achievements: [],
                  phaseStats: {},
                  lastSyncedAt: new Date()
                }
              });
              
              strapi.log.info(`✅ Created new user profile for ${displayName} (${firebaseUid})`);
            } else {
              // Update profile info if changed
              profile = await strapi.db.query('api::user-profile.user-profile').update({
                where: { id: profile.id },
                data: {
                  email,
                  displayName,
                  photoURL,
                  lastSyncedAt: new Date()
                }
              });
              
              strapi.log.info(`✅ Synced user profile for ${displayName} (${firebaseUid})`);
            }

            ctx.body = { success: true, data: profile };
          } catch (error) {
            strapi.log.error('Error syncing user profile:', error);
            ctx.internalServerError('Failed to sync user profile');
          }
        },
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/api/user-profile/:firebaseUid/stats',
        handler: async (ctx) => {
          try {
            const { firebaseUid } = ctx.params;

            const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid }
            });

            if (!profile) {
              return ctx.notFound('User profile not found');
            }

            ctx.body = { success: true, data: profile };
          } catch (error) {
            strapi.log.error('Error getting stats:', error);
            ctx.internalServerError('Failed to get stats');
          }
        },
        config: { auth: false },
      },
      {
        method: 'PUT',
        path: '/api/user-profile/:firebaseUid/stats',
        handler: async (ctx) => {
          try {
            const { firebaseUid } = ctx.params;
            const updates = ctx.request.body;

            const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid }
            });

            if (!profile) {
              return ctx.notFound('User profile not found');
            }

            const updatedProfile = await strapi.db.query('api::user-profile.user-profile').update({
              where: { id: profile.id },
              data: {
                ...updates,
                lastSyncedAt: new Date()
              }
            });

            strapi.log.info(`✅ Updated stats for ${firebaseUid}`);
            ctx.body = { success: true, data: updatedProfile };
          } catch (error) {
            strapi.log.error('Error updating stats:', error);
            ctx.internalServerError('Failed to update stats');
          }
        },
        config: { auth: false },
      },
    ]);
    
    strapi.log.info('✅ Quiz Engine routes registered successfully');
    strapi.log.info('✅ User Profile routes registered successfully');
  },
};
