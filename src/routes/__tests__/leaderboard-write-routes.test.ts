/**
 * Escrita no ranking: apelido, pais, denuncia e restauracao pela moderacao,
 * de ponta a ponta contra um SQLite em memoria, com o login do Firebase
 * simulado.
 *
 * Onde entra um termo bloqueado, ele e montado em tempo de execucao a partir
 * do conjunto de dados da biblioteca, e as assercoes sao booleanas.
 */

jest.mock('../../services/firebase-auth', () => ({
  isFirebaseConfigured: () => true,
  extractBearerToken: (cabecalho?: string) =>
    typeof cabecalho === 'string' && cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null,
  verifyFirebaseToken: async (token: string) =>
    token.startsWith('token-') ? { uid: token.slice('token-'.length) } : null,
}));

import knexFactory from 'knex';
import { englishDataset } from 'obscenity';
import { createLeaderboardRoutes } from '../leaderboard-routes';
import { limparCacheDoRanking } from '../../services/leaderboard-service';
import { contemTermoBloqueado } from '../../services/nickname';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracoes = [
  '2026.09.14T00.00.00.create-leaderboard-players.js',
  '2026.09.15T00.00.00.create-phase-results.js',
  '2026.09.16T00.00.00.create-leaderboard-reports.js',
  '2026.09.17T00.00.00.leaderboard-nickname-rules.js',
].map((nome) => require(`../../../database/migrations/${nome}`));
/* eslint-enable @typescript-eslint/no-var-requires */

