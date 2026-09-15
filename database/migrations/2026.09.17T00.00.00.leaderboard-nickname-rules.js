'use strict';

/**
 * Regras de apelido do ranking.
 *
 * leaderboard_players ganha duas datas:
 *   - nickname_first_set_at: primeira vez que o jogador definiu um apelido. A
 *     primeira definicao nao conta como troca, e nickname_changed_at passa a
 *     marcar so trocas (e o que conta para o prazo de 7 dias).
 *   - nickname_hidden_at: quando o apelido foi ocultado.
 *
 * leaderboard_nickname_reservations: o apelido que um jogador deixa (por troca
 * ou remocao) fica reservado para ele por 30 dias. Uma linha por forma
 * normalizada; quando o apelido e deixado de novo, a linha e substituida.
 *
 * Idempotente: so cria o que falta. Nao mexe em dados existentes.
 */

const JOGADORES = 'leaderboard_players';
const RESERVAS = 'leaderboard_nickname_reservations';

async function up(knex) {
  const temPrimeiraDefinicao = await knex.schema.hasColumn(JOGADORES, 'nickname_first_set_at');
  const temOcultoEm = await knex.schema.hasColumn(JOGADORES, 'nickname_hidden_at');
  if (!temPrimeiraDefinicao || !temOcultoEm) {
    await knex.schema.alterTable(JOGADORES, (t) => {
      if (!temPrimeiraDefinicao) t.datetime('nickname_first_set_at').nullable();
      if (!temOcultoEm) t.datetime('nickname_hidden_at').nullable();
    });
  }

  if (!(await knex.schema.hasTable(RESERVAS))) {
    await knex.schema.createTable(RESERVAS, (t) => {
      t.string('nickname_normalized', 32).primary();
      t.string('firebase_uid', 128).notNullable();
      t.datetime('reserved_until').notNullable();
      t.datetime('created_at').notNullable();
      t.index(['firebase_uid'], 'leaderboard_nickname_reservations_by_player');
      t.index(['reserved_until'], 'leaderboard_nickname_reservations_expiry');
    });
  }
}

async function down(knex) {
  await knex.schema.dropTableIfExists(RESERVAS);
  const temPrimeiraDefinicao = await knex.schema.hasColumn(JOGADORES, 'nickname_first_set_at');
  const temOcultoEm = await knex.schema.hasColumn(JOGADORES, 'nickname_hidden_at');
  if (temPrimeiraDefinicao || temOcultoEm) {
    await knex.schema.alterTable(JOGADORES, (t) => {
      if (temPrimeiraDefinicao) t.dropColumn('nickname_first_set_at');
      if (temOcultoEm) t.dropColumn('nickname_hidden_at');
    });
  }
}

module.exports = { up, down };
