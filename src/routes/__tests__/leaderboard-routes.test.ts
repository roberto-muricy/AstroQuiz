/**
 * Rotas do ranking: validacao, formato e limites, contra um SQLite em memoria.
 */

import knexFactory from 'knex';
import { createLeaderboardRoutes } from '../leaderboard-routes';
import { limparCacheDoRanking } from '../../services/leaderboard-service';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracaoDeResultados = require('../../../database/migrations/2026.09.15T00.00.00.create-phase-results.js');
const migracaoDeJogadores = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');
/* eslint-enable @typescript-eslint/no-var-requires */

let knex: any;
let strapi: any;
let rotas: any[];
let ipDaVez = 0;

beforeEach(async () => {
  knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  await migracaoDeResultados.up(knex);
  await migracaoDeJogadores.up(knex);
  strapi = { db: { connection: knex }, log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } };
  rotas = createLeaderboardRoutes(strapi);
  limparCacheDoRanking();

  await knex('leaderboard_players').insert({
    firebase_uid: 'uid_da_rota',
    public_id: 'pub-rota',
    pseudonym_adjective: 'veloz',
    pseudonym_object: 'cometa',
    pseudonym_number: 1,
    country_code: 'BR',
    show_country: true,
    visible: true,
    hidden_by_admin: false,
    nickname_hidden: false,
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
  });
  const agora = new Date().toISOString();
  await knex('phase_results').insert({
    session_id: 'quiz_rota_1',
    firebase_uid: 'uid_da_rota',
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
    started_at: agora,
    finished_at: agora,
    created_at: agora,
  });
});

afterEach(async () => {
  await knex.destroy();
});

async function chamar(
  path: string,
  entrada: { url?: string; params?: any; query?: any; ip?: string } = {}
) {
  const rota = rotas.find((r) => r.method === 'GET' && r.path === path);
  const pilha = Array.isArray(rota.handler) ? rota.handler : [rota.handler];
  ipDaVez++;
  const ctx: any = {
    params: entrada.params || {},
    query: entrada.query || {},
    request: { path: entrada.url || path, ip: entrada.ip || `10.1.0.${ipDaVez}`, headers: {} },
    state: {},
    status: 200,
    body: undefined,
    set: () => {},
  };
  for (const [nome, status] of Object.entries({ badRequest: 400, internalServerError: 500 })) {
    ctx[nome] = (message: string) => {
      ctx.status = status;
      ctx.body = { data: null, error: { status, message } };
    };
  }
  const executar = async (i: number): Promise<void> => {
    if (i < pilha.length) await pilha[i](ctx, () => executar(i + 1));
  };
  await executar(0);
  return ctx;
}

it('registra as quatro rotas de leitura publicas; /me exige login', () => {
  // GET /api/leaderboard/me le as configuracoes do proprio jogador: e a unica
  // leitura com login, e por isso leva o middleware de autenticacao a mais.
  const publicas = rotas.filter((r) => r.method === 'GET' && r.path !== '/api/leaderboard/me');
  expect(publicas.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
    'GET /api/leaderboard/all-time',
    'GET /api/leaderboard/country/:country',
    'GET /api/leaderboard/phase',
    'GET /api/leaderboard/weekly',
  ]);
  expect(publicas.every((r) => r.config?.auth === false && r.handler.length === 2)).toBe(true);

  const minhasConfiguracoes = rotas.find((r) => r.method === 'GET' && r.path === '/api/leaderboard/me');
  expect(minhasConfiguracoes.handler).toHaveLength(3);
});

it('devolve a pagina no formato da API, com paginacao padrao', async () => {
  for (const path of ['/api/leaderboard/all-time', '/api/leaderboard/weekly', '/api/leaderboard/phase']) {
    const ctx = await chamar(path);
    expect(ctx.status).toBe(200);
    expect(ctx.body.success).toBe(true);
    expect(ctx.body.data).toEqual(expect.objectContaining({ page: 1, pageSize: 20, totalPlayers: 1 }));
    expect(ctx.body.data.entries[0]).toEqual({
      position: 1,
      publicId: 'pub-rota',
      name: { type: 'generated', adjective: 'veloz', object: 'cometa', number: 1 },
      country: 'BR',
      score: 500,
      highestPhase: 1,
    });
  }
});

it('recusa paginacao invalida', async () => {
  for (const query of [
    { pageSize: '51' },
    { pageSize: '0' },
    { page: '0' },
    { page: 'abc' },
    { page: '1001' },
    { page: ['1', '2'] },
    { pageSize: '-5' },
  ]) {
    const ctx = await chamar('/api/leaderboard/all-time', { query });
    expect(ctx.status).toBe(400);
  }
  expect((await chamar('/api/leaderboard/all-time', { query: { page: '2', pageSize: '50' } })).status).toBe(200);
});

describe('por pais', () => {
  const porPais = (country: any, query: any = {}) =>
    chamar('/api/leaderboard/country/:country', {
      url: `/api/leaderboard/country/${country}`,
      params: { country },
      query,
    });

  it('aceita o codigo em minusculas e usa o ranking semanal por padrao', async () => {
    const ctx = await porPais('br');
    expect(ctx.status).toBe(200);
    expect(ctx.body.data).toEqual(expect.objectContaining({ country: 'BR', board: 'weekly', totalPlayers: 1 }));
  });

  it('escolhe o ranking pelo parametro board', async () => {
    expect((await porPais('BR', { board: 'phase' })).body.data.board).toBe('phase');
    expect((await porPais('BR', { board: 'all-time' })).body.data.board).toBe('all-time');
    expect((await porPais('PT', { board: 'all-time' })).body.data.totalPlayers).toBe(0);
  });

  it('recusa pais ou board invalidos', async () => {
    for (const [country, query] of [
      ['BRA', {}],
      ['B1', {}],
      ['BR', { board: 'mensal' }],
      ['BR', { board: ['weekly', 'phase'] }],
    ] as Array<[string, any]>) {
      expect((await porPais(country, query)).status).toBe(400);
    }
  });
});

it('erro interno devolve mensagem generica, sem detalhes', async () => {
  const quebrado: any = () => {
    throw new Error('detalhe interno do banco');
  };
  quebrado.raw = async () => {
    throw new Error('detalhe interno do banco');
  };
  rotas = createLeaderboardRoutes({ ...strapi, db: { connection: quebrado } });

  const ctx = await chamar('/api/leaderboard/all-time');
  expect(ctx.status).toBe(500);
  expect(JSON.stringify(ctx.body)).not.toContain('detalhe interno');
  expect(strapi.log.error).toHaveBeenCalled();
});

it('limita a 120 requisicoes por minuto por IP', async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 121; i++) {
    statuses.push((await chamar('/api/leaderboard/weekly', { ip: '10.99.0.1' })).status);
  }
  expect(statuses.slice(0, 120).every((s) => s === 200)).toBe(true);
  expect(statuses[120]).toBe(429);
});
