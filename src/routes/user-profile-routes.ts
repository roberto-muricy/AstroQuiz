/**
 * User Profile Routes
 * Firebase UID sync and stats management
 */

import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  AuthContext,
} from '../middlewares/auth';

export function createUserProfileRoutes(strapi: any): any[] {
  const authMiddleware = createAuthMiddleware(strapi);
  const optionalAuth = createOptionalAuthMiddleware(strapi);

  return [
    // Sync profile (requires auth - uses token UID)
    {
      method: 'POST',
      path: '/api/user-profile/sync',
      handler: [
        optionalAuth,
        async (ctx: any) => {
          try {
            const user = ctx.state.user as AuthContext | undefined;
            const body = ctx.request.body || {};

            // Use authenticated UID if available, otherwise from body
            const firebaseUid = user?.firebaseUid || body.firebaseUid;
            const email = user?.email || body.email;
            const { displayName, photoURL } = body;

            if (!firebaseUid) {
              return ctx.badRequest('Firebase UID is required');
            }

            let profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid },
            });

            if (!profile) {
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
                  isBlocked: false,
                  role: 'user',
                  lastSyncedAt: new Date(),
                },
              });

              strapi.log.info(
                `Created new user profile for ${displayName} (${firebaseUid})`
              );
            } else {
              // Check if blocked
              if (profile.isBlocked) {
                return ctx.forbidden('Account is blocked');
              }

              profile = await strapi.db.query('api::user-profile.user-profile').update({
                where: { id: profile.id },
                data: {
                  email,
                  displayName,
                  photoURL,
                  lastSyncedAt: new Date(),
                },
              });

              strapi.log.info(`Synced user profile for ${displayName} (${firebaseUid})`);
            }

            ctx.body = { success: true, data: profile };
          } catch (error: any) {
            strapi.log.error('Error syncing user profile:', error);
            ctx.internalServerError('Failed to sync user profile');
          }
        },
      ],
      config: { auth: false },
    },

    // Get stats (requires auth - can only view own stats unless admin)
    {
      method: 'GET',
      path: '/api/user-profile/:firebaseUid/stats',
      handler: [
        authMiddleware,
        async (ctx: any) => {
          try {
            const { firebaseUid } = ctx.params;
            const user = ctx.state.user as AuthContext;

            // Users can only view their own stats (admins can view any)
            if (user.firebaseUid !== firebaseUid && user.role !== 'admin') {
              return ctx.forbidden('Cannot view other user stats');
            }

            const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid },
            });

            if (!profile) {
              return ctx.notFound('User profile not found');
            }

            ctx.body = { success: true, data: profile };
          } catch (error: any) {
            strapi.log.error('Error getting stats:', error);
            ctx.internalServerError('Failed to get stats');
          }
        },
      ],
      config: { auth: false },
    },

    // Update stats (requires auth - can only update own stats unless admin)
    {
      method: 'PUT',
      path: '/api/user-profile/:firebaseUid/stats',
      handler: [
        authMiddleware,
        async (ctx: any) => {
          try {
            const { firebaseUid } = ctx.params;
            const user = ctx.state.user as AuthContext;
            const updates = ctx.request.body;

            // Users can only update their own stats (admins can update any)
            if (user.firebaseUid !== firebaseUid && user.role !== 'admin') {
              return ctx.forbidden('Cannot update other user stats');
            }

            // Prevent non-admins from changing role or isBlocked
            if (user.role !== 'admin') {
              delete updates.role;
              delete updates.isBlocked;
            }

            const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid },
            });

            if (!profile) {
              return ctx.notFound('User profile not found');
            }

            const updatedProfile = await strapi.db
              .query('api::user-profile.user-profile')
              .update({
                where: { id: profile.id },
                data: {
                  ...updates,
                  lastSyncedAt: new Date(),
                },
              });

            strapi.log.info(`Updated stats for ${firebaseUid}`);
            ctx.body = { success: true, data: updatedProfile };
          } catch (error: any) {
            strapi.log.error('Error updating stats:', error);
            ctx.internalServerError('Failed to update stats');
          }
        },
      ],
      config: { auth: false },
    },

    // Get own profile (shortcut - requires auth)
    {
      method: 'GET',
      path: '/api/user-profile/me',
      handler: [
        authMiddleware,
        async (ctx: any) => {
          try {
            const user = ctx.state.user as AuthContext;

            const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
              where: { firebaseUid: user.firebaseUid },
            });

            if (!profile) {
              return ctx.notFound('User profile not found');
            }

            ctx.body = { success: true, data: profile };
          } catch (error: any) {
            strapi.log.error('Error getting profile:', error);
            ctx.internalServerError('Failed to get profile');
          }
        },
      ],
      config: { auth: false },
    },
  ];
}
