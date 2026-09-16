/**
 * Ranking (somente leitura) contra um SQLite em memoria, com o schema criado
 * pelas proprias migracoes.
 */

import knexFactory from 'knex';
import {
  montarPaginaDoRanking,
  semanaDoRanking,
  limparCacheDoRanking,
  TipoDeRanking,
} from '../leaderboard-service';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracaoDeResultados = require('../../../database/migrations/2026.09.15T00.00.00.create-phase-results.js');
const migracaoDeJogadores = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');
/* eslint-enable @typescript-eslint/no-var-requires */

const AGORA = new Date('2026-09-16T15:00:00.000Z'); // quarta-feira
const INICIO_DA_SEMANA = '2026-09-14T03:00:00.000Z'; // segunda 00:00 em Brasilia
const SEMANA_PASSADA = '2026-09-10T12:00:00.000Z';

let knex: any;
let sessoes = 0;
let numeros = 0;

const novoKnex = () =>
  knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });

beforeEach(async () => {
  sessoes = 0;
  numeros = 0;
  knex = novoKnex();
  await migracaoDeResultados.up(knex);
  await migracaoDeJogadores.up(knex);
  limparCacheDoRanking();
});

afterEach(async () => {
  await knex.destroy();
});

async function jogador(uid: string, publicId: string, extra: Record<string, any> = {}) {
  numeros++;
  await knex('leaderboard_players').insert({
    firebase_uid: uid,
    public_id: publicId,
    pseudonym_adjective: 'veloz',
    pseudonym_object: 'cometa',
    pseudonym_number: numeros,
    nickname: null,
    nickname_normalized: null,
    nickname_changed_at: null,
    country_code: 'BR',
    show_country: true,
    visible: true,
    hidden_by_admin: false,
    nickname_hidden: false,
    created_at: SEMANA_PASSADA,
    updated_at: SEMANA_PASSADA,
    ...extra,
  });
}

async function resultado(
  uid: string | null,
  fase: number,
  score: number,
  quando: string,
  extra: Record<string, any> = {}
) {
  sessoes++;
  await knex('phase_results').insert({
    session_id: `quiz_teste_${sessoes}`,
    firebase_uid: uid,
    phase: fase,
    locale: 'pt',
    score,
    max_possible_score: 1740,
    correct_answers: 10,
    total_questions: 10,
    skipped: 0,
    timeouts: 0,
    max_streak: 10,
    total_time_ms: 50000,
    client_time_ms: 50000,
    server_time_ms: 51000,
    passed: true,
    eligible: true,
    flags: null,
    started_at: quando,
    finished_at: quando,
    created_at: quando,
    ...extra,
  });
}

const ranking = (tipo: TipoDeRanking, opcoes: Record<string, any> = {}) =>
  montarPaginaDoRanking(knex, { tipo, agora: AGORA, ...opcoes });

const ids = (pagina: any) => pagina.entries.map((e: any) => e.publicId);

