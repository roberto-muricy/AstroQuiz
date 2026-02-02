/**
 * AstroQuiz Backend - Strapi Bootstrap
 *
 * Entry point that registers all custom routes.
 * Route handlers are modularized in src/routes/
 * Business logic is in src/services/
 */

import {
  ensureQuizSessionTable,
  cleanupExpiredQuizSessions,
} from './services/quiz-session';
import { initializeFirebase } from './services/firebase-auth';
import { createRateLimitMiddleware } from './middlewares/rate-limit';
import { createQuizRoutes } from './routes/quiz-routes';
import { createQuestionRoutes } from './routes/question-routes';
import { createUserProfileRoutes } from './routes/user-profile-routes';
import { createI18nSetupRoutes } from './routes/i18n-setup-routes';
import { createDebugRoutes } from './routes/debug-routes';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    // DEBUG: Check database configuration at runtime
    strapi.log.info('🔍 ENV VARS AT RUNTIME:');
    strapi.log.info(`  DATABASE_CLIENT: ${process.env.DATABASE_CLIENT || 'NOT SET'}`);
    strapi.log.info(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET'}`);
    strapi.log.info(`  NODE_ENV: ${process.env.NODE_ENV}`);

    const dbConfig = strapi.config.get('database');
    strapi.log.info(`  Strapi DB Client: ${dbConfig?.connection?.client || 'unknown'}`);

    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Initialize quiz session table and cleanup expired sessions
    await ensureQuizSessionTable(strapi);
    await cleanupExpiredQuizSessions(strapi);

    // Apply global rate limiting (100 requests per minute per IP)
    strapi.server.use(createRateLimitMiddleware({
      windowMs: 60 * 1000,    // 1 minute
      maxRequests: 100,       // 100 requests per minute
      skipPaths: ['/api/quiz/health', '/_health', '/admin', '/api/questions/import-v2'],
    }));
    strapi.log.info('Rate limiting enabled: 100 req/min per IP (import excluded)');

    // Register all custom routes
    const routes = [
      ...createQuizRoutes(strapi),
      ...createQuestionRoutes(strapi),
      ...createUserProfileRoutes(strapi),
      ...createI18nSetupRoutes(strapi),
      ...createDebugRoutes(strapi),
    ];

    strapi.server.routes(routes);

    strapi.log.info('Quiz Engine routes registered successfully');
    strapi.log.info('Question API routes registered successfully');
    strapi.log.info('User Profile routes registered successfully');
    strapi.log.info('Debug routes registered successfully');
    strapi.log.info('I18n Setup routes registered successfully');
  },
};
