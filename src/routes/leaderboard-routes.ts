/**
 * Leaderboard Routes (read-only)
 *
 * Publicas (auth: false) de proposito: convidados tambem veem o ranking. Nao
 * expoem nada alem do id publico, do nome exibido, do pais que o jogador
 * escolheu mostrar, da posicao, da pontuacao e da fase alcancada. Alem do
 * limitador global, cada rota tem um limitador proprio.
 */

import { createRateLimitMiddleware } from '../middlewares/rate-limit';
import { montarPaginaDoRanking, TipoDeRanking } from '../services/leaderboard-service';
import {
  validateLeaderboardPage,
  validateLeaderboardPageSize,
  validateLeaderboardBoard,
  validateCountryCode,
  combineValidations,
  formatValidationErrors,
  LEADERBOARD_DEFAULT_PAGE_SIZE,
} from '../services/validation';

export function createLeaderboardRoutes(strapi: any): any[] {
  // 120 por minuto por IP: em rede movel muitos usuarios saem pelo mesmo IP.
  // O limitador global (100/min) pula /api/leaderboard, senao cortaria antes
  // deste; ver src/index.ts.
  const limitador = createRateLimitMiddleware({
    windowMs: 60 * 1000,
    maxRequests: 120,
    keyPrefix: 'leaderboard:',
    skipPaths: [],
    message: 'Too many leaderboard requests. Please try again later.',
  });

  async function responder(ctx: any, tipo: TipoDeRanking, pais: string | null): Promise<void> {
    const { page, pageSize } = ctx.query || {};

    const validation = combineValidations(
      validateLeaderboardPage(page),
      validateLeaderboardPageSize(pageSize)
    );
    if (!validation.valid) {
      return ctx.badRequest(formatValidationErrors(validation.errors));
    }

    try {
      const data = await montarPaginaDoRanking(strapi.db.connection, {
        tipo,
        pais,
        pagina: page === undefined ? 1 : Number(page),
        tamanho: pageSize === undefined ? LEADERBOARD_DEFAULT_PAGE_SIZE : Number(pageSize),
      });
      ctx.body = { success: true, data };
    } catch (error: any) {
      strapi.log.error('Error building leaderboard:', error);
      ctx.internalServerError('Failed to load leaderboard');
    }
  }

  return [
    // Pontos de todo o historico
    {
      method: 'GET',
      path: '/api/leaderboard/all-time',
      handler: [limitador, (ctx: any) => responder(ctx, 'all-time', null)],
      config: { auth: false },
    },

    // Pontos da semana atual (segunda a domingo, horario de Brasilia)
    {
      method: 'GET',
      path: '/api/leaderboard/weekly',
      handler: [limitador, (ctx: any) => responder(ctx, 'weekly', null)],
      config: { auth: false },
    },

    // Maior fase aprovada
    {
      method: 'GET',
      path: '/api/leaderboard/phase',
      handler: [limitador, (ctx: any) => responder(ctx, 'phase', null)],
      config: { auth: false },
    },

    // Qualquer dos tres, so com jogadores de um pais (?board=weekly|all-time|phase)
    {
      method: 'GET',
      path: '/api/leaderboard/country/:country',
      handler: [
        limitador,
        (ctx: any) => {
          const { country } = ctx.params || {};
          const { board } = ctx.query || {};

          const validation = combineValidations(
            validateCountryCode(country),
            validateLeaderboardBoard(board)
          );
          if (!validation.valid) {
            return ctx.badRequest(formatValidationErrors(validation.errors));
          }

          return responder(ctx, (board ?? 'weekly') as TipoDeRanking, country.toUpperCase());
        },
      ],
      config: { auth: false },
    },
  ];
}