const INICIO = new Date('2026-09-17T12:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;
const depoisDe = (dias: number) => new Date(INICIO.getTime() + dias * DIA);

let knex: any;
let strapi: any;
let rotas: any[];
let relogio: Date;
let contador = 0;
const bloqueados = new Set<string>();
const admins = new Set<string>();

beforeEach(async () => {
  knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  for (const migracao of migracoes) await migracao.up(knex);
  relogio = INICIO;
  bloqueados.clear();
  admins.clear();
  limparCacheDoRanking();
  strapi = {
    db: {
      connection: knex,
      query: () => ({
        findOne: async ({ where }: any) => {
          if (bloqueados.has(where.firebaseUid)) return { isBlocked: true, role: 'user' };
          if (admins.has(where.firebaseUid)) return { isBlocked: false, role: 'admin' };
          return null;
        },
      }),
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
  rotas = createLeaderboardRoutes(strapi, { agora: () => relogio });
});

afterEach(async () => {
  await knex.destroy();
});

async function chamar(
  method: string,
  path: string,
  entrada: { uid?: string; body?: any; params?: any } = {}
) {
  const rota = rotas.find((r) => r.method === method && r.path === path);
  contador++;
  const ctx: any = {
    params: entrada.params || {},
    query: {},
    request: {
      path,
      ip: `10.3.${Math.floor(contador / 250)}.${contador % 250}`,
      headers: entrada.uid ? { authorization: `Bearer token-${entrada.uid}` } : {},
      body: entrada.body,
    },
    state: {},
    status: 200,
    body: undefined,
    set: () => {},
  };
  const erros: Record<string, number> = {
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    tooManyRequests: 429,
    internalServerError: 500,
    serviceUnavailable: 503,
  };
  for (const [nome, status] of Object.entries(erros)) {
    ctx[nome] = (message: string, details?: any) => {
      ctx.status = status;
      ctx.body = { data: null, error: { status, message, details } };
    };
  }
  const executar = async (i: number): Promise<void> => {
    if (i < rota.handler.length) await rota.handler[i](ctx, () => executar(i + 1));
  };
  await executar(0);
  return ctx;
}

const definir = (uid: string | undefined, body: any) => chamar('PUT', '/api/leaderboard/me', { uid, body });
const ler = (uid: string | undefined) => chamar('GET', '/api/leaderboard/me', { uid });
const sortear = (uid: string | undefined) => chamar('POST', '/api/leaderboard/me/pseudonym', { uid });
const apagar = (uid: string | undefined) => chamar('DELETE', '/api/leaderboard/me', { uid });
const denunciar = (uid: string | undefined, body: any) => chamar('POST', '/api/leaderboard/report', { uid, body });
const restaurar = (uid: string | undefined, playerId: string) =>
  chamar('POST', '/api/leaderboard/admin/players/:playerId/restore-nickname', { uid, params: { playerId } });

async function resultadoNoRanking(uid: string) {
  await knex('phase_results').insert({
    session_id: `quiz_escrita_${uid}`,
    firebase_uid: uid,
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
    started_at: '2026-09-16T10:00:00.000Z',
    finished_at: '2026-09-16T10:05:00.000Z',
    created_at: '2026-09-16T10:05:00.000Z',
  });
}

const NO_LITERAL = 2; // SyntaxKind.Literal na obscenity
function textoBloqueadoPelaBiblioteca(): string {
  for (const termo of englishDataset.build().blacklistedTerms) {
    const nos: any[] = termo.pattern.nodes;
    if (nos.length === 0 || !nos.every((no) => no.kind === NO_LITERAL)) continue;
    const texto = nos.map((no) => String.fromCodePoint(...no.chars)).join('');
    if (/^\p{L}{4,9}$/u.test(texto) && contemTermoBloqueado(texto)) return texto;
  }
  throw new Error('conjunto de dados sem termo utilizavel no teste');
}

describe('PUT /api/leaderboard/me', () => {
  it('exige login e recusa conta bloqueada', async () => {
    expect((await definir(undefined, { country: 'BR' })).status).toBe(401);

    bloqueados.add('uid_bloqueado');
    expect((await definir('uid_bloqueado', { country: 'BR' })).status).toBe(403);
    expect(await knex('leaderboard_players')).toHaveLength(0);
  });

  it('na primeira vez cria o cadastro com nome gerado, sem expor o uid', async () => {
    const ctx = await definir('uid_um', { country: 'br' });

    expect(ctx.status).toBe(200);
    expect(ctx.body.data).toEqual(
      expect.objectContaining({ country: 'BR', nickname: null, nextNicknameChangeAt: null, visible: true })
    );
    expect(ctx.body.data.name.type).toBe('generated');
    expect(ctx.body.data.publicId).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(JSON.stringify(ctx.body)).not.toContain('uid_um');
  });

  it('a primeira definicao e livre; depois, uma troca a cada 7 dias, com 429 e a data de liberacao', async () => {
    const primeira = await definir('uid_um', { nickname: '  Cometa   Azul ' });
    expect(primeira.status).toBe(200);
    expect(primeira.body.data).toEqual(
      expect.objectContaining({
        name: { type: 'nickname', text: 'Cometa Azul' },
        nicknameChangedAt: null,
        nextNicknameChangeAt: null,
      })
    );

    const troca = await definir('uid_um', { nickname: 'Nebulosa Rosa' });
    expect(troca.status).toBe(200);
    expect(troca.body.data.nextNicknameChangeAt).toBe(depoisDe(7).toISOString());

    relogio = depoisDe(6);
    const cedo = await definir('uid_um', { nickname: 'Luz Verde' });
    expect(cedo.status).toBe(429);
    expect(cedo.body.error.details).toEqual({ nextNicknameChangeAt: depoisDe(7).toISOString() });

    relogio = depoisDe(7);
    expect((await definir('uid_um', { nickname: 'Luz Verde' })).status).toBe(200);
  });

  it('remover o apelido e sempre permitido e nao abre excecao ao prazo', async () => {
    await definir('uid_um', { nickname: 'Cometa Azul' });
    await definir('uid_um', { nickname: 'Nebulosa Rosa' });

    relogio = depoisDe(1);
    const removido = await definir('uid_um', { nickname: null });
    expect(removido.status).toBe(200);
    expect(removido.body.data.name.type).toBe('generated');

    relogio = depoisDe(2);
    const novo = await definir('uid_um', { nickname: 'Luz Verde' });
    expect(novo.status).toBe(429);
    expect(novo.body.error.details).toEqual({ nextNicknameChangeAt: depoisDe(7).toISOString() });
  });

  it('apelido em uso ou reservado por outra conta recebe 409; o dono retoma', async () => {
    await definir('uid_um', { nickname: 'Órion Azul' });
    expect((await definir('uid_dois', { nickname: 'ORION  azul' })).status).toBe(409);

    await definir('uid_um', { nickname: 'Nebulosa Rosa' });
    relogio = depoisDe(1);
    expect((await definir('uid_dois', { nickname: 'Órion Azul' })).status).toBe(409);

    relogio = depoisDe(7);
    expect((await definir('uid_um', { nickname: 'Órion Azul' })).status).toBe(200);
  });

  it('valida o apelido sem repetir o texto recebido', async () => {
    const casos: Array<[any, string]> = [
      ['ab', 'too_short'],
      ['nome@site', 'invalid_characters'],
      [42, 'invalid_characters'],
      ['1234', 'too_few_letters'],
    ];
    for (const [nickname, motivo] of casos) {
      const ctx = await definir('uid_um', { nickname });
      expect(ctx.status).toBe(400);
      expect(ctx.body.error.details).toEqual({ reason: motivo });
    }

    const texto = textoBloqueadoPelaBiblioteca();
    const bloqueado = await definir('uid_um', { nickname: texto });
    expect(bloqueado.status).toBe(400);
    expect(bloqueado.body.error.details?.reason === 'not_allowed').toBe(true);
    expect(JSON.stringify(bloqueado.body).includes(texto)).toBe(false);
  });

  it('recusa corpo invalido e pais invalido', async () => {
    // `hidden` nao existe na API: campo desconhecido e recusado, e nao ignorado.
    for (const body of [undefined, [], {}, { nickname: 'Cometa Azul', hidden: true }, { country: 'BRA' }, { country: 'B1' }]) {
      expect((await definir('uid_um', body)).status).toBe(400);
    }
  });

  it('o ranking mostra o apelido novo na hora', async () => {
    await resultadoNoRanking('uid_um');

    await definir('uid_um', { country: 'BR' });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].name.type).toBe('generated');

    await definir('uid_um', { nickname: 'Cometa Azul' });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].name).toEqual({
      type: 'nickname',
      text: 'Cometa Azul',
    });
  });
});

