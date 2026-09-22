/**
 * Termina uma fase logado (login anonimo inclusive) e o cadastro no ranking
 * nasce sozinho — sem precisar visitar a aba Ranking antes. E o que
 * `registrarResultado`, em quiz-routes.ts, faz depois de gravar o resultado:
 * `garantirJogador` quando a sessao tem firebaseUid. Aqui testa-se essa
 * combinacao direto contra as duas tabelas, sem subir rotas HTTP.
 */

import knexFactory from 'knex';
import {
  garantirTabelaDeResultados,
  registrarResultadoDaSessao,
} from '../../services/phase-results';
import { garantirJogador, buscarJogador } from '../../services/leaderboard-players';
import { createSession } from '../../services/quiz-session';
import { decidirResposta, aplicarResposta } from '../../services/quiz-answer-rules';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracao = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');
const migracaoDasRegras = require('../../../database/migrations/2026.09.17T00.00.00.leaderboard-nickname-rules.js');
/* eslint-enable @typescript-eslint/no-var-requires */

let knex: any;

beforeEach(async () => {
  knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  await garantirTabelaDeResultados(knex);
  await migracao.up(knex);
  await migracaoDasRegras.up(knex);
});

afterEach(async () => {
  await knex.destroy();
});

function sessaoTerminada(uid: string | null) {
  const s = createSession({
    sessionId: `quiz_registro_${uid ?? 'convidado'}`,
    phaseNumber: 1,
    locale: 'pt',
    firebaseUid: uid ?? undefined,
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
      agora: Date.UTC(2026, 8, 22, 12, 0, i),
    });
  }
  return s;
}

// Mesma logica de registrarResultado (quiz-routes.ts): grava o resultado e,
// se a sessao tiver firebaseUid, garante o cadastro no ranking.
async function registrarResultado(session: any) {
  await registrarResultadoDaSessao(knex, session);
  if (session.firebaseUid) await garantirJogador(knex, session.firebaseUid);
}

describe('cadastro automatico no ranking ao terminar uma fase', () => {
  it('cria o cadastro, visivel, para quem termina logado — sem precisar abrir a aba Ranking', async () => {
    const sessao = sessaoTerminada('uid_anonimo_123');
    await registrarResultado(sessao);

    const jogador = await buscarJogador(knex, 'uid_anonimo_123');
    expect(jogador).not.toBeNull();
    expect(jogador!.visivel).toBe(true);
    expect(jogador!.pseudonimo.adjetivo).toBeTruthy();
  });

  it('nao cria cadastro nenhum para quem joga sem conta (convidado)', async () => {
    const sessao = sessaoTerminada(null);
    await registrarResultado(sessao);

    // Nao ha uid para buscar; a garantia e que nenhuma linha foi inserida.
    const total = await knex('leaderboard_players').count('* as n').first();
    expect(Number(total.n)).toBe(0);
  });

  it('e idempotente: terminar mais de uma fase logado nao duplica nem reseta o cadastro', async () => {
    const primeira = sessaoTerminada('uid_repetido');
    await registrarResultado(primeira);
    const depoisDaPrimeira = await buscarJogador(knex, 'uid_repetido');

    const segunda = sessaoTerminada('uid_repetido');
    segunda.sessionId = 'quiz_registro_uid_repetido_2';
    await registrarResultado(segunda);
    const depoisDaSegunda = await buscarJogador(knex, 'uid_repetido');

    expect(depoisDaSegunda!.pseudonimo).toEqual(depoisDaPrimeira!.pseudonimo);
    const total = await knex('leaderboard_players').count('* as n').first();
    expect(Number(total.n)).toBe(1);
  });
});
