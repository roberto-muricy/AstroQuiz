'use strict';

/**
 * user-profile router
 * Custom routes for Firebase UID sync and stats management
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/api/user-profile/sync',
      handler: 'api::user-profile.user-profile.sync',
      config: {
        policies: [],
        middlewares: [],
        auth: false, // Public endpoint (Firebase UID is the auth)
      },
    },
    {
      method: 'PUT',
      path: '/api/user-profile/:firebaseUid/stats',
      handler: 'api::user-profile.user-profile.updateStats',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/api/user-profile/:firebaseUid/stats',
      handler: 'api::user-profile.user-profile.getStats',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