describe('GET /api/leaderboard/me', () => {
  it('exige login', async () => {
    expect((await ler(undefined)).status).toBe(401);
  });

  it('na primeira leitura cria o cadastro e devolve o nome gerado', async () => {
    const ctx = await ler('uid_um');

    expect(ctx.status).toBe(200);
    expect(ctx.body.data).toEqual(
      expect.objectContaining({ nickname: null, country: null, visible: true, showCountry: true })
    );
    expect(ctx.body.data.name.type).toBe('generated');
    expect(ctx.body.data.publicId).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(JSON.stringify(ctx.body)).not.toContain('uid_um');
    expect(await knex('leaderboard_players')).toHaveLength(1);
  });

  it('a segunda leitura devolve o mesmo cadastro', async () => {
    const primeira = await ler('uid_um');
    const segunda = await ler('uid_um');

    expect(segunda.body.data).toEqual(primeira.body.data);
    expect(await knex('leaderboard_players')).toHaveLength(1);
  });

  it('mostra o que foi definido, inclusive depois de esconder', async () => {
    await definir('uid_um', { nickname: 'Cometa Azul', country: 'BR' });
    await definir('uid_um', { visible: false, showCountry: false });

    expect((await ler('uid_um')).body.data).toEqual(
      expect.objectContaining({
        name: { type: 'nickname', text: 'Cometa Azul' },
        nickname: 'Cometa Azul',
        country: 'BR',
        visible: false,
        showCountry: false,
      })
    );
  });
});

