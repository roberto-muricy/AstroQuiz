'use strict';

/**
 * question controller
 * Usa o controller padrão do Strapi com suporte a i18n
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::question.question');

