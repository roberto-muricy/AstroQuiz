'use strict';

/**
 * user-profile controller
 * Manages user profiles linked to Firebase UID
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-profile.user-profile', ({ strapi }) => ({
  /**
   * Find or create user profile by Firebase UID
   * POST /api/user-profile/sync
   */
  async sync(ctx) {
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
        
        strapi.log.info(`✅ Updated user profile for ${displayName} (${firebaseUid})`);
      }

      return { success: true, data: profile };
    } catch (error) {
      strapi.log.error('Error syncing user profile:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Update user stats
   * PUT /api/user-profile/:firebaseUid/stats
   */
  async updateStats(ctx) {
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
      return { success: true, data: updatedProfile };
    } catch (error) {
      strapi.log.error('Error updating stats:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Get user stats
   * GET /api/user-profile/:firebaseUid/stats
   */
  async getStats(ctx) {
    try {
      const { firebaseUid } = ctx.params;

      const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
        where: { firebaseUid }
      });

      if (!profile) {
        return ctx.notFound('User profile not found');
      }

      return { success: true, data: profile };
    } catch (error) {
      strapi.log.error('Error getting stats:', error);
      ctx.throw(500, error);
    }
  }
}));
