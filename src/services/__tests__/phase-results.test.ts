/**
 * Resultados de fase contra um SQLite em memoria.
 *
 * O SQL e o mesmo que roda no Postgres de producao: datas como texto ISO e
 * nada especifico de um banco.
 */

import knexFactory from 'knex';
import {
  garantirTabelaDeResultados,
  montarResultadoDaFase,
  registrarResultadoDaSessao,
  apagarResultadosDoJogador,
  TABELA_DE_RESULTADOS,
} from '../phase-results';
import { createSession } from '../quiz-session';
import { decidirResposta, aplicarResposta } from '../quiz-answer-rules';

let knex: any;
let contador = 0;

beforeEach(async () => {
  knex = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await garantirTabelaDeResultados(knex);
});

afterEach(async () => {
  await knex.destroy();
});

function sessaoJogada(
  opcoes: {
    uid?: string | null;
    fase?: number;
    acertos?: number;
    total?: number;
    respondidas?: number;
    tempoMs?: number;
    comRelogioDoServidor?: boolean;
  } = {}
) {
  const {
    uid = 'uid_de_teste_123',
    fase = 1,
    acertos = 10,
    total = 10,
    respondidas = total,
    tempoMs = 5000,
    comRelogioDoServidor = true,
  } = opcoes;

  contador++;
  const s = createSession({
    sessionId: `quiz_1757851200000_resultado${String(contador).padStart(5, '0')}`,
    phaseNumber: fase,
    locale: 'pt',
    firebaseUid: uid ?? undefined,
    questions: Array.from({ length: total }, (_, i) => ({ id: i + 1, level: 1 })),
  });

  for (let i = 0; i < respondidas; i++) {
    const decisao = decidirResposta(s, {});
    if (decisao.tipo !== 'atual') throw new Error('sessao de teste saiu do fluxo');
    const certo = i < acertos;
    aplicarResposta(s, {
      questionId: decisao.pergunta.id,
      indice: decisao.indice,
      selectedOption: 'A',
      correctOption: certo ? 'A' : 'B',
      isCorrect: certo,
      isTimeout: false,
      isSkipped: false,
      level: 1,
      tempo: {
        efetivo: tempoMs,
        cliente: tempoMs,
        servidor: comRelogioDoServidor ? tempoMs + 300 : null,
      },
      agora: Date.UTC(2026, 8, 14, 12, 0, i),
    });
  }
  return s;
}

describe('garantirTabelaDeResultados', () => {
  it('cria a tabela uma vez e nao falha na segunda', async () => {
    expect(await knex.schema.hasTable(TABELA_DE_RESULTADOS)).toBe(true);
    expect(await garantirTabelaDeResultados(knex)).toBe(false);
  });
});

describe('registrarResultadoDaSessao', () => {
  it('grava uma unica vez por sessao', async () => {
    const s = sessaoJogada();
    expect(await registrarResultadoDaSessao(knex, s)).toBe(true);
    expect(await registrarResultadoDaSessao(knex, s)).toBe(false);
    expect(await knex(TABELA_DE_RESULTADOS)).toHaveLength(1);
  });

  it('sessao incompleta nao gera resultado', async () => {
    const s = sessaoJogada({ respondidas: 5 });
    expect(montarResultadoDaFase(s)).toBeNull();
    expect(await registrarResultadoDaSessao(knex, s)).toBe(false);
    expect(await knex(TABELA_DE_RESULTADOS)).toHaveLength(0);
  });

  it('guarda os campos da fase', async () => {
    const s = sessaoJogada({ acertos: 7, tempoMs: 8000 });
    await registrarResultadoDaSessao(knex, s);
    const [linha] = await knex(TABELA_DE_RESULTADOS);

    expect(linha).toEqual(
      expect.objectContaining({
        session_id: s.sessionId,
        firebase_uid: 'uid_de_teste_123',
        phase: 1,
        locale: 'pt',
        score: s.score,
        max_possible_score: 690,
        correct_answers: 7,
        total_questions: 10,
        max_streak: 7,
        total_time_ms: 80000,
        client_time_ms: 80000,
        server_time_ms: 83000,
      })
    );
    expect(Boolean(linha.passed)).toBe(true);
    expect(Boolean(linha.eligible)).toBe(true);
    expect(new Date(linha.finished_at).toISOString()).toBe(s.completedAt);
  });

  it('partida de convidado fica guardada, mas nao conta para o ranking', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ uid: null }));
    const [linha] = await knex(TABELA_DE_RESULTADOS);
    expect(linha.firebase_uid).toBeNull();
    expect(Boolean(linha.eligible)).toBe(false);
  });

  it('sem o relogio do servidor em todas as respostas, nao conta para o ranking', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ comRelogioDoServidor: false }));
    const [linha] = await knex(TABELA_DE_RESULTADOS);
    expect(linha.server_time_ms).toBeNull();
    expect(Boolean(linha.eligible)).toBe(false);
  });

  it('pontuacao acima do teto possivel nao conta para o ranking', async () => {
    const s = sessaoJogada();
    s.score = 99999;
    await registrarResultadoDaSessao(knex, s);
    const [linha] = await knex(TABELA_DE_RESULTADOS);
    expect(Boolean(linha.eligible)).toBe(false);
  });

  it('fase com menos de 10 perguntas fica guardada, mas nao conta para o ranking', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ total: 8, acertos: 8 }));
    const [linha] = await knex(TABELA_DE_RESULTADOS);
    expect(linha.total_questions).toBe(8);
    expect(Boolean(linha.eligible)).toBe(false);
  });

  it('aprovacao segue o limiar de 60%', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ acertos: 6 }));
    await registrarResultadoDaSessao(knex, sessaoJogada({ acertos: 5 }));
    const linhas = await knex(TABELA_DE_RESULTADOS).orderBy('id');
    expect(linhas.map((l: any) => Boolean(l.passed))).toEqual([true, false]);
  });

  it('marca resposta certa que o servidor viu levar muito mais tempo que o app', async () => {
    const s = sessaoJogada();
    s.answers[3].timeUsedServer = s.answers[3].timeUsed + 20000;
    await registrarResultadoDaSessao(knex, s);
    const [linha] = await knex(TABELA_DE_RESULTADOS);
    expect(linha.flags).toBe('server_time_gap');
  });

  it('marca a primeira aparicao de uma conta acima da fase 10', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ fase: 25 }));
    await registrarResultadoDaSessao(knex, sessaoJogada({ fase: 26 }));
    await registrarResultadoDaSessao(knex, sessaoJogada({ uid: 'uid_outra_conta_1', fase: 3 }));
    const linhas = await knex(TABELA_DE_RESULTADOS).orderBy('id');
    expect(linhas.map((l: any) => l.flags)).toEqual(['first_seen_high', null, null]);
  });
});

describe('apagarResultadosDoJogador', () => {
  it('remove so os resultados daquela conta', async () => {
    await registrarResultadoDaSessao(knex, sessaoJogada({ uid: 'uid_que_sai_12345' }));
    await registrarResultadoDaSessao(knex, sessaoJogada({ uid: 'uid_que_sai_12345' }));
    await registrarResultadoDaSessao(knex, sessaoJogada({ uid: 'uid_que_fica_1234' }));

    expect(await apagarResultadosDoJogador(knex, 'uid_que_sai_12345')).toBe(2);
    const restantes = await knex(TABELA_DE_RESULTADOS);
    expect(restantes.map((l: any) => l.firebase_uid)).toEqual(['uid_que_fica_1234']);
  });
});
