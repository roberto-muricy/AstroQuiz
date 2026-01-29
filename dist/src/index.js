"use strict";
/**
 * AstroQuiz Backend - Strapi Bootstrap
 *
 * Entry point that registers all custom routes.
 * Route handlers are modularized in src/routes/
 * Business logic is in src/services/
 */
Object.defineProperty(exports, "__esModule", { value: true });
const quiz_session_1 = require("./services/quiz-session");
const firebase_auth_1 = require("./services/firebase-auth");
const rate_limit_1 = require("./middlewares/rate-limit");
const quiz_routes_1 = require("./routes/quiz-routes");
const question_routes_1 = require("./routes/question-routes");
const user_profile_routes_1 = require("./routes/user-profile-routes");
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     */
    register( /*{ strapi }*/) { },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     */
    async bootstrap({ strapi }) {
        // Initialize Firebase Admin SDK
        (0, firebase_auth_1.initializeFirebase)();
        // Initialize quiz session table and cleanup expired sessions
        await (0, quiz_session_1.ensureQuizSessionTable)(strapi);
        await (0, quiz_session_1.cleanupExpiredQuizSessions)(strapi);
        // Apply global rate limiting (100 requests per minute per IP)
        strapi.server.use((0, rate_limit_1.createRateLimitMiddleware)({
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 100, // 100 requests per minute
            skipPaths: ['/api/quiz/health', '/_health', '/admin'],
        }));
        strapi.log.info('Rate limiting enabled: 100 req/min per IP');
        // Register all custom routes
        const routes = [
            ...(0, quiz_routes_1.createQuizRoutes)(strapi),
            ...(0, question_routes_1.createQuestionRoutes)(strapi),
            ...(0, user_profile_routes_1.createUserProfileRoutes)(strapi),
        ];
        strapi.server.routes(routes);
        strapi.log.info('Quiz Engine routes registered successfully');
        strapi.log.info('Question API routes registered successfully');
        strapi.log.info('User Profile routes registered successfully');
    },
};