describe('semanaDoRanking', () => {
  it('comeca na segunda 00:00 de Brasilia e dura sete dias', () => {
    const { inicio, fim } = semanaDoRanking(AGORA);
    expect(inicio.toISOString()).toBe(INICIO_DA_SEMANA);
    expect(fim.toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  it('domingo 23:59 em Brasilia ainda e a semana que termina', () => {
    expect(semanaDoRanking(new Date('2026-09-21T02:59:00.000Z')).inicio.toISOString()).toBe(INICIO_DA_SEMANA);
  });

  it('segunda 00:00 em Brasilia ja e a semana nova', () => {
    expect(semanaDoRanking(new Date('2026-09-21T03:00:00.000Z')).inicio.toISOString()).toBe(
      '2026-09-21T03:00:00.000Z'
    );
  });
});

describe('pontos de todo o historico', () => {
  it('soma a melhor pontuacao de cada fase; repeticoes so contam se baterem o recorde', async () => {
    await jogador('uid_a', 'pub-a');
    await resultado('uid_a', 1, 500, '2026-09-01T10:00:00.000Z');
    await resultado('uid_a', 1, 600, '2026-09-02T10:00:00.000Z');
    await resultado('uid_a', 1, 450, '2026-09-03T10:00:00.000Z');
    await resultado('uid_a', 2, 400, '2026-09-04T10:00:00.000Z');

    const pagina = await ranking('all-time');
    expect(pagina.entries).toEqual([
      expect.objectContaining({ position: 1, publicId: 'pub-a', score: 1000, highestPhase: 2 }),
    ]);
  });

  it('desempata por quem chegou primeiro e depois pelo id publico', async () => {
    for (const [uid, pub] of [
      ['uid_z', 'pub-z'],
      ['uid_b', 'pub-b'],
      ['uid_c', 'pub-c'],
      ['uid_e', 'pub-e'],
    ]) {
      await jogador(uid, pub);
    }
    await resultado('uid_z', 1, 900, '2026-09-15T12:00:00.000Z');
    await resultado('uid_b', 1, 600, '2026-09-15T10:00:00.000Z');
    await resultado('uid_e', 1, 600, '2026-09-15T09:00:00.000Z');
    await resultado('uid_c', 1, 600, '2026-09-15T09:00:00.000Z');

    const pagina = await ranking('all-time');
    expect(ids(pagina)).toEqual(['pub-z', 'pub-c', 'pub-e', 'pub-b']);
    expect(pagina.entries.map((e) => e.position)).toEqual([1, 2, 3, 4]);
  });

  it('so conta resultados validos para o ranking, de jogadores cadastrados', async () => {
    await jogador('uid_a', 'pub-a');
    await resultado('uid_a', 1, 500, '2026-09-01T10:00:00.000Z');
    await resultado('uid_a', 1, 690, '2026-09-02T10:00:00.000Z', { eligible: false });
    await resultado('uid_sem_cadastro', 1, 900, '2026-09-02T10:00:00.000Z');
    await resultado(null, 1, 900, '2026-09-02T10:00:00.000Z', { eligible: false });

    const pagina = await ranking('all-time');
    expect(pagina.totalPlayers).toBe(1);
    expect(pagina.entries[0].score).toBe(500);
  });
});

describe('contagem anti-salto', () => {
  it('uma fase adiante da sequencia so conta depois de aprovar as anteriores', async () => {
    await jogador('uid_salto', 'pub-salto');
    await resultado('uid_salto', 3, 500, '2026-09-01T10:00:00.000Z');
    await resultado('uid_salto', 5, 700, '2026-09-02T10:00:00.000Z');
    await resultado('uid_salto', 4, 200, '2026-09-03T10:00:00.000Z', { passed: false });

    let pagina = await ranking('all-time');
    // Parte da fase 3 (primeira registrada); a 4 reprovada conta, a 5 ainda nao.
    expect(pagina.entries[0]).toEqual(expect.objectContaining({ score: 700, highestPhase: 3 }));

    await resultado('uid_salto', 4, 300, '2026-09-04T10:00:00.000Z');
    limparCacheDoRanking();

    pagina = await ranking('all-time');
    expect(pagina.entries[0]).toEqual(expect.objectContaining({ score: 1500, highestPhase: 5 }));
  });
});

describe('semanal', () => {
  it('conta so a semana atual, com a melhor pontuacao feita nela', async () => {
    await jogador('uid_a', 'pub-a');
    await jogador('uid_b', 'pub-b');
    await resultado('uid_a', 1, 800, SEMANA_PASSADA);
    await resultado('uid_a', 2, 300, '2026-09-14T02:59:59.999Z'); // domingo 23:59 em Brasilia
    await resultado('uid_a', 3, 250, INICIO_DA_SEMANA);
    await resultado('uid_a', 1, 400, '2026-09-15T10:00:00.000Z');
    await resultado('uid_b', 1, 100, '2026-09-16T10:00:00.000Z');
    await resultado('uid_b', 2, 999, '2026-09-21T03:00:00.000Z'); // ja e a semana seguinte

    const semanal = await ranking('weekly');
    expect(semanal).toEqual(
      expect.objectContaining({
        board: 'weekly',
        periodStart: INICIO_DA_SEMANA,
        periodEnd: '2026-09-21T03:00:00.000Z',
      })
    );
    expect(semanal.entries.map((e) => [e.publicId, e.score])).toEqual([
      ['pub-a', 650],
      ['pub-b', 100],
    ]);

    const geral = await ranking('all-time');
    expect(geral.entries.find((e) => e.publicId === 'pub-a')?.score).toBe(1350);
  });

  it('quem nao jogou na semana nao aparece', async () => {
    await jogador('uid_a', 'pub-a');
    await resultado('uid_a', 1, 800, SEMANA_PASSADA);
    expect((await ranking('weekly')).totalPlayers).toBe(0);
  });
});

describe('fase alcancada', () => {
  it('ordena pela maior fase aprovada; empate vai para quem chegou antes', async () => {
    await jogador('uid_a', 'pub-a');
    await jogador('uid_b', 'pub-b');
    await jogador('uid_c', 'pub-c');
    await jogador('uid_d', 'pub-d');
    for (let fase = 1; fase <= 3; fase++) {
      await resultado('uid_a', fase, 300, `2026-09-0${fase + 4}T10:00:00.000Z`);
      await resultado('uid_b', fase, 100, `2026-09-0${fase}T10:00:00.000Z`);
    }
    await resultado('uid_c', 1, 690, '2026-09-01T10:00:00.000Z');
    await resultado('uid_d', 1, 50, '2026-09-01T10:00:00.000Z', { passed: false });

    const pagina = await ranking('phase');
    expect(pagina.entries.map((e) => [e.publicId, e.highestPhase, e.score])).toEqual([
      ['pub-b', 3, 300],
      ['pub-a', 3, 900],
      ['pub-c', 1, 690],
    ]);
  });
});

describe('visibilidade e nome exibido', () => {
  it('respeita visible, hidden_by_admin e nickname_hidden', async () => {
    await jogador('uid_invisivel', 'pub-1', { visible: false });
    await jogador('uid_moderado', 'pub-2', { hidden_by_admin: true });
    await jogador('uid_apelido_oculto', 'pub-3', {
      nickname: 'Estrela Guia',
      nickname_normalized: 'estrela guia',
      nickname_hidden: true,
    });
    await jogador('uid_apelido', 'pub-4', { nickname: 'Luz Azul', nickname_normalized: 'luz azul' });
    await resultado('uid_invisivel', 1, 900, '2026-09-01T10:00:00.000Z');
    await resultado('uid_moderado', 1, 800, '2026-09-01T10:00:00.000Z');
    await resultado('uid_apelido_oculto', 1, 700, '2026-09-01T10:00:00.000Z');
    await resultado('uid_apelido', 1, 600, '2026-09-01T10:00:00.000Z');

    const pagina = await ranking('all-time');
    expect(pagina.totalPlayers).toBe(2);
    expect(pagina.entries[0]).toEqual(
      expect.objectContaining({
        position: 1,
        publicId: 'pub-3',
        name: { type: 'generated', adjective: 'veloz', object: 'cometa', number: 3 },
      })
    );
    expect(pagina.entries[1]).toEqual(
      expect.objectContaining({ position: 2, publicId: 'pub-4', name: { type: 'nickname', text: 'Luz Azul' } })
    );
    expect(JSON.stringify(pagina)).not.toContain('Estrela Guia');
  });

  it('nunca expoe o firebase_uid', async () => {
    await jogador('uid_secreto_1', 'pub-1');
    await resultado('uid_secreto_1', 1, 500, INICIO_DA_SEMANA);

    for (const tipo of ['all-time', 'weekly', 'phase'] as TipoDeRanking[]) {
      expect(JSON.stringify(await ranking(tipo))).not.toContain('uid_secreto');
      expect(JSON.stringify(await ranking(tipo, { pais: 'BR' }))).not.toContain('uid_secreto');
    }
  });
});

describe('pais', () => {
  beforeEach(async () => {
    await jogador('uid_1', 'pub-1', { country_code: 'BR' });
    await jogador('uid_2', 'pub-2', { country_code: 'PT' });
    await jogador('uid_3', 'pub-3', { country_code: 'BR', show_country: false });
    await jogador('uid_4', 'pub-4', { country_code: 'BR' });
    await resultado('uid_1', 1, 900, '2026-09-01T10:00:00.000Z');
    await resultado('uid_2', 1, 800, '2026-09-01T10:00:00.000Z');
    await resultado('uid_3', 1, 700, '2026-09-01T10:00:00.000Z');
    await resultado('uid_4', 1, 600, '2026-09-01T10:00:00.000Z');
  });

  it('no ranking geral, o pais so aparece para quem escolheu mostrar', async () => {
    const pagina = await ranking('all-time');
    expect(pagina.entries.map((e) => [e.publicId, e.country])).toEqual([
      ['pub-1', 'BR'],
      ['pub-2', 'PT'],
      ['pub-3', null],
      ['pub-4', 'BR'],
    ]);
  });

  it('por pais, so entra quem mostra aquele pais, com posicoes contadas dentro dele', async () => {
    const brasil = await ranking('all-time', { pais: 'BR' });
    expect(brasil.country).toBe('BR');
    expect(brasil.totalPlayers).toBe(2);
    expect(brasil.entries.map((e) => [e.position, e.publicId])).toEqual([
      [1, 'pub-1'],
      [2, 'pub-4'],
    ]);

    const portugal = await ranking('phase', { pais: 'pt' });
    expect(ids(portugal)).toEqual(['pub-2']);
  });
});

describe('paginacao', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await jogador(`uid_${i}`, `pub-${i}`);
      await resultado(`uid_${i}`, 1, 600 - i * 100, '2026-09-01T10:00:00.000Z');
    }
  });

  it('divide em paginas mantendo as posicoes absolutas', async () => {
    const primeira = await ranking('all-time', { pagina: 1, tamanho: 2 });
    expect(primeira).toEqual(expect.objectContaining({ page: 1, pageSize: 2, totalPlayers: 5, totalPages: 3 }));
    expect(primeira.entries.map((e) => e.position)).toEqual([1, 2]);

    const terceira = await ranking('all-time', { pagina: 3, tamanho: 2 });
    expect(terceira.entries.map((e) => [e.position, e.publicId])).toEqual([[5, 'pub-5']]);

    expect((await ranking('all-time', { pagina: 4, tamanho: 2 })).entries).toEqual([]);
  });

  it('aplica o limite maximo por pagina', async () => {
    expect((await ranking('all-time', { tamanho: 500 })).pageSize).toBe(50);
    expect((await ranking('all-time')).pageSize).toBe(20);
  });
});