describe('PUT /api/leaderboard/me: visibilidade e pais', () => {
  it('liga e desliga aparecer no ranking e mostrar o pais', async () => {
    await definir('uid_um', { nickname: 'Cometa Azul', country: 'BR' });

    const escondido = await definir('uid_um', { visible: false, showCountry: false });
    expect(escondido.status).toBe(200);
    expect(escondido.body.data).toEqual(expect.objectContaining({ visible: false, showCountry: false }));

    const devolta = await definir('uid_um', { visible: true });
    expect(devolta.body.data).toEqual(expect.objectContaining({ visible: true, showCountry: false }));
  });

  it('quem desliga some do ranking e volta ao ligar', async () => {
    await resultadoNoRanking('uid_um');
    await definir('uid_um', { nickname: 'Cometa Azul' });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.totalPlayers).toBe(1);

    await definir('uid_um', { visible: false });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.totalPlayers).toBe(0);

    await definir('uid_um', { visible: true });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.totalPlayers).toBe(1);
  });

  it('desligar o pais tira a sigla do ranking, sem apagar o pais', async () => {
    await resultadoNoRanking('uid_um');
    await definir('uid_um', { country: 'BR' });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].country).toBe('BR');

    await definir('uid_um', { showCountry: false });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].country).toBeNull();
    expect((await ler('uid_um')).body.data.country).toBe('BR');
  });

  it('so aceita true ou false', async () => {
    for (const body of [{ visible: 'sim' }, { visible: 1 }, { showCountry: null }, { showCountry: 'false' }]) {
      expect((await definir('uid_um', body)).status).toBe(400);
    }
  });
});

describe('POST /api/leaderboard/me/pseudonym', () => {
  it('exige login', async () => {
    expect((await sortear(undefined)).status).toBe(401);
  });

  it('troca o nome gerado por outro', async () => {
    const antes = (await ler('uid_um')).body.data.generatedName;
    const ctx = await sortear('uid_um');

    expect(ctx.status).toBe(200);
    expect(ctx.body.data.generatedName).not.toEqual(antes);
    expect(ctx.body.data.name.type).toBe('generated');
  });

  it('cria o cadastro quando ainda nao existe', async () => {
    expect((await sortear('uid_novo')).status).toBe(200);
    expect(await knex('leaderboard_players')).toHaveLength(1);
  });

  it('nao mexe no apelido de quem tem um', async () => {
    await definir('uid_um', { nickname: 'Cometa Azul' });
    const ctx = await sortear('uid_um');

    expect(ctx.body.data.nickname).toBe('Cometa Azul');
    expect(ctx.body.data.name).toEqual({ type: 'nickname', text: 'Cometa Azul' });
  });
});

describe('DELETE /api/leaderboard/me', () => {
  it('exige login', async () => {
    expect((await apagar(undefined)).status).toBe(401);
  });

  it('tira o jogador do ranking e apaga o cadastro', async () => {
    await resultadoNoRanking('uid_um');
    await definir('uid_um', { nickname: 'Cometa Azul', country: 'BR' });
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.totalPlayers).toBe(1);

    const ctx = await apagar('uid_um');
    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ success: true, data: { removed: true, anonymizedResults: 1 } });

    expect(await knex('leaderboard_players')).toHaveLength(0);
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.totalPlayers).toBe(0);
  });

  it('as partidas ficam sem dono, em vez de sumir', async () => {
    await resultadoNoRanking('uid_um');
    await definir('uid_um', { nickname: 'Cometa Azul' });
    await apagar('uid_um');

    const linhas = await knex('phase_results');
    expect(linhas).toHaveLength(1);
    expect(linhas[0].firebase_uid).toBeNull();
    expect(Boolean(linhas[0].eligible)).toBe(false);
  });

  it('depois de apagar, ler de novo cria outro cadastro, com outro id publico', async () => {
    const antes = (await ler('uid_um')).body.data.publicId;
    await apagar('uid_um');

    const depois = (await ler('uid_um')).body.data;
    expect(depois.publicId).not.toBe(antes);
    expect(depois.nickname).toBeNull();
  });

  it('repetir responde igual, e quem nunca teve cadastro tambem', async () => {
    await definir('uid_um', { nickname: 'Cometa Azul' });

    const primeira = await apagar('uid_um');
    const segunda = await apagar('uid_um');
    expect(segunda.status).toBe(primeira.status);
    expect(segunda.body.data.removed).toBe(true);

    expect((await apagar('uid_sem_cadastro')).status).toBe(200);
  });
});

