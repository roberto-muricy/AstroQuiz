/**
 * Question Routes
 * CRUD API endpoints for questions
 */

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

    // Bulk import questions using Entity Service
    // Appears in Content Manager with proper i18n locale support
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

            let imported = 0;
            const errors: { index: number; baseId: string; locale: string; error: string }[] = [];

            // Process each question group
            for (let i = 0; i < questionGroups.length; i++) {
              const group = questionGroups[i];
              const locales = group.locales || {};
              const baseId = group.baseId;

              // Create each locale using Entity Service (appears in Content Manager)
              for (const [locale, q] of Object.entries(locales)) {
                if (!q || typeof q !== 'object') continue;

                const questionData = q as any;

                try {
                  await strapi.entityService.create('api::question.question', {
                    data: {
                      question: questionData.question,
                      optionA: questionData.optionA,
                      optionB: questionData.optionB,
                      optionC: questionData.optionC,
                      optionD: questionData.optionD,
                      correctOption: questionData.correctOption,
                      explanation: questionData.explanation || '',
                      topic: questionData.topic || 'Geral',
                      topicKey: questionData.topicKey || null,
                      level: questionData.level || 1,
                      baseId: baseId || null,
                      questionType: questionData.questionType || 'text',
                      publishedAt: new Date().toISOString(),
                    },
                    locale: locale, // Pass locale as parameter for proper i18n
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
  ];
}
