/**
 * A migracao de phase_results precisa criar exatamente a mesma tabela que o
 * servidor cria sozinho (criarTabela em phase-results.ts), e nao pode mexer na
 * tabela que ja existe em producao.
 */

import knexFactory from 'knex';
import { garantirTabelaDeResultados, TABELA_DE_RESULTADOS } from '../phase-results';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migracao = require('../../../database/migrations/2026.09.15T00.00.00.create-phase-results.js');

const novoKnex = () =>
  knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });

async function schemaDaTabela(knex: any) {
  const colunas = await knex.raw(`pragma table_info('${TABELA_DE_RESULTADOS}')`);
  const indices = await knex.raw(`pragma index_list('${TABELA_DE_RESULTADOS}')`);
  const detalhados = [];
  for (const indice of indices) {
    const colunasDoIndice = await knex.raw(`pragma index_info('${indice.name}')`);
    detalhados.push({
      name: indice.name,
      unique: indice.unique,
      columns: colunasDoIndice.map((c: any) => c.name),
    });
  }
  return {
    colunas: colunas.map(({ name, type, notnull, dflt_value, pk }: any) => ({ name, type, notnull, dflt_value, pk })),
    indices: detalhados.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const linha = {
  session_id: 'quiz_existente_1',
  firebase_uid: 'uid_existente',
  phase: 1,
  locale: 'pt',
  score: 500,
  max_possible_score: 690,
  correct_answers: 10,
  total_questions: 10,
  total_time_ms: 50000,
  client_time_ms: 50000,
  server_time_ms: 51000,
  passed: true,
  eligible: true,
  started_at: '2026-09-14T01:00:00.000Z',
  finished_at: '2026-09-14T01:01:00.000Z',
  created_at: '2026-09-14T01:01:00.000Z',
};

it('em banco vazio, cria a mesma tabela que o servidor cria', async () => {
  const pelaMigracao = novoKnex();
  const peloServidor = novoKnex();

  await migracao.up(pelaMigracao);
  await garantirTabelaDeResultados(peloServidor);

  expect(await schemaDaTabela(pelaMigracao)).toEqual(await schemaDaTabela(peloServidor));

  await pelaMigracao.destroy();
  await peloServidor.destroy();
});

it('com a tabela ja existente, nao altera schema nem dados', async () => {
  const knex = novoKnex();
  await garantirTabelaDeResultados(knex);
  await knex(TABELA_DE_RESULTADOS).insert(linha);
  const antes = await schemaDaTabela(knex);

  await migracao.up(knex);

  expect(await schemaDaTabela(knex)).toEqual(antes);
  expect(await knex(TABELA_DE_RESULTADOS).select('session_id')).toEqual([{ session_id: 'quiz_existente_1' }]);
  await knex.destroy();
});

it('desfazer a migracao nao apaga a tabela', async () => {
  const knex = novoKnex();
  await migracao.up(knex);
  await knex(TABELA_DE_RESULTADOS).insert(linha);

  await migracao.down(knex);

  expect(await knex.schema.hasTable(TABELA_DE_RESULTADOS)).toBe(true);
  expect(await knex(TABELA_DE_RESULTADOS)).toHaveLength(1);
  await knex.destroy();
});