describe('POST /api/leaderboard/report', () => {
  let alvo: string;

  beforeEach(async () => {
    alvo = (await definir('uid_alvo', { nickname: 'Luz Azul' })).body.data.publicId;
    await definir('uid_denunciante', { country: 'BR' });
  });

  const denuncias = () => knex('leaderboard_reports').select('*');
  const alvoNoBanco = () => knex('leaderboard_players').where({ public_id: alvo }).first();

  it('exige login', async () => {
    expect((await denunciar(undefined, { playerId: alvo, reason: 'offensive' })).status).toBe(401);
  });

  it('registra a denuncia com o apelido do momento e o motivo', async () => {
    const ctx = await denunciar('uid_denunciante', { playerId: alvo, reason: 'impersonation' });

    expect(ctx.status).toBe(202);
    expect(ctx.body).toEqual({ success: true, data: { status: 'received' } });
    expect(await denuncias()).toEqual([
      expect.objectContaining({
        reporter_uid: 'uid_denunciante',
        reported_uid: 'uid_alvo',
        reported_nickname: 'Luz Azul',
        reported_nickname_normalized: 'luz azul',
        reason: 'impersonation',
        status: 'pending',
      }),
    ]);
  });

  it('denuncia repetida responde igual e nao duplica', async () => {
    const primeira = await denunciar('uid_denunciante', { playerId: alvo, reason: 'offensive' });
    const segunda = await denunciar('uid_denunciante', { playerId: alvo, reason: 'spam' });

    expect(segunda.status).toBe(primeira.status);
    expect(segunda.body).toEqual(primeira.body);
    expect(await denuncias()).toHaveLength(1);
  });

  it('o motivo e obrigatorio e so pode ser offensive, impersonation ou spam', async () => {
    for (const body of [
      { playerId: alvo },
      { playerId: alvo, reason: 'other' },
      { playerId: alvo, reason: '' },
      { playerId: 'a b', reason: 'spam' },
      { playerId: alvo, reason: 'spam', detalhe: 'texto livre' },
      [],
    ]) {
      expect((await denunciar('uid_denunciante', body)).status).toBe(400);
    }
    for (const reason of ['offensive', 'impersonation', 'spam']) {
      expect((await denunciar(`uid_motivo_${reason}`, { playerId: alvo, reason })).status).toBe(202);
    }
  });

  it('nao aceita denunciar a si mesmo, jogador sem apelido, oculto ou inexistente', async () => {
    const denunciante = (await definir('uid_denunciante', { country: 'BR' })).body.data.publicId;

    expect((await denunciar('uid_alvo', { playerId: alvo, reason: 'spam' })).status).toBe(400);
    expect((await denunciar('uid_alvo', { playerId: denunciante, reason: 'spam' })).status).toBe(400);
    expect((await denunciar('uid_denunciante', { playerId: 'naoexiste123456', reason: 'spam' })).status).toBe(404);

    await knex('leaderboard_players').where({ public_id: alvo }).update({ hidden_by_admin: true });
    expect((await denunciar('uid_denunciante', { playerId: alvo, reason: 'spam' })).status).toBe(404);

    expect(await denuncias()).toHaveLength(0);
  });

  it('limita a 5 denuncias por conta em 24 horas', async () => {
    for (let i = 0; i < 5; i++) {
      await knex('leaderboard_reports').insert({
        reporter_uid: 'uid_denunciante',
        reported_uid: `uid_outro_${i}`,
        reported_public_id: `pub-outro-${i}`,
        reported_nickname: 'Qualquer Nome',
        reported_nickname_normalized: 'qualquer nome',
        reason: 'spam',
        status: 'pending',
        created_at: depoisDe(-0.9).toISOString(),
      });
    }
    expect((await denunciar('uid_denunciante', { playerId: alvo, reason: 'spam' })).status).toBe(429);

    relogio = depoisDe(0.2);
    expect((await denunciar('uid_denunciante', { playerId: alvo, reason: 'spam' })).status).toBe(202);
  });

  it('cinco contas distintas ocultam o apelido; o ranking volta a mostrar o nome gerado', async () => {
    await resultadoNoRanking('uid_alvo');

    for (let i = 1; i <= 4; i++) await denunciar(`uid_pessoa_${i}`, { playerId: alvo, reason: 'offensive' });
    expect(Boolean((await alvoNoBanco()).nickname_hidden)).toBe(false);
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].name.type).toBe('nickname');

    await denunciar('uid_pessoa_5', { playerId: alvo, reason: 'offensive' });
    const ocultado = await alvoNoBanco();
    expect(Boolean(ocultado.nickname_hidden)).toBe(true);
    expect(new Date(ocultado.nickname_hidden_at).toISOString()).toBe(INICIO.toISOString());
    expect((await chamar('GET', '/api/leaderboard/all-time')).body.data.entries[0].name.type).toBe('generated');
  });

  it('um apelido novo comeca do zero', async () => {
    for (let i = 1; i <= 4; i++) await denunciar(`uid_pessoa_${i}`, { playerId: alvo, reason: 'offensive' });

    // Primeira troca depois da primeira definicao: liberada na hora.
    expect((await definir('uid_alvo', { nickname: 'Luz Rosa' })).status).toBe(200);
    await denunciar('uid_pessoa_5', { playerId: alvo, reason: 'offensive' });

    expect(Boolean((await alvoNoBanco()).nickname_hidden)).toBe(false);
    expect((await denuncias()).filter((d: any) => d.reported_nickname === 'Luz Azul')).toHaveLength(4);
  });
});

