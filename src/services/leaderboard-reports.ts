/**
 * Denuncias de apelido do ranking.
 *
 * Ficam para revisao manual. A unica acao automatica: quando um apelido junta
 * DENUNCIAS_PARA_OCULTAR denuncias pendentes de contas distintas, ele e
 * ocultado (volta a aparecer o nome gerado), com a data registrada. A moderacao
 * pode desfazer com reverterOcultacaoDoApelido, que tambem arquiva as
 * denuncias pendentes daquele apelido.
 *
 * As denuncias ficam presas ao apelido denunciado (forma normalizada): se o
 * jogador troca de apelido, o novo comeca do zero.
 *
 * A tabela vem da migracao
 * database/migrations/2026.09.16T00.00.00.create-leaderboard-reports.js.
 * Recebe o knex, e nao o strapi, para ser testado contra SQLite.
 */

import { eTabelaInexistente } from './database-errors';
import {
  TABELA_DE_JOGADORES,
  normalizarApelido,
  buscarJogadorPorIdPublico,
  atualizarJogador,
  JogadorDoRanking,
} from './leaderboard-players';

export const TABELA_DE_DENUNCIAS = 'leaderboard_reports';

/** Denuncias por conta em 24 horas. */
export const LIMITE_DIARIO_DE_DENUNCIAS = 5;

/** Denuncias pendentes, de contas distintas, que ocultam um apelido. */
export const DENUNCIAS_PARA_OCULTAR = 5;

export interface NovaDenuncia {
  denuncianteUid: string;
  denunciadoUid: string;
  denunciadoIdPublico: string;
  /** O apelido como estava no momento da denuncia. */
  apelido: string;
  motivo: 'offensive' | 'impersonation' | 'spam';
}

/**
 * Registra a denuncia e oculta o apelido se ele atingiu o limite. `nova` e
 * false quando a mesma pessoa ja tinha denunciado este apelido.
 */
export async function registrarDenuncia(
  knex: any,
  denuncia: NovaDenuncia,
  agora: Date = new Date()
): Promise<{ nova: boolean; apelidoOcultado: boolean }> {
  const normalizado = normalizarApelido(denuncia.apelido);
  const chave = {
    reporter_uid: denuncia.denuncianteUid,
    reported_public_id: denuncia.denunciadoIdPublico,
    reported_nickname_normalized: normalizado,
  };

  if (await knex(TABELA_DE_DENUNCIAS).where(chave).first('id')) {
    return { nova: false, apelidoOcultado: false };
  }

  await knex(TABELA_DE_DENUNCIAS)
    .insert({
      ...chave,
      reported_uid: denuncia.denunciadoUid,
      reported_nickname: denuncia.apelido,
      reason: denuncia.motivo,
      status: 'pending',
      created_at: agora.toISOString(),
    })
    .onConflict(['reporter_uid', 'reported_public_id', 'reported_nickname_normalized'])
    .ignore();

  const apelidoOcultado = await ocultarSeAtingiuOLimite(knex, denuncia.denunciadoUid, normalizado, agora);
  return { nova: true, apelidoOcultado };
}

async function ocultarSeAtingiuOLimite(
  knex: any,
  denunciadoUid: string,
  normalizado: string,
  agora: Date
): Promise<boolean> {
  const contagem = await knex(TABELA_DE_DENUNCIAS)
    .where({ reported_uid: denunciadoUid, reported_nickname_normalized: normalizado, status: 'pending' })
    .countDistinct({ n: 'reporter_uid' })
    .first();
  if (Number(contagem?.n ?? 0) < DENUNCIAS_PARA_OCULTAR) return false;

  // So oculta se o jogador ainda usa este apelido: se ja trocou, o novo comeca do zero.
  const alteradas = await knex(TABELA_DE_JOGADORES)
    .where({ firebase_uid: denunciadoUid, nickname_normalized: normalizado, nickname_hidden: false })
    .update({
      nickname_hidden: true,
      nickname_hidden_at: agora.toISOString(),
      updated_at: agora.toISOString(),
    });
  return Number(alteradas) > 0;
}

/**
 * Para a moderacao: volta a mostrar o apelido do jogador e arquiva as
 * denuncias pendentes desse apelido, para que elas nao o ocultem de novo.
 * Devolve null se o jogador nao existir.
 */
export async function reverterOcultacaoDoApelido(
  knex: any,
  idPublico: string,
  agora: Date = new Date()
): Promise<JogadorDoRanking | null> {
  return knex.transaction(async (trx: any) => {
    const jogador = await buscarJogadorPorIdPublico(trx, idPublico);
    if (!jogador) return null;

    if (jogador.apelido) {
      await trx(TABELA_DE_DENUNCIAS)
        .where({
          reported_uid: jogador.firebaseUid,
          reported_nickname_normalized: normalizarApelido(jogador.apelido),
          status: 'pending',
        })
        .update({ status: 'dismissed' });
    }

    return atualizarJogador(trx, jogador.firebaseUid, { apelidoOculto: false, apelidoOcultoEm: null }, agora);
  });
}

export async function contarDenunciasDesde(
  knex: any,
  denuncianteUid: string,
  desde: Date
): Promise<number> {
  const linha = await knex(TABELA_DE_DENUNCIAS)
    .where('reporter_uid', denuncianteUid)
    .andWhere('created_at', '>=', desde.toISOString())
    .count({ n: '*' })
    .first();
  return Number(linha?.n ?? 0);
}

/**
 * Usado na exclusao de conta: apaga as denuncias feitas pela conta e as feitas
 * sobre ela. Sem a tabela nao ha o que apagar, e a exclusao nao pode falhar.
 */
export async function apagarDenunciasDoJogador(knex: any, firebaseUid: string): Promise<number> {
  try {
    return await knex(TABELA_DE_DENUNCIAS)
      .where('reporter_uid', firebaseUid)
      .orWhere('reported_uid', firebaseUid)
      .del();
  } catch (erro) {
    if (eTabelaInexistente(erro)) return 0;
    throw erro;
  }
}
