'use strict';

/**
 * Denuncias de apelido do ranking.
 *
 * Ficam para revisao manual. A unica acao automatica e ocultar o apelido quando
 * ele acumula denuncias pendentes de contas distintas (leaderboard-reports.ts);
 * a moderacao pode desfazer.
 *
 * O apelido fica guardado como estava no momento da denuncia, e tambem na forma
 * normalizada, que e a identidade do apelido: uma variacao so de maiusculas ou
 * acentos e o mesmo apelido. Uma denuncia por pessoa para cada apelido.
 */

const TABELA = 'leaderboard_reports';

async function up(knex) {
  if (await knex.schema.hasTable(TABELA)) return;

  await knex.schema.createTable(TABELA, (t) => {
    t.bigIncrements('id');
    t.string('reporter_uid', 128).notNullable();
    t.string('reported_uid', 128).notNullable();
    t.string('reported_public_id', 16).notNullable();
    t.string('reported_nickname', 32).notNullable();
    t.string('reported_nickname_normalized', 32).notNullable();
    t.enu('reason', ['offensive', 'impersonation', 'spam']).notNullable();
    t.string('status', 16).notNullable().defaultTo('pending');
    t.datetime('created_at').notNullable();

    // Nomes curtos: o Postgres corta identificadores acima de 63 caracteres.
    t.unique(['reporter_uid', 'reported_public_id', 'reported_nickname_normalized'], {
      indexName: 'leaderboard_reports_one_per_reporter',
    });
    t.index(['reported_uid', 'reported_nickname_normalized', 'status'], 'leaderboard_reports_by_nickname');
    t.index(['status', 'created_at'], 'leaderboard_reports_review_queue');
    t.index(['reporter_uid', 'created_at'], 'leaderboard_reports_by_reporter');
  });
}

async function down(knex) {
  await knex.schema.dropTableIfExists(TABELA);
}

module.exports = { up, down };
