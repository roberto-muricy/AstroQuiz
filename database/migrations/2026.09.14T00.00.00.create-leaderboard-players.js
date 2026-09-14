'use strict';

/**
 * Jogadores do ranking: como cada conta aparece na classificacao.
 *
 * Roda uma unica vez pelo mecanismo de migracoes do Strapi (registrada em
 * strapi_migrations), antes da sincronizacao do schema. O Strapi deixa em paz
 * as tabelas que nao criou, entao esta nao e afetada pelos content-types.
 *
 * Fora do servidor o jogador e identificado so pelo public_id; o firebase_uid
 * nunca sai.
 */

const TABELA = 'leaderboard_players';

async function up(knex) {
  if (await knex.schema.hasTable(TABELA)) return;

  await knex.schema.createTable(TABELA, (t) => {
    t.string('firebase_uid', 128).primary();
    t.string('public_id', 16).notNullable().unique();

    // Nome gerado, usado quando o jogador nao escolhe apelido. Guardado como
    // chaves, e nao como texto, para aparecer traduzido em cada idioma.
    t.string('pseudonym_adjective', 32).notNullable();
    t.string('pseudonym_object', 32).notNullable();
    t.smallint('pseudonym_number').notNullable();
    t.unique(['pseudonym_adjective', 'pseudonym_object', 'pseudonym_number']);

    // Apelido escolhido. A forma normalizada (sem acentos, sem diferenca de
    // maiusculas e sem espacos repetidos) impede que dois jogadores usem o
    // mesmo nome escrito de jeitos diferentes.
    t.string('nickname', 32).nullable();
    t.string('nickname_normalized', 32).nullable().unique();
    t.datetime('nickname_changed_at').nullable();

    // ISO 3166-1 alfa-2. Nulo quando o jogador nao informa.
    t.string('country_code', 2).nullable().index();
    t.boolean('show_country').notNullable().defaultTo(true);

    // Escolha do jogador: aparecer ou nao na classificacao.
    t.boolean('visible').notNullable().defaultTo(true);

    // Moderacao: esconde o jogador inteiro, ou so o apelido (volta o nome gerado).
    t.boolean('hidden_by_admin').notNullable().defaultTo(false);
    t.boolean('nickname_hidden').notNullable().defaultTo(false);

    t.datetime('created_at').notNullable();
    t.datetime('updated_at').notNullable();
  });
}

async function down(knex) {
  await knex.schema.dropTableIfExists(TABELA);
}

module.exports = { up, down };
