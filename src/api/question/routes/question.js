'use strict';

/**
 * question router
 * Combina rotas padrão do Strapi com suporte a i18n
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::question.question', {
  config: {
    find: {
      policies: [],
      middlewares: [],
    },
    findOne: {
      policies: [],
      middlewares: [],
    },
  },
});

