/**
 * I18n Setup Routes
 * Helper endpoint to initialize locales in production
 */

import { requireWriteTokenIfConfigured } from '../services/question-service';

export function createI18nSetupRoutes(strapi: any): any[] {
  return [
    // Setup i18n locales
    {
      method: 'POST',
      path: '/api/i18n/setup-locales',
      handler: async (ctx: any) => {
        try {
          requireWriteTokenIfConfigured(ctx);

          const knex = strapi.db.connection;
          const now = new Date().toISOString();

          const locales = [
            { code: 'en', name: 'English (en)', is_default: true },
            { code: 'pt', name: 'Portuguese (pt)', is_default: false },
            { code: 'es', name: 'Spanish (es)', is_default: false },
            { code: 'fr', name: 'French (fr)', is_default: false },
          ];

          const results = [];

          for (const locale of locales) {
            // Check if locale already exists
            const existing = await knex('i18n_locale')
              .where('code', locale.code)
              .first();

            if (existing) {
              results.push({ code: locale.code, status: 'already_exists' });
              continue;
            }

            // Insert locale
            await knex('i18n_locale').insert({
              name: locale.name,
              code: locale.code,
              created_at: now,
              updated_at: now,
              is_default: locale.is_default,
            });

            results.push({ code: locale.code, status: 'created' });
          }

          ctx.body = {
            success: true,
            data: results,
          };
        } catch (error: any) {
          strapi.log.error('POST /api/i18n/setup-locales error:', error);
          ctx.throw(500, error.message);
        }
      },
      config: { auth: false },
    },
  ];
}
