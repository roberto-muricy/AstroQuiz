'use strict';

/**
 * Custom Quiz Routes for Strapi v5
 */

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/quiz-health',
      handler: 'api::quiz-engine.quiz.health',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/quiz-rules',
      handler: 'api::quiz-engine.quiz.getRules',
      config: {
        auth: false,
      },
    },
  ],
};



