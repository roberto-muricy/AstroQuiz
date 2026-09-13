'use strict';

/**
 * user-profile controller
 *
 * So o controlador padrao do Strapi. As acoes proprias (sync, updateStats,
 * getStats) viviam aqui, expostas por src/api/user-profile/routes/user-profile.js
 * com `auth: false` e sem conferir o dono do perfil: bastava saber um uid para
 * reescrever qualquer campo, inclusive o papel de admin. Aquelas rotas nao
 * chegavam a ser servidas em producao (sondado em 13/09/2026), mas bastaria
 * alguem voltar a registra-las.
 *
 * As rotas de perfil de verdade estao em src/routes/user-profile-routes.ts.
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-profile.user-profile');
