/**
 * Leaderboard Routes
 *
 * Leitura: publica (auth: false) de proposito, porque convidados tambem veem o
 * ranking. Nao expoe nada alem do id publico, do nome exibido, do pais que o
 * jogador escolheu mostrar, da posicao, da pontuacao e da fase alcancada.
 *
 * Escrita: exige login (Firebase), como as rotas de perfil. O jogador define o
 * proprio apelido e pais, e pode denunciar o apelido de outro. A moderacao
 * (papel admin) pode desfazer a ocultacao automatica de um apelido.
 *
 * As regras ficam nos servicos: leaderboard-settings.ts (troca, prazo e
 * reserva de apelido) e leaderboard-reports.ts (denuncias e ocultacao).
 *
 * O limitador global pula /api/leaderboard; cada rota tem limitador proprio.
 */

import { createRateLimitMiddleware } from '../middlewares/rate-limit';
import {
  createAuthMiddleware,
  createAdminMiddleware,
  AuthContext,
} from '../middlewares/auth';
import {
  montarPaginaDoRanking,
  limparCacheDoRanking,
  TipoDeRanking,
  NomeExibido,
} from '../services/leaderboard-service';
import { buscarJogadorPorIdPublico, JogadorDoRanking } from '../services/leaderboard-players';
import { definirConfiguracoes, proximaTrocaDeApelido } from '../services/leaderboard-settings';
import { validarApelido } from '../services/nickname';
import {
  registrarDenuncia,
  contarDenunciasDesde,
  reverterOcultacaoDoApelido,
  LIMITE_DIARIO_DE_DENUNCIAS,
  NovaDenuncia,
} from '../services/leaderboard-reports';
import { comTravaDaSessao } from '../services/quiz-session';
import {
  validateLeaderboardPage,
  validateLeaderboardPageSize,
  validateLeaderboardBoard,
  validateCountryCode,
  validateOptionalCountryCode,
  validateKnownFields,
  validatePublicPlayerId,
  validateReportReason,
  combineValidations,
  formatValidationErrors,
  LEADERBOARD_DEFAULT_PAGE_SIZE,
} from '../services/validation';

const DIA_MS = 24 * 60 * 60 * 1000;

function configuracoesDoJogador(jogador: JogadorDoRanking, agora: Date) {
  const nomeGerado = {
    adjective: jogador.pseudonimo.adjetivo,
    object: jogador.pseudonimo.objeto,
    number: jogador.pseudonimo.numero,
  };
  const name: NomeExibido =
    jogador.apelido && !jogador.apelidoOcultoPelaModeracao
      ? { type: 'nickname', text: jogador.apelido }
      : { type: 'generated', ...nomeGerado };

  return {
    publicId: jogador.idPublico,
    name,
    nickname: jogador.apelido,
    nicknameHidden: jogador.apelidoOcultoPelaModeracao,
    generatedName: nomeGerado,
    country: jogador.pais,
    showCountry: jogador.mostrarPais,
    visible: jogador.visivel,
    nicknameChangedAt: jogador.apelidoAlteradoEm,
    nextNicknameChangeAt: proximaTrocaDeApelido(jogador, agora)?.toISOString() ?? null,
  };
}