describe('POST /api/leaderboard/admin/players/:playerId/restore-nickname', () => {
  let alvo: string;

  beforeEach(async () => {
    alvo = (await definir('uid_alvo', { nickname: 'Luz Azul' })).body.data.publicId;
    for (let i = 1; i <= 5; i++) await denunciar(`uid_pessoa_${i}`, { playerId: alvo, reason: 'offensive' });
    admins.add('uid_admin');
  });

  it('so a moderacao pode restaurar', async () => {
    expect((await restaurar(undefined, alvo)).status).toBe(401);
    expect((await restaurar('uid_pessoa_1', alvo)).status).toBe(403);
    expect((await restaurar('uid_admin', 'naoexiste123456')).status).toBe(404);
    expect((await restaurar('uid_admin', 'a b')).status).toBe(400);
  });

  it('volta a mostrar o apelido e arquiva as denuncias pendentes', async () => {
    const ctx = await restaurar('uid_admin', alvo);

    expect(ctx.status).toBe(200);
    expect(ctx.body.data).toEqual({ publicId: alvo, nicknameHidden: false });

    const jogador = await knex('leaderboard_players').where({ public_id: alvo }).first();
    expect(Boolean(jogador.nickname_hidden)).toBe(false);
    expect(jogador.nickname_hidden_at).toBeNull();
    expect((await knex('leaderboard_reports')).every((d: any) => d.status === 'dismissed')).toBe(true);
  });
});
