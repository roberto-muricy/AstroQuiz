'use strict';

/**
 * Tira o e-mail do perfil: a coluna era escrita e nunca lida.
 *
 * O e-mail e a credencial de quem entra por e-mail e senha, entao o Firebase
 * guarda o endereco de qualquer jeito — mas o nosso banco nunca precisou dele.
 * Nenhuma consulta filtrava por e-mail, o backend nao envia e-mail (nao ha nem
 * dependencia para isso), e o app le o endereco do proprio SDK do Firebase, e
 * nao da resposta do perfil. Era dado pessoal parado.
 *
 * A exclusao de conta nao depende desta coluna: `DELETE /api/user-profile/me`
 * apaga tudo pelo firebase_uid tirado do token.
 *
 * **Isto apaga dados e nao tem volta**, que e justamente a intencao. O `down`
 * recria a coluna vazia, porque os enderecos nao voltam — quem precisar deles
 * de novo os encontra no console do Firebase, que e a fonte autoritativa.
 *
 * Migracoes rodam antes da sincronizacao do schema. O atributo saiu junto de
 * `src/api/user-profile/content-types/user-profile/schema.json`; sem isso, a
 * sincronizacao recriaria a coluna logo depois desta migracao.
 */

const TABELA = 'user_profiles';
const COLUNA = 'email';

async function up(knex) {
  // Banco novo: a tabela ainda nem existe quando as migracoes rodam.
  if (!(await knex.schema.hasTable(TABELA))) return;
  if (!(await knex.schema.hasColumn(TABELA, COLUNA))) return;

  await knex.schema.alterTable(TABELA, (t) => {
    t.dropColumn(COLUNA);
  });
}

async function down(knex) {
  if (!(await knex.schema.hasTable(TABELA))) return;
  if (await knex.schema.hasColumn(TABELA, COLUNA)) return;

  await knex.schema.alterTable(TABELA, (t) => {
    t.string(COLUNA, 255).nullable();
  });
}

module.exports = { up, down };
