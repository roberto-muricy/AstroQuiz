/**
 * Regras de apelido e pais do jogador no ranking.
 *
 *   - A primeira definicao de apelido e livre e nao inicia prazo.
 *   - Cada troca exige 7 dias desde a troca anterior. E troca mudar de um
 *     apelido para outro, ou definir um apelido depois de ja ter tido um.
 *     Remover o apelido e sempre permitido e nao conta como troca.
 *   - O apelido deixado (por troca ou remocao) fica reservado por 30 dias para
 *     quem o deixou. Outra conta recebe "em uso"; o dono pode retomar sem
 *     esperar a reserva, mas a retomada e uma troca como outra qualquer.
 *   - Um apelido novo comeca sem ocultacao: as denuncias do anterior continuam
 *     presas a ele. Mudar so maiusculas ou acentos nao e um apelido novo.
 *
 * A identidade do apelido e a forma normalizada (normalizarApelido).
 *
 * Recebe o knex, e nao o strapi, para ser testado contra SQLite.
 */

import { eTabelaInexistente } from './database-errors';
import {
  garantirJogador,
  atualizarJogador,
  normalizarApelido,
  ErroDeApelidoEmUso,
  JogadorDoRanking,
  AlteracoesDoJogador,
} from './leaderboard-players';

export const TABELA_DE_RESERVAS = 'leaderboard_nickname_reservations';

const DIA_MS = 24 * 60 * 60 * 1000;
export const PRAZO_ENTRE_TROCAS_DE_APELIDO_MS = 7 * DIA_MS;
export const RESERVA_DE_APELIDO_MS = 30 * DIA_MS;

export type ResultadoDasConfiguracoes =
  | { tipo: 'ok'; jogador: JogadorDoRanking }
  | { tipo: 'cedo'; liberaEm: Date }
  | { tipo: 'em-uso' };

/** Quando a proxima troca fica liberada, ou null se ja pode trocar. */
export function proximaTrocaDeApelido(jogador: JogadorDoRanking, agora: Date): Date | null {
  if (!jogador.apelidoAlteradoEm) return null;
  const liberaEm = new Date(new Date(jogador.apelidoAlteradoEm).getTime() + PRAZO_ENTRE_TROCAS_DE_APELIDO_MS);
  return liberaEm > agora ? liberaEm : null;
}

async function reservadoParaOutraConta(
  knex: any,
  normalizado: string,
  firebaseUid: string,
  agora: Date
): Promise<boolean> {
  const reserva = await knex(TABELA_DE_RESERVAS)
    .where({ nickname_normalized: normalizado })
    .andWhere('reserved_until', '>', agora.toISOString())
    .first('firebase_uid');
  return !!reserva && reserva.firebase_uid !== firebaseUid;
}

/**
 * Aplica o pedido do jogador. `apelido` ja deve ter passado por validarApelido
 * (ou ser null para remover). Cria o cadastro no ranking se faltar.
 */
export async function definirConfiguracoes(
  knex: any,
  firebaseUid: string,
  pedido: { apelido?: string | null; pais?: string | null },
  agora: Date = new Date()
): Promise<ResultadoDasConfiguracoes> {
  const jogador = await garantirJogador(knex, firebaseUid, { agora });
  const alteracoes: AlteracoesDoJogador = {};
  let reservar: string | null = null;
  let retomar: string | null = null;

  if (pedido.apelido !== undefined && pedido.apelido !== jogador.apelido) {
    const anterior = jogador.apelido === null ? null : normalizarApelido(jogador.apelido);
    const novo = pedido.apelido === null ? null : normalizarApelido(pedido.apelido);

    if (novo !== null) {
      const primeiraDefinicao = jogador.apelido === null && jogador.apelidoDefinidoEm === null;
      if (!primeiraDefinicao) {
        const liberaEm = proximaTrocaDeApelido(jogador, agora);
        if (liberaEm) return { tipo: 'cedo', liberaEm };
      }
      if (novo !== anterior && (await reservadoParaOutraConta(knex, novo, firebaseUid, agora))) {
        return { tipo: 'em-uso' };
      }

      if (primeiraDefinicao) alteracoes.apelidoDefinidoEm = agora;
      else alteracoes.apelidoAlteradoEm = agora;
      retomar = novo;
    }

    alteracoes.apelido = pedido.apelido;
    if (novo !== anterior) {
      alteracoes.apelidoOculto = false;
      alteracoes.apelidoOcultoEm = null;
      if (anterior !== null) reservar = anterior;
    }
  }

  if (pedido.pais !== undefined) alteracoes.pais = pedido.pais;
  if (Object.keys(alteracoes).length === 0) return { tipo: 'ok', jogador };

  try {
    const atualizado = await knex.transaction(async (trx: any) => {
      const resultado = await atualizarJogador(trx, firebaseUid, alteracoes, agora);

      if (retomar) {
        await trx(TABELA_DE_RESERVAS).where({ nickname_normalized: retomar, firebase_uid: firebaseUid }).del();
      }
      if (reservar) {
        await trx(TABELA_DE_RESERVAS).where('reserved_until', '<=', agora.toISOString()).del();
        await trx(TABELA_DE_RESERVAS)
          .insert({
            nickname_normalized: reservar,
            firebase_uid: firebaseUid,
            reserved_until: new Date(agora.getTime() + RESERVA_DE_APELIDO_MS).toISOString(),
            created_at: agora.toISOString(),
          })
          .onConflict('nickname_normalized')
          .merge(['firebase_uid', 'reserved_until', 'created_at']);
      }

      return resultado;
    });
    return { tipo: 'ok', jogador: atualizado as JogadorDoRanking };
  } catch (erro) {
    if (erro instanceof ErroDeApelidoEmUso) return { tipo: 'em-uso' };
    throw erro;
  }
}

/** Usado na exclusao de conta. Sem a tabela nao ha o que apagar. */
export async function apagarReservasDoJogador(knex: any, firebaseUid: string): Promise<number> {
  try {
    return await knex(TABELA_DE_RESERVAS).where({ firebase_uid: firebaseUid }).del();
  } catch (erro) {
    if (eTabelaInexistente(erro)) return 0;
    throw erro;
  }
}