describe('posicao do proprio jogador', () => {
  beforeEach(async () => {
    await jogador('uid_1', 'pub-1');
    await jogador('uid_2', 'pub-2');
    await jogador('uid_3', 'pub-3');
    await resultado('uid_1', 1, 900, '2026-09-15T10:00:00.000Z');
    await resultado('uid_2', 1, 600, '2026-09-15T10:00:00.000Z');
    await resultado('uid_3', 1, 300, '2026-09-15T10:00:00.000Z');
  });

  it('convidado nao recebe posicao', async () => {
    const pagina = await ranking('all-time');
    expect(pagina.me).toBeNull();
    expect(pagina.hypotheticalPosition).toBeNull();
  });

  it('quem esta logado recebe a propria posicao', async () => {
    const pagina = await ranking('all-time', { firebaseUid: 'uid_2' });
    expect(pagina.me).toEqual(
      expect.objectContaining({ position: 2, publicId: 'pub-2', score: 600, inBoard: true })
    );
  });

  it('a posicao vale mesmo quando o jogador esta fora da pagina mostrada', async () => {
    const pagina = await ranking('all-time', { firebaseUid: 'uid_3', tamanho: 1 });
    expect(pagina.entries).toHaveLength(1);
    expect(pagina.me).toEqual(expect.objectContaining({ position: 3, inBoard: true }));
  });

  it('quem desligou aparecer no ranking recebe a posicao que teria', async () => {
    await knex('leaderboard_players').where({ firebase_uid: 'uid_2' }).update({ visible: false });
    limparCacheDoRanking();

    const pagina = await ranking('all-time', { firebaseUid: 'uid_2' });
    expect(pagina.totalPlayers).toBe(2);
    expect(ids(pagina)).toEqual(['pub-1', 'pub-3']);
    expect(pagina.me).toEqual(expect.objectContaining({ position: 2, inBoard: false }));
  });

  it('sem partida que conte, nao ha posicao', async () => {
    await jogador('uid_sem_partida', 'pub-sem-partida');
    expect((await ranking('all-time', { firebaseUid: 'uid_sem_partida' })).me).toBeNull();
    expect((await ranking('all-time', { firebaseUid: 'uid_sem_cadastro' })).me).toBeNull();
  });

  it('no recorte por pais, so quem e daquele pais tem posicao', async () => {
    await knex('leaderboard_players').where({ firebase_uid: 'uid_2' }).update({ country_code: 'PT' });
    limparCacheDoRanking();

    expect((await ranking('all-time', { firebaseUid: 'uid_2', pais: 'BR' })).me).toBeNull();
    expect((await ranking('all-time', { firebaseUid: 'uid_2', pais: 'PT' })).me).toEqual(
      expect.objectContaining({ position: 1, inBoard: true })
    );
  });

  it('nunca expoe o firebase_uid', async () => {
    const pagina = await ranking('all-time', { firebaseUid: 'uid_2' });
    expect(JSON.stringify(pagina)).not.toContain('uid_2');
  });
});