export function createLeaderboardRoutes(
  strapi: any,
  opcoes: { agora?: () => Date } = {}
): any[] {
  const agora = opcoes.agora ?? (() => new Date());
  const authMiddleware = createAuthMiddleware(strapi);
  const adminMiddleware = createAdminMiddleware(strapi);

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

  const limitadorDeEscrita = createRateLimitMiddleware({
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'leaderboard-write:',
    skipPaths: [],
    message: 'Too many leaderboard updates. Please try again later.',
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

  async function atualizarMinhasConfiguracoes(ctx: any): Promise<void> {
    const user = ctx.state.user as AuthContext | undefined;
    if (!user?.firebaseUid) return ctx.unauthorized('Authentication required');

    const body = ctx.request.body;
    const campos = validateKnownFields(body, ['nickname', 'country']);
    if (!campos.valid) return ctx.badRequest(formatValidationErrors(campos.errors));

    const pedido: { apelido?: string | null; pais?: string | null } = {};

    if ('nickname' in body) {
      const digitado = body.nickname;
      if (digitado === null || (typeof digitado === 'string' && digitado.trim() === '')) {
        pedido.apelido = null;
      } else {
        const resultado = validarApelido(digitado);
        if (resultado.ok === false) {
          return ctx.badRequest('Invalid nickname', { reason: resultado.motivo });
        }
        pedido.apelido = resultado.apelido;
      }
    }

    if ('country' in body) {
      const pais = validateOptionalCountryCode(body.country);
      if (!pais.valid) return ctx.badRequest(formatValidationErrors(pais.errors));
      pedido.pais = body.country ? String(body.country).toUpperCase() : null;
    }

    if (Object.keys(pedido).length === 0) {
      return ctx.badRequest('body: nickname or country is required');
    }

    try {
      const instante = agora();

      // Uma alteracao por vez por conta: sem isto, duas requisicoes juntas
      // passariam pelas regras de prazo e reserva antes de qualquer uma gravar.
      const resultado = await comTravaDaSessao(`leaderboard-player:${user.firebaseUid}`, () =>
        definirConfiguracoes(strapi.db.connection, user.firebaseUid, pedido, instante)
      );

      if (resultado.tipo === 'cedo') {
        return ctx.tooManyRequests('Nickname can be changed once every 7 days', {
          nextNicknameChangeAt: resultado.liberaEm.toISOString(),
        });
      }
      if (resultado.tipo === 'em-uso') return ctx.conflict('Nickname already in use');

      limparCacheDoRanking();
      ctx.body = { success: true, data: configuracoesDoJogador(resultado.jogador, instante) };
    } catch (error: any) {
      strapi.log.error('Error updating leaderboard settings:', error);
      ctx.internalServerError('Failed to update leaderboard settings');
    }
  }

  async function denunciarApelido(ctx: any): Promise<void> {
    const user = ctx.state.user as AuthContext | undefined;
    if (!user?.firebaseUid) return ctx.unauthorized('Authentication required');

    const body = ctx.request.body;
    const campos = validateKnownFields(body, ['playerId', 'reason']);
    if (!campos.valid) return ctx.badRequest(formatValidationErrors(campos.errors));

    const validation = combineValidations(
      validatePublicPlayerId(body.playerId),
      validateReportReason(body.reason)
    );
    if (!validation.valid) return ctx.badRequest(formatValidationErrors(validation.errors));

    try {
      const knex = strapi.db.connection;
      const instante = agora();

      const denunciado = await buscarJogadorPorIdPublico(knex, body.playerId);
      if (!denunciado || !denunciado.visivel || denunciado.ocultoPelaModeracao) {
        return ctx.notFound('Player not found');
      }
      if (denunciado.firebaseUid === user.firebaseUid) {
        return ctx.badRequest('Cannot report yourself');
      }
      if (!denunciado.apelido) {
        return ctx.badRequest('Player has no nickname to report');
      }

      const recentes = await contarDenunciasDesde(
        knex,
        user.firebaseUid,
        new Date(instante.getTime() - DIA_MS)
      );
      if (recentes >= LIMITE_DIARIO_DE_DENUNCIAS) {
        return ctx.tooManyRequests('Daily report limit reached');
      }

      const { nova, apelidoOcultado } = await registrarDenuncia(
        knex,
        {
          denuncianteUid: user.firebaseUid,
          denunciadoUid: denunciado.firebaseUid,
          denunciadoIdPublico: denunciado.idPublico,
          apelido: denunciado.apelido,
          motivo: body.reason as NovaDenuncia['motivo'],
        },
        instante
      );
      if (nova) strapi.log.warn(`Nickname report received for player ${denunciado.idPublico}`);
      if (apelidoOcultado) {
        limparCacheDoRanking();
        strapi.log.warn(`Nickname hidden after reports for player ${denunciado.idPublico}`);
      }

      // A mesma resposta para denuncia nova ou repetida.
      ctx.status = 202;
      ctx.body = { success: true, data: { status: 'received' } };
    } catch (error: any) {
      strapi.log.error('Error registering nickname report:', error);
      ctx.internalServerError('Failed to register report');
    }
  }

  async function restaurarApelido(ctx: any): Promise<void> {
    const { playerId } = ctx.params || {};
    const validation = validatePublicPlayerId(playerId);
    if (!validation.valid) return ctx.badRequest(formatValidationErrors(validation.errors));

    try {
      const jogador = await reverterOcultacaoDoApelido(strapi.db.connection, playerId, agora());
      if (!jogador) return ctx.notFound('Player not found');

      limparCacheDoRanking();
      strapi.log.info(`Nickname restored by moderation for player ${jogador.idPublico}`);
      ctx.body = {
        success: true,
        data: { publicId: jogador.idPublico, nicknameHidden: jogador.apelidoOcultoPelaModeracao },
      };
    } catch (error: any) {
      strapi.log.error('Error restoring nickname:', error);
      ctx.internalServerError('Failed to restore nickname');
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

    // Apelido e pais do proprio jogador (cria o cadastro no ranking se faltar)
    {
      method: 'PUT',
      path: '/api/leaderboard/me',
      handler: [limitadorDeEscrita, authMiddleware, atualizarMinhasConfiguracoes],
      config: { auth: false },
    },

    // Denuncia de apelido
    {
      method: 'POST',
      path: '/api/leaderboard/report',
      handler: [limitadorDeEscrita, authMiddleware, denunciarApelido],
      config: { auth: false },
    },

    // Moderacao: volta a mostrar um apelido ocultado e arquiva as denuncias pendentes
    {
      method: 'POST',
      path: '/api/leaderboard/admin/players/:playerId/restore-nickname',
      handler: [limitadorDeEscrita, authMiddleware, adminMiddleware, restaurarApelido],
      config: { auth: false },
    },
  ];
}
