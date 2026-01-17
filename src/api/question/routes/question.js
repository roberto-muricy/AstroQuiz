'use strict';

/**
 * Custom question routes for public API access
 */

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/questions',
      handler: 'api::question.question.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/questions/:id',
      handler: 'api::question.question.findOne',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/questions',
      handler: 'api::question.question.create',
      config: {
        auth: false,
      },
    },
  ],
};
