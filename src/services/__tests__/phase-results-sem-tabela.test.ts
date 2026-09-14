/**
 * No primeiro deploy (13/09/2026) a tabela phase_results nao apareceu em
 * producao. Consequencias que estes testes impedem de voltar:
 *
 *   - cada fase terminada falhava ao gravar, e o historico nao comecava;
 *   - a exclusao de conta, que apaga os resultados antes do perfil, devolvia
 *     500 — e a Apple exige que ela funcione.
 */

import knexFactory from 'knex';
import {
  registrarResultadoDaSessao,
  apagarResultadosDoJogador,
  TABELA_DE_RESULTADOS,
} from '../phase-results';
import { createSession } from '../quiz-session';
import { decidirResposta, aplicarResposta } from '../quiz-answer-rules';

let knex: any;

beforeEach(() => {
  // De proposito, sem garantirTabelaDeResultados.
  knex = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
});

afterEach(async () => {
  await knex.destroy();
});

function sessaoCompleta(sessionId: string) {
  const s = createSession({
    sessionId,
    phaseNumber: 1,
    locale: 'pt',
    firebaseUid: 'uid_de_teste_123',
    questions: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, level: 1 })),
  });
  for (let i = 0; i < 10; i++) {
    const decisao = decidirResposta(s, {});
    if (decisao.tipo !== 'atual') throw new Error('sessao de teste saiu do fluxo');
    aplicarResposta(s, {
      questionId: decisao.pergunta.id,
      indice: decisao.indice,
      selectedOption: 'A',
      correctOption: 'A',
      isCorrect: true,
      isTimeout: false,
      isSkipped: false,
      level: 1,
      tempo: { efetivo: 5000, cliente: 5000, servidor: 5300 },
      agora: Date.UTC(2026, 8, 14, 12, 0, i),
    });
  }
  return s;
}

it('sem a tabela, gravar um resultado cria a tabela e grava', async () => {
  expect(await knex.schema.hasTable(TABELA_DE_RESULTADOS)).toBe(false);

  expect(await registrarResultadoDaSessao(knex, sessaoCompleta('quiz_1757851200000_semTabela0001'))).toBe(true);

  expect(await knex.schema.hasTable(TABELA_DE_RESULTADOS)).toBe(true);
  expect(await knex(TABELA_DE_RESULTADOS)).toHaveLength(1);
});

it('gravacoes simultaneas sem a tabela nao falham nem duplicam', async () => {
  const s = sessaoCompleta('quiz_1757851200000_semTabela0002');
  const outra = sessaoCompleta('quiz_1757851200000_semTabela0003');

  await Promise.all([
    registrarResultadoDaSessao(knex, s),
    registrarResultadoDaSessao(knex, outra),
  ]);

  const linhas = await knex(TABELA_DE_RESULTADOS).orderBy('session_id');
  expect(linhas.map((l: any) => l.session_id)).toEqual([s.sessionId, outra.sessionId]);
});

it('sem a tabela, apagar os resultados de uma conta nao falha', async () => {
  await expect(apagarResultadosDoJogador(knex, 'uid_de_teste_123')).resolves.toBe(0);
});
