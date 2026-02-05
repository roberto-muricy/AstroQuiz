/**
 * Question Routes
 * CRUD API endpoints for questions
 */

import axios from 'axios';
import {
  fetchQuestionRowById,
  requireWriteTokenIfConfigured,
} from '../services/question-service';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  AuthContext,
} from '../middlewares/auth';
import {
  validateQuestionData,
  validateLocale,
  validateLevel,
  formatValidationErrors,
} from '../services/validation';

/**
 * Middleware that requires admin role OR valid write token
 */
function createAdminOrTokenMiddleware(strapi: any) {
  const authMiddleware = createOptionalAuthMiddleware(strapi);

  return async (ctx: any, next: () => Promise<void>) => {
    // First try Firebase auth
    await authMiddleware(ctx, async () => {});

    const user = ctx.state.user as AuthContext | undefined;

    // If authenticated as admin, allow
    if (user?.role === 'admin') {
      await next();
      return;
    }

    // Otherwise, require write token
    requireWriteTokenIfConfigured(ctx);
    await next();
  };
}

export function createQuestionRoutes(strapi: any): any[] {
  const adminOrToken = createAdminOrTokenMiddleware(strapi);

  return [
    // List questions
    {
      method: 'GET',
      path: '/api/questions',
      handler: async (ctx: any) => {
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
              'q.topic_key as topicKey',
              'q.level',
              'q.locale',
              'q.base_id as baseId',
              'q.question_type as questionType',
              'q.published_at as publishedAt',
              'q.created_at as createdAt',
              'f.id as imageId',
              'f.url as imageUrl',
              'f.name as imageName'
            )
            .where('q.locale', locale);

          if (baseId) query = query.andWhere('q.base_id', baseId);

          // By default, only return published questions
          if (published === 'false') {
            query = query.andWhereRaw("q.published_at IS NULL");
          } else if (published !== 'all') {
            // published='true' or undefined (default)
            query = query.andWhereRaw("q.published_at IS NOT NULL");
          }
          if (withImage === 'true') query = query.whereNotNull('f.id');
          if (withImage === 'false') query = query.whereNull('f.id');
          if (questionType === 'image')
            query = query.andWhereRaw("(q.question_type = 'image' OR f.id IS NOT NULL)");
          else if (questionType === 'text')
            query = query.andWhereRaw(
              "(q.question_type IS NULL OR q.question_type = 'text') AND f.id IS NULL"
            );
          else if (questionType) query = query.andWhere('q.question_type', questionType);

          query = query.orderBy('q.id', 'desc');
          const rows = await query;

          const data = rows
            .slice(Number(start) || 0, (Number(start) || 0) + (Number(limit) || 100))
            .map((r: any) => ({
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
              image: r.imageId
                ? { id: r.imageId, url: r.imageUrl, name: r.imageName }
                : null,
            }));

          ctx.body = { data, meta: { total: rows.length } };
        } catch (error: any) {
          strapi.log.error('GET /api/questions error:', error);
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },

    // Get single question
    {
      method: 'GET',
      path: '/api/questions/:id',
      handler: async (ctx: any) => {
        try {
          const { id } = ctx.params;
          const row = await fetchQuestionRowById(strapi, id);
          if (!row) return ctx.notFound('Question not found');
          ctx.body = { data: row };
        } catch (error: any) {
          strapi.log.error('GET /api/questions/:id error:', error);
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },

    // Create question (requires admin or write token)
    {
      method: 'POST',
      path: '/api/questions',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const body = ctx.request.body || {};
            const data = body?.data && typeof body.data === 'object' ? body.data : body;

            // Validate question data
            const validation = validateQuestionData(data);
            if (!validation.valid) {
              return ctx.badRequest(formatValidationErrors(validation.errors));
            }

            const publish = ctx.query?.publish === 'true';
            const locale = data.locale || 'en'; // Extract locale from data

            // Remove locale from data (will be passed as parameter)
            const { locale: _, ...dataWithoutLocale } = data;

            const normalizedData = {
              ...dataWithoutLocale,
              ...(publish && !data.publishedAt
                ? { publishedAt: new Date().toISOString() }
                : {}),
            };

            const question = await strapi.entityService.create('api::question.question', {
              data: normalizedData,
              locale: locale, // Pass locale as parameter for i18n
              populate: { image: true },
            });
            ctx.body = { data: question };
          } catch (error: any) {
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Update question (requires admin or write token)
    {
      method: 'PUT',
      path: '/api/questions/:id',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { id } = ctx.params;
            const body = ctx.request.body || {};
            const data = body?.data && typeof body.data === 'object' ? body.data : body;

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

            patch.updated_at = new Date().toISOString();

            const knex = strapi.db.connection;
            const changed = await knex('questions').where('id', Number(id)).update(patch);
            if (!changed) return ctx.notFound('Question not found');

            const row = await fetchQuestionRowById(strapi, id);
            ctx.body = { data: row };
          } catch (error: any) {
            strapi.log.error('PUT /api/questions/:id error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Bulk import questions (requires admin or write token)
    {
      method: 'POST',
      path: '/api/questions/import',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const body = ctx.request.body || {};
            const questions = Array.isArray(body.questions) ? body.questions : [];
            const publish = ctx.query?.publish !== 'false';

            if (questions.length === 0) {
              return ctx.badRequest('No questions provided');
            }

            if (questions.length > 100) {
              return ctx.badRequest('Maximum 100 questions per request');
            }

            const knex = strapi.db.connection;
            const now = new Date().toISOString();
            let imported = 0;
            const errors: { index: number; error: string }[] = [];

            for (let i = 0; i < questions.length; i++) {
              const q = questions[i];

              // Validate required fields
              if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctOption) {
                errors.push({ index: i, error: 'Missing required fields' });
                continue;
              }

              // Generate document_id
              const documentId = require('crypto').randomBytes(12).toString('base64url');

              try {
                await knex('questions').insert({
                  document_id: documentId,
                  question: q.question,
                  option_a: q.optionA,
                  option_b: q.optionB,
                  option_c: q.optionC,
                  option_d: q.optionD,
                  correct_option: q.correctOption,
                  explanation: q.explanation || null,
                  topic: q.topic || 'Geral',
                  topic_key: q.topicKey || null,
                  level: q.level || 1,
                  base_id: q.baseId || null,
                  locale: q.locale || 'en',
                  question_type: q.questionType || 'text',
                  created_at: now,
                  updated_at: now,
                  published_at: publish ? now : null,
                });
                imported++;
              } catch (insertError: any) {
                errors.push({ index: i, error: insertError.message });
              }
            }

            ctx.body = {
              success: true,
              data: {
                imported,
                errors: errors.length,
                total: questions.length,
                errorDetails: errors.slice(0, 10), // Only first 10 errors
              },
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/import error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Bulk import questions using Entity Service with proper i18n linking
    // Creates EN first, then links other locales to same documentId
    {
      method: 'POST',
      path: '/api/questions/import-v2',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const body = ctx.request.body || {};
            const questionGroups = Array.isArray(body.questions) ? body.questions : [];

            if (questionGroups.length === 0) {
              return ctx.badRequest('No questions provided');
            }

            if (questionGroups.length > 100) {
              return ctx.badRequest('Maximum 100 question groups per request');
            }

            const knex = strapi.db.connection;
            const now = new Date().toISOString();
            let imported = 0;
            const errors: { index: number; baseId: string; locale: string; error: string }[] = [];

            // Process each question group
            for (let i = 0; i < questionGroups.length; i++) {
              const group = questionGroups[i];
              const locales = group.locales || {};
              const baseId = group.baseId;

              // Priority order: en, pt, es, fr
              const localeOrder = ['en', 'pt', 'es', 'fr'];
              const sortedLocales = localeOrder.filter(loc => locales[loc]);

              if (sortedLocales.length === 0) continue;

              let documentId: string | null = null;

              // Create first locale via Entity Service (appears in Content Manager)
              const firstLocale = sortedLocales[0];
              const firstData = locales[firstLocale] as any;

              try {
                const created = await strapi.entityService.create('api::question.question', {
                  data: {
                    question: firstData.question,
                    optionA: firstData.optionA,
                    optionB: firstData.optionB,
                    optionC: firstData.optionC,
                    optionD: firstData.optionD,
                    correctOption: firstData.correctOption,
                    explanation: firstData.explanation || '',
                    topic: firstData.topic || 'Geral',
                    topicKey: firstData.topicKey || null,
                    level: firstData.level || 1,
                    baseId: baseId || null,
                    questionType: firstData.questionType || 'text',
                    publishedAt: now,
                  },
                  locale: firstLocale,
                });
                documentId = created.documentId;
                imported++;
              } catch (err: any) {
                errors.push({
                  index: i,
                  baseId: baseId || 'unknown',
                  locale: firstLocale,
                  error: err.message,
                });
                continue; // Skip other locales if first fails
              }

              // Create remaining locales with same documentId (SQL insert)
              for (let j = 1; j < sortedLocales.length; j++) {
                const locale = sortedLocales[j];
                const questionData = locales[locale] as any;

                try {
                  await knex('questions').insert({
                    document_id: documentId,
                    question: questionData.question,
                    option_a: questionData.optionA,
                    option_b: questionData.optionB,
                    option_c: questionData.optionC,
                    option_d: questionData.optionD,
                    correct_option: questionData.correctOption,
                    explanation: questionData.explanation || '',
                    topic: questionData.topic || 'Geral',
                    topic_key: questionData.topicKey || null,
                    level: questionData.level || 1,
                    base_id: baseId || null,
                    locale: locale,
                    question_type: questionData.questionType || 'text',
                    created_at: now,
                    updated_at: now,
                    published_at: now,
                  });
                  imported++;
                } catch (err: any) {
                  errors.push({
                    index: i,
                    baseId: baseId || 'unknown',
                    locale,
                    error: err.message,
                  });
                }
              }
            }

            ctx.body = {
              success: true,
              data: {
                imported,
                errors: errors.length,
                total: questionGroups.length,
                errorDetails: errors.slice(0, 10),
              },
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/import-v2 error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Delete question (requires admin or write token)
    {
      method: 'DELETE',
      path: '/api/questions/:id',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { id } = ctx.params;
            const { locale } = ctx.query;

            // If locale=* delete all localizations
            if (locale === '*') {
              // Delete by documentId (all locales)
              const documents = strapi.documents('api::question.question');
              await documents.delete({ documentId: id });
              ctx.body = { data: { deleted: true, documentId: id } };
            } else {
              // Delete single row by id
              const knex = strapi.db.connection;
              const deleted = await knex('questions').where('id', Number(id)).del();
              if (!deleted) return ctx.notFound('Question not found');
              ctx.body = { data: { deleted: true, id } };
            }
          } catch (error: any) {
            strapi.log.error('DELETE /api/questions/:id error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Debug endpoint to check question structure
    {
      method: 'GET',
      path: '/api/questions/debug-structure',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const knex = strapi.db.connection;

            // Get one EN question to see its structure
            const sample = await knex('questions')
              .where('locale', 'en')
              .first();

            ctx.body = {
              success: true,
              columns: sample ? Object.keys(sample) : [],
              sampleData: sample,
            };
          } catch (error: any) {
            strapi.log.error('GET /api/questions/debug-structure error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Delete all questions of a specific locale (including drafts)
    {
      method: 'POST',
      path: '/api/questions/delete-locale',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { locale } = ctx.request.body || {};

            if (!locale) {
              return ctx.badRequest('locale is required');
            }

            strapi.log.info(`Deleting all questions with locale: ${locale}`);

            // Delete directly from database (includes drafts and published)
            const knex = strapi.db.connection;
            const deleted = await knex('questions')
              .where('locale', locale)
              .del();

            strapi.log.info(`Deleted ${deleted} questions with locale ${locale}`);

            ctx.body = {
              success: true,
              message: `Deleted ${deleted} questions with locale ${locale}`,
              deleted,
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/delete-locale error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Add localization to existing question using Document Service
    {
      method: 'POST',
      path: '/api/questions/add-localization',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const body = ctx.request.body || {};
            const {
              documentId,
              locale,
              question,
              optionA,
              optionB,
              optionC,
              optionD,
              correctOption,
              explanation,
              topic,
              level,
              baseId,
              questionType,
            } = body;

            if (!documentId || !locale) {
              return ctx.badRequest('documentId and locale are required');
            }

            // Check if localization already exists (use SQL for reliability)
            const knex = strapi.db.connection;

            strapi.log.info(`Checking if ${locale} localization exists for documentId: ${documentId}`);

            // Check if localization already exists
            const existing = await knex('questions')
              .where('document_id', documentId)
              .where('locale', locale)
              .first();

            strapi.log.info(`Duplicate check result: ${existing ? 'FOUND (will skip)' : 'NOT FOUND (will create)'}`);

            if (existing) {
              strapi.log.info(`${locale} localization already exists for document ${documentId} (id: ${existing.id})`);
              return ctx.body = {
                success: true,
                message: `${locale} localization already exists for document ${documentId}`,
                data: existing,
                skipped: true,
              };
            }

            strapi.log.info(`Creating ${locale} localization for document ${documentId}`);

            // Use Document Service update with locale parameter (Strapi v5 correct method)
            // This creates a new locale for existing documentId
            const documents = strapi.documents('api::question.question');

            const created = await documents.update({
              documentId: documentId,
              locale: locale,
              data: {
                question: question,
                optionA: optionA,
                optionB: optionB,
                optionC: optionC,
                optionD: optionD,
                correctOption: correctOption,
                explanation: explanation || '',
                topic: topic || 'Geral',
                topicKey: null,
                level: level || 1,
                baseId: baseId || null,
                questionType: questionType || 'text',
              },
            });

            // Publish the new locale
            await documents.publish({
              documentId: documentId,
              locale: locale,
            });

            strapi.log.info(`Created ${locale} localization for documentId ${documentId}`);

            ctx.body = {
              success: true,
              message: `Added ${locale} localization to document ${documentId}`,
              data: created,
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/add-localization error:', error);
            strapi.log.error('Error stack:', error.stack);
            strapi.log.error('Error details:', JSON.stringify(error, null, 2));
            ctx.status = 500;
            ctx.body = {
              success: false,
              error: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              details: error,
            };
          }
        },
      ],
      config: { auth: false },
    },

    // Test DeepL connection
    {
      method: 'GET',
      path: '/api/questions/test-deepl',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

            if (!DEEPL_API_KEY) {
              return ctx.body = {
                success: false,
                error: 'DEEPL_API_KEY not configured',
              };
            }

            const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
            const DEEPL_API_URL = isFreeKey
              ? 'https://api-free.deepl.com/v2'
              : 'https://api.deepl.com/v2';

            strapi.log.info(`Testing DeepL connection...`);
            strapi.log.info(`Key type: ${isFreeKey ? 'Free' : 'Pro'}`);
            strapi.log.info(`URL: ${DEEPL_API_URL}`);
            strapi.log.info(`Key (first 10 chars): ${DEEPL_API_KEY.substring(0, 10)}...`);

            try {
              // Test with usage endpoint
              const response = await axios.get(`${DEEPL_API_URL}/usage`, {
                headers: {
                  Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                },
                timeout: 10000,
              });

              ctx.body = {
                success: true,
                keyType: isFreeKey ? 'Free' : 'Pro',
                url: DEEPL_API_URL,
                usage: response.data,
              };
            } catch (error: any) {
              strapi.log.error('DeepL test failed:', error.response?.data || error.message);
              ctx.body = {
                success: false,
                keyType: isFreeKey ? 'Free' : 'Pro',
                url: DEEPL_API_URL,
                error: error.response?.data || error.message,
                status: error.response?.status,
              };
            }
          } catch (error: any) {
            strapi.log.error('Test endpoint error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Translate all EN questions to PT using DeepL
    {
      method: 'POST',
      path: '/api/questions/translate-to-pt',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

            if (!DEEPL_API_KEY) {
              return ctx.badRequest('DEEPL_API_KEY not configured');
            }

            // Auto-detect API URL based on key type
            // Free keys end with :fx or :f, Pro keys don't have suffix
            const isFreeKey = DEEPL_API_KEY.endsWith(':fx') || DEEPL_API_KEY.endsWith(':f');
            const DEEPL_API_URL = isFreeKey
              ? 'https://api-free.deepl.com/v2'
              : 'https://api.deepl.com/v2';

            strapi.log.info(`🔍 DeepL Key type: ${isFreeKey ? 'Free' : 'Pro'}`);
            strapi.log.info(`🔍 DeepL URL: ${DEEPL_API_URL}`);

            // Get all EN questions
            const enQuestions = await strapi.entityService.findMany('api::question.question', {
              filters: { locale: 'en' },
              limit: 10000,
            });

            // Get all PT questions to check what's already translated
            const ptQuestions = await strapi.entityService.findMany('api::question.question', {
              filters: { locale: 'pt' },
              limit: 10000,
            });

            const ptDocIds = new Set(ptQuestions.map((q: any) => q.documentId));
            const questionsToTranslate = enQuestions.filter((q: any) => !ptDocIds.has(q.documentId));

            strapi.log.info(`Found ${enQuestions.length} EN questions, ${ptQuestions.length} PT, need to translate ${questionsToTranslate.length}`);

            if (questionsToTranslate.length === 0) {
              return ctx.body = {
                success: true,
                message: 'All questions already translated to PT',
                stats: { total: enQuestions.length, alreadyTranslated: ptQuestions.length, translated: 0 },
              };
            }

            const knex = strapi.db.connection;
            const now = new Date().toISOString();
            let success = 0;
            let errors = 0;
            const errorLog: any[] = [];

            // Translate in batches to avoid timeout
            const batchSize = 10;
            for (let i = 0; i < questionsToTranslate.length; i += batchSize) {
              const batch = questionsToTranslate.slice(i, i + batchSize);

              for (const enQuestion of batch) {
                try {
                  // Prepare texts to translate
                  const textsToTranslate = [
                    enQuestion.question,
                    enQuestion.optionA || '',
                    enQuestion.optionB || '',
                    enQuestion.optionC || '',
                    enQuestion.optionD || '',
                    enQuestion.explanation || '',
                    enQuestion.topic || '',
                  ];

                  // Call DeepL API
                  const translateUrl = `${DEEPL_API_URL}/translate`;
                  strapi.log.debug(`Translating ${enQuestion.baseId} - URL: ${translateUrl}`);

                  const response = await axios.post(
                    translateUrl,
                    {
                      text: textsToTranslate,
                      source_lang: 'EN',
                      target_lang: 'PT',
                    },
                    {
                      headers: {
                        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                      timeout: 30000,
                    }
                  );

                  const translations = response.data.translations.map((t: any) => t.text);

                  // Check if PT localization already exists
                  const existing = await knex('questions')
                    .where({ document_id: enQuestion.documentId, locale: 'pt' })
                    .first();

                  if (existing) {
                    strapi.log.warn(`PT already exists for ${enQuestion.baseId}, skipping`);
                    continue;
                  }

                  // Insert PT localization
                  await knex('questions').insert({
                    document_id: enQuestion.documentId,
                    question: translations[0],
                    option_a: translations[1],
                    option_b: translations[2],
                    option_c: translations[3],
                    option_d: translations[4],
                    correct_option: enQuestion.correctOption,
                    explanation: translations[5],
                    topic: translations[6],
                    topic_key: null,
                    level: enQuestion.level,
                    base_id: enQuestion.baseId || null,
                    locale: 'pt',
                    question_type: enQuestion.questionType || 'text',
                    created_at: now,
                    updated_at: now,
                    published_at: now,
                  });

                  success++;
                  strapi.log.info(`Translated ${enQuestion.baseId} to PT (${success}/${questionsToTranslate.length})`);

                  // Small delay to respect rate limits
                  await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (error: any) {
                  errors++;
                  const errorMsg = error.response?.data?.message || error.message || String(error);
                  errorLog.push({
                    baseId: enQuestion.baseId,
                    error: errorMsg,
                  });
                  strapi.log.error(`Failed to translate ${enQuestion.baseId}:`, errorMsg);
                  strapi.log.error('Full error:', error);
                }
              }
            }

            ctx.body = {
              success: true,
              message: 'Translation completed',
              stats: {
                total: enQuestions.length,
                alreadyTranslated: ptQuestions.length,
                translated: success,
                errors: errors,
              },
              errorLog: errorLog.slice(0, 10),
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/translate-to-pt error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Truncate questions table (DANGER - requires admin or write token)
    {
      method: 'POST',
      path: '/api/questions/truncate',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const knex = strapi.db.connection;
            const deleted = await knex('questions').del();
            ctx.body = { success: true, message: `Deleted ${deleted} questions` };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/truncate error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Fix topicKey using Documents API (Strapi v5)
    {
      method: 'POST',
      path: '/api/questions/fix-topickey-documents-api',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { locale = 'en', limit = 100, offset = 0 } = ctx.request.body || {};
            const knex = strapi.db.connection;

            // Get questions with topic_key from raw DB (with pagination)
            const rows = await knex('questions')
              .select('id', 'document_id', 'base_id', 'topic_key', 'question_type', 'locale')
              .where('locale', locale)
              .whereNotNull('topic_key')
              .andWhere('topic_key', '!=', '')
              .orderBy('id', 'asc')
              .limit(limit)
              .offset(offset);

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
              try {
                // Use Documents API to update (this will properly sync with Admin)
                // Include both topicKey and questionType
                await strapi.documents('api::question.question').update({
                  documentId: row.document_id,
                  locale: row.locale,
                  data: {
                    topicKey: row.topic_key,
                    questionType: row.question_type || 'text',
                  },
                });

                successCount++;
                results.push({ documentId: row.document_id, locale: row.locale, success: true });
              } catch (e: any) {
                errorCount++;
                results.push({ documentId: row.document_id, locale: row.locale, success: false, error: e.message });
              }
            }

            // Get total count for this locale
            const totalCount = await knex('questions')
              .where('locale', locale)
              .whereNotNull('topic_key')
              .andWhere('topic_key', '!=', '')
              .count('* as count')
              .first();

            const total = Number(totalCount?.count || 0);
            const remaining = Math.max(0, total - (offset + rows.length));

            ctx.body = {
              success: true,
              message: `Processed ${rows.length} questions for locale ${locale}`,
              stats: {
                processed: rows.length,
                success: successCount,
                errors: errorCount,
                total,
                remaining,
              },
              pagination: {
                locale,
                offset,
                limit,
                nextOffset: remaining > 0 ? offset + limit : null,
              },
              results: results.slice(0, 10),
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/fix-topickey-documents-api error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // Fix questionType for image questions (astro_img pattern)
    {
      method: 'POST',
      path: '/api/questions/fix-image-question-type',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { pattern = 'astro_img', locale = 'en' } = ctx.request.body || {};
            const knex = strapi.db.connection;

            // Get questions matching the pattern with question_type='image' in DB
            const rows = await knex('questions')
              .select('id', 'document_id', 'base_id', 'question_type', 'locale')
              .where('locale', locale)
              .where('base_id', 'like', `%${pattern}%`)
              .whereNotNull('document_id')
              .orderBy('id', 'asc');

            const results = {
              total: rows.length,
              updated: 0,
              errors: 0,
              details: [] as any[],
            };

            for (const row of rows) {
              try {
                // Force update questionType via Documents API
                await strapi.documents('api::question.question').update({
                  documentId: row.document_id,
                  locale: row.locale,
                  data: {
                    questionType: 'image',
                  },
                });

                results.updated++;
                results.details.push({
                  id: row.id,
                  baseId: row.base_id,
                  documentId: row.document_id,
                  success: true,
                });
              } catch (e: any) {
                results.errors++;
                results.details.push({
                  id: row.id,
                  baseId: row.base_id,
                  documentId: row.document_id,
                  success: false,
                  error: e.message,
                });
              }
            }

            ctx.body = {
              success: true,
              message: `Fixed questionType for ${results.updated} questions matching "${pattern}"`,
              pattern,
              locale,
              stats: {
                total: results.total,
                updated: results.updated,
                errors: results.errors,
              },
              details: results.details.slice(0, 10),
            };
          } catch (error: any) {
            strapi.log.error('POST /api/questions/fix-image-question-type error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // DEBUG: Check how different APIs read the data
    {
      method: 'GET',
      path: '/api/questions/debug-all-methods/:id',
      handler: async (ctx: any) => {
        try {
          const { id } = ctx.params;
          const knex = strapi.db.connection;

          // 1. Raw SQL
          const sqlRows = await knex.raw(`
            SELECT id, document_id, base_id, topic, topic_key, question_type, locale, question
            FROM questions
            WHERE id = ?
            LIMIT 1
          `, [Number(id)]);
          const sqlRow = sqlRows.rows?.[0] || sqlRows[0];

          // 2. Knex with column mapping
          const knexRow = await knex('questions')
            .select('id', 'document_id as documentId', 'base_id as baseId', 'topic', 'topic_key as topicKey', 'question_type as questionType')
            .where('id', Number(id))
            .first();

          // 3. Entity Service (Strapi v4 style)
          let entityServiceResult = null;
          try {
            entityServiceResult = await strapi.entityService.findOne('api::question.question', id);
          } catch (e: any) {
            entityServiceResult = { error: e.message };
          }

          // 4. Documents API findOne
          let documentsResult = null;
          try {
            documentsResult = await strapi.documents('api::question.question').findOne({
              documentId: sqlRow.document_id,
            });
          } catch (e: any) {
            documentsResult = { error: e.message };
          }

          ctx.body = {
            success: true,
            note: 'Compare the topicKey field across different methods',
            methods: {
              '1_rawSQL': sqlRow,
              '2_knexMapped': knexRow,
              '3_entityService': entityServiceResult,
              '4_documentsAPI': documentsResult,
            },
          };
        } catch (error: any) {
          strapi.log.error('GET /api/questions/debug-all-methods error:', error);
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },
    // DIAGNOSE: Check document_id status (simplified)
    {
      method: 'GET',
      path: '/api/questions/diagnose-document-id',
      handler: async (ctx: any) => {
        try {
          const knex = strapi.db.connection;

          // Simple count query
          const rows = await knex('questions')
            .select('id', 'document_id', 'topic_key', 'question_type', 'locale')
            .limit(10);

          const totalCount = await knex('questions').count('* as count').first();

          const analysis = {
            total: totalCount?.count || 0,
            withDocumentId: 0,
            withoutDocumentId: 0,
            withTopicKey: 0,
            withoutTopicKey: 0,
            sample: [],
          };

          for (const row of rows) {
            if (row.document_id && row.document_id.length === 24) {
              analysis.withDocumentId++;
            } else {
              analysis.withoutDocumentId++;
            }

            if (row.topic_key) {
              analysis.withTopicKey++;
            } else {
              analysis.withoutTopicKey++;
            }

            analysis.sample.push({
              id: row.id,
              documentId: row.document_id,
              documentIdLength: row.document_id ? row.document_id.length : 0,
              topicKey: row.topic_key,
              questionType: row.question_type,
              locale: row.locale,
            });
          }

          ctx.body = {
            success: true,
            diagnosis: analysis,
          };
        } catch (error: any) {
          strapi.log.error('Diagnose document_id error:', error);
          ctx.body = {
            success: false,
            error: error.message,
            stack: error.stack,
          };
        }
      },
      config: { auth: false },
    },

    // FIX: Corrigir document_id inválidos
    {
      method: 'POST',
      path: '/api/questions/fix-document-id',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const knex = strapi.db.connection;

            // Contar quantos serão corrigidos
            const toFix = await knex.raw(`
              SELECT COUNT(*) as count
              FROM questions
              WHERE document_id IS NULL
                 OR document_id = ''
                 OR LENGTH(document_id) != 24
            `);

            const countToFix = toFix.rows?.[0]?.count || toFix[0]?.count || 0;

            if (countToFix === 0) {
              return ctx.body = {
                success: true,
                message: 'No records need fixing',
                fixed: 0,
              };
            }

            // Executar correção
            await knex.raw(`
              UPDATE questions
              SET
                document_id = LOWER(
                  SUBSTRING(
                    REGEXP_REPLACE(
                      ENCODE(GEN_RANDOM_BYTES(16), 'base64'),
                      '[^a-zA-Z0-9]',
                      '',
                      'g'
                    ),
                    1,
                    24
                  )
                ),
                updated_at = NOW()
              WHERE document_id IS NULL
                 OR document_id = ''
                 OR LENGTH(document_id) != 24
            `);

            // Verificar resultado
            const afterFix = await knex.raw(`
              SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN document_id IS NOT NULL AND LENGTH(document_id) = 24 THEN 1 END) as valid,
                COUNT(CASE WHEN document_id IS NULL OR document_id = '' OR LENGTH(document_id) != 24 THEN 1 END) as still_invalid
              FROM questions
            `);

            // Verificar duplicatas
            const dupes = await knex.raw(`
              SELECT document_id, COUNT(*) as count
              FROM questions
              GROUP BY document_id
              HAVING COUNT(*) > 1
              LIMIT 5
            `);

            ctx.body = {
              success: true,
              message: `Fixed ${countToFix} records`,
              beforeFix: { toFix: countToFix },
              afterFix: afterFix.rows?.[0] || afterFix[0],
              duplicates: dupes.rows || dupes,
            };

          } catch (error: any) {
            strapi.log.error('Fix document_id error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },

    // PHASE 4: Force update all questions via Document Service
    // This ensures Strapi creates proper metadata structures for enum fields
    {
      method: 'POST',
      path: '/api/questions/force-sync-document-service',
      handler: [
        adminOrToken,
        async (ctx: any) => {
          try {
            const { locale = 'en', limit = 50, offset = 0 } = ctx.request.body || {};
            const knex = strapi.db.connection;

            strapi.log.info(`Force sync: locale=${locale}, limit=${limit}, offset=${offset}`);

            // Get questions from database with valid documentId
            const rows = await knex('questions')
              .select('id', 'document_id', 'topic_key', 'question_type', 'locale', 'base_id')
              .where('locale', locale)
              .whereNotNull('document_id')
              .andWhere('document_id', '!=', '')
              .orderBy('id', 'asc')
              .limit(limit)
              .offset(offset);

            if (rows.length === 0) {
              return ctx.body = {
                success: true,
                message: 'No more questions to process',
                processed: 0,
                errors: 0,
              };
            }

            const results = {
              processed: 0,
              success: 0,
              errors: 0,
              errorDetails: [] as any[],
            };

            // Process each question via Document Service
            for (const row of rows) {
              try {
                results.processed++;

                // Use Documents API to force update the enum fields
                await strapi.documents('api::question.question').update({
                  documentId: row.document_id,
                  locale: row.locale,
                  data: {
                    topicKey: row.topic_key,
                    questionType: row.question_type || 'text',
                  },
                });

                results.success++;

                if (results.processed % 10 === 0) {
                  strapi.log.info(`Progress: ${results.processed}/${rows.length} (${results.success} success, ${results.errors} errors)`);
                }

              } catch (error: any) {
                results.errors++;
                results.errorDetails.push({
                  id: row.id,
                  documentId: row.document_id,
                  baseId: row.base_id,
                  error: error.message,
                });
                strapi.log.error(`Failed to update question ${row.id} (${row.base_id}):`, error.message);
              }
            }

            // Get total count for this locale
            const totalCount = await knex('questions')
              .where('locale', locale)
              .whereNotNull('document_id')
              .andWhere('document_id', '!=', '')
              .count('* as count')
              .first();

            const total = Number(totalCount?.count || 0);
            const remaining = Math.max(0, total - (offset + limit));
            const nextOffset = offset + limit;

            ctx.body = {
              success: true,
              message: `Processed ${results.processed} questions for locale ${locale}`,
              locale,
              stats: {
                processed: results.processed,
                success: results.success,
                errors: results.errors,
                total,
                remaining,
              },
              pagination: {
                offset,
                limit,
                nextOffset: remaining > 0 ? nextOffset : null,
              },
              errorDetails: results.errorDetails.slice(0, 5),
            };

          } catch (error: any) {
            strapi.log.error('Force sync error:', error);
            ctx.throw(500, error.message);
          }
        },
      ],
      config: { auth: false },
    },
  ];
}
