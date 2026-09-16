/**
 * Regras de apelido, pais e visibilidade do jogador no ranking.
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
 *   - Pais, "mostrar pais" e "aparecer no ranking" mudam quando o jogador
 *     quiser: nao tem prazo nem reserva.
 *
 * A identidade do apelido e a forma normalizada (normalizarApelido).
 *
 * Recebe o knex, e nao o strapi, para ser testado contra SQLite.
 */

import { eTabelaInexistente } from './database-errors';
import {
  garantirJogador,
  atualizarJogador,
  apagarJogador,
  normalizarApelido,
  ErroDeApelidoEmUso,
  ErroDePseudonimoEmUso,
  JogadorDoRanking,
  AlteracoesDoJogador,
  Pseudonimo,
} from './leaderboard-players';
import { sortearPseudonimo } from './pseudonym';
import { anonimizarResultadosDoJogador } from './phase-results';
import { apagarDenunciasDoJogador } from './leaderboard-reports';

export const TABELA_DE_RESERVAS = 'leaderboard_nickname_reservations';

const DIA_MS = 24 * 60 * 60 * 1000;
export const PRAZO_ENTRE_TROCAS_DE_APELIDO_MS = 7 * DIA_MS;
export const RESERVA_DE_APELIDO_MS = 30 * DIA_MS;
const TENTATIVAS_DE_PSEUDONIMO = 10;

export interface PedidoDeConfiguracoes {
  apelido?: string | null;
  pais?: string | null;
  mostrarPais?: boolean;
  visivel?: boolean;
}

export type ResultadoDasConfiguracoes =
  | { tipo: 'ok'; jogador: JogadorDoRanking }
  | { tipo: 'cedo'; liberaEm: Date }
  | { tipo: 'em-uso' };

export interface ResumoDaExclusao {
  jogadorApagado: boolean;
  reservas: number;
  denuncias: number;
  resultadosAnonimizados: number;
}

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
  pedido: PedidoDeConfiguracoes,
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
  if (pedido.mostrarPais !== undefined) alteracoes.mostrarPais = pedido.mostrarPais;
  if (pedido.visivel !== undefined) alteracoes.visivel = pedido.visivel;
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

const mesmoPseudonimo = (a: Pseudonimo, b: Pseudonimo): boolean =>
  a.adjetivo === b.adjetivo && a.objeto === b.objeto && a.numero === b.numero;

/**
 * Sorteia outro nome gerado para o jogador. Nao mexe no apelido: quem tem
 * apelido continua aparecendo por ele. Sem prazo — o nome gerado e so
 * aparencia, e trocar nao libera nem toma nada de ninguem.
 */
export async function sortearNovoPseudonimo(
  knex: any,
  firebaseUid: string,
  opcoes: { sortear?: () => Pseudonimo; agora?: Date } = {}
): Promise<JogadorDoRanking> {
  const agora = opcoes.agora ?? new Date();
  const sortear = opcoes.sortear ?? sortearPseudonimo;
  const jogador = await garantirJogador(knex, firebaseUid, { agora });

  for (let tentativa = 0; tentativa < TENTATIVAS_DE_PSEUDONIMO; tentativa++) {
    const novo = sortear();
    // Sair com o mesmo nome nao seria um sorteio: tenta de novo.
    if (mesmoPseudonimo(novo, jogador.pseudonimo)) continue;
    try {
      return (await atualizarJogador(knex, firebaseUid, { pseudonimo: novo }, agora)) as JogadorDoRanking;
    } catch (erro) {
      if (!(erro instanceof ErroDePseudonimoEmUso)) throw erro;
    }
  }
  throw new Error('Could not allocate a pseudonym');
}

/**
 * Apaga os dados do jogador no ranking: o cadastro, as reservas de apelido e as
 * denuncias feitas por ele e sobre ele. Depois disso ele some da classificacao e
 * o apelido volta a ficar livre.
 *
 * As partidas em phase_results nao sao apagadas, e sim desligadas da conta
 * (`firebase_uid` nulo, `eligible` falso): elas deixam de apontar para uma
 * pessoa e de valer para o ranking, mas continuam contando nas estatisticas de
 * uso — phase_results e o unico historico que sobrevive aos deploys. Apagar a
 * conta inteira (DELETE /api/user-profile/me) continua removendo tudo.
 *
 * Cada passo tolera a tabela ausente e nenhum depende do anterior, entao uma
 * falha no meio pode ser resolvida repetindo a chamada.
 */
export async function apagarDadosDoRanking(
  knex: any,
  firebaseUid: string
): Promise<ResumoDaExclusao> {
  const resultadosAnonimizados = await anonimizarResultadosDoJogador(knex, firebaseUid);
  const denuncias = await apagarDenunciasDoJogador(knex, firebaseUid);
  const reservas = await apagarReservasDoJogador(knex, firebaseUid);
  const jogadorApagado = (await apagarJogador(knex, firebaseUid)) > 0;

  return { jogadorApagado, reservas, denuncias, resultadosAnonimizados };
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