describe('posicao hipotetica', () => {
  beforeEach(async () => {
    await jogador('uid_1', 'pub-1');
    await jogador('uid_2', 'pub-2');
    await resultado('uid_1', 1, 900, '2026-09-15T10:00:00.000Z');
    await resultado('uid_2', 1, 600, '2026-09-15T10:00:00.000Z');
  });

  it('diz onde a pontuacao guardada no aparelho entraria', async () => {
    expect((await ranking('all-time', { pontuacaoHipotetica: 1000 })).hypotheticalPosition).toBe(1);
    expect((await ranking('all-time', { pontuacaoHipotetica: 700 })).hypotheticalPosition).toBe(2);
    expect((await ranking('all-time', { pontuacaoHipotetica: 100 })).hypotheticalPosition).toBe(3);
  });

  it('empate mostra a mesma posicao de quem ja esta la', async () => {
    expect((await ranking('all-time', { pontuacaoHipotetica: 600 })).hypotheticalPosition).toBe(2);
  });

  it('nao vale no recorte por fase, onde pontos nao ordenam', async () => {
    expect((await ranking('phase', { pontuacaoHipotetica: 1000 })).hypotheticalPosition).toBeNull();
  });

  it('conta so dentro do pais pedido', async () => {
    await knex('leaderboard_players').where({ firebase_uid: 'uid_1' }).update({ country_code: 'PT' });
    limparCacheDoRanking();
    expect((await ranking('all-time', { pais: 'BR', pontuacaoHipotetica: 100 })).hypotheticalPosition).toBe(2);
  });
});

describe('cache e tabelas ausentes', () => {
  it('um resultado novo aparece depois de limpar o cache', async () => {
    await jogador('uid_a', 'pub-a');
    await resultado('uid_a', 1, 500, '2026-09-01T10:00:00.000Z');
    expect((await ranking('all-time')).entries[0].score).toBe(500);

    await resultado('uid_a', 2, 300, '2026-09-02T10:00:00.000Z');
    expect((await ranking('all-time')).entries[0].score).toBe(500);

    limparCacheDoRanking();
    expect((await ranking('all-time')).entries[0].score).toBe(800);
  });

  it('sem as tabelas, o ranking vem vazio em vez de falhar', async () => {
    const vazio = novoKnex();
    const pagina = await montarPaginaDoRanking(vazio, { tipo: 'weekly', agora: AGORA });
    expect(pagina).toEqual(expect.objectContaining({ totalPlayers: 0, totalPages: 0, entries: [] }));
    await vazio.destroy();
  });
});
