'use strict';

/**
 * Resultados de fase (phase_results).
 *
 * Em producao a tabela ja existe: foi criada pelo proprio servidor na primeira
 * gravacao, em 14/09/2026 (src/services/phase-results.ts). Esta migracao so a
 * cria onde ainda nao existe, para que o schema completo seja reproduzivel por
 * migracoes. Onde a tabela ja existe, nao altera nada.
 *
 * A definicao precisa continuar igual a de criarTabela em phase-results.ts;
 * phase-results-migracao.test.ts compara as duas.
 */

const TABELA = 'phase_results';

async function up(knex) {
  if (await knex.schema.hasTable(TABELA)) return;

  await knex.schema.createTable(TABELA, (t) => {
    t.bigIncrements('id');
    t.string('session_id', 64).notNullable().unique();
    t.string('firebase_uid', 128).nullable();
    t.integer('phase').notNullable();
    t.string('locale', 8).notNullable();
    t.integer('score').notNullable();
    t.integer('max_possible_score').notNullable();
    t.integer('correct_answers').notNullable();
    t.integer('total_questions').notNullable();
    t.integer('skipped').notNullable().defaultTo(0);
    t.integer('timeouts').notNullable().defaultTo(0);
    t.integer('max_streak').notNullable().defaultTo(0);
    t.integer('total_time_ms').notNullable();
    t.integer('client_time_ms').notNullable();
    t.integer('server_time_ms').nullable();
    t.boolean('passed').notNullable();
    t.boolean('eligible').notNullable();
    t.string('flags', 128).nullable();
    t.datetime('started_at').notNullable();
    t.datetime('finished_at').notNullable();
    t.datetime('created_at').notNullable();
    t.index(['firebase_uid', 'phase', 'score']);
    t.index(['finished_at']);
  });
}

/**
 * Nao apaga a tabela: em producao ela existia antes desta migracao e guarda o
 * historico de partidas. Desfazer a migracao nao pode destruir esses dados.
 */
async function down() {}

module.exports = { up, down };
