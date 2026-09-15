/**
 * Denuncias de apelido: registro, limites e ocultacao automatica, contra um
 * SQLite em memoria com o schema das migracoes.
 */

import knexFactory from 'knex';
import {
  TABELA_DE_DENUNCIAS,
  LIMITE_DIARIO_DE_DENUNCIAS,
  DENUNCIAS_PARA_OCULTAR,
  registrarDenuncia,
  contarDenunciasDesde,
  apagarDenunciasDoJogador,
  reverterOcultacaoDoApelido,
  NovaDenuncia,
} from '../leaderboard-reports';
import { criarJogador, atualizarJogador, buscarJogador } from '../leaderboard-players';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracaoDeJogadores = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');
const migracaoDeDenuncias = require('../../../database/migrations/2026.09.16T00.00.00.create-leaderboard-reports.js');
const migracaoDasRegras = require('../../../database/migrations/2026.09.17T00.00.00.leaderboard-nickname-rules.js');
/* eslint-enable @typescript-eslint/no-var-requires */

const AGORA = new Date('2026-09-17T12:00:00.000Z');

let knex: any;
let alvo: string;

const novoKnex = () =>
  knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });

beforeEach(async () => {
  knex = novoKnex();
  await migracaoDeJogadores.up(knex);
  await migracaoDeDenuncias.up(knex);
  await migracaoDasRegras.up(knex);

  const jogador = await criarJogador(knex, {
    firebaseUid: 'uid_alvo',
    pseudonimo: { adjetivo: 'swift', objeto: 'comet', numero: 42 },
  });
  await atualizarJogador(knex, 'uid_alvo', { apelido: 'Luz Azul' });
  alvo = jogador.idPublico;
});

afterEach(async () => {
  await knex.destroy();
});

const denuncia = (extra: Partial<NovaDenuncia> = {}): NovaDenuncia => ({
  denuncianteUid: 'uid_denunciante',
  denunciadoUid: 'uid_alvo',
  denunciadoIdPublico: alvo,
  apelido: 'Luz Azul',
  motivo: 'offensive',
  ...extra,
});

const denunciarPor = (quantidade: number, extra: Partial<NovaDenuncia> = {}, primeiro = 1) =>
  Promise.all(
    Array.from({ length: quantidade }, (_, i) =>
      registrarDenuncia(knex, denuncia({ denuncianteUid: `uid_pessoa_${primeiro + i}`, ...extra }), AGORA)
    )
  );

describe('migracao', () => {
  it('cria a tabela, pode rodar de novo e down remove', async () => {
    expect(await knex.schema.hasTable(TABELA_DE_DENUNCIAS)).toBe(true);
    await expect(migracaoDeDenuncias.up(knex)).resolves.toBeUndefined();
    await migracaoDeDenuncias.down(knex);
    expect(await knex.schema.hasTable(TABELA_DE_DENUNCIAS)).toBe(false);
  });

  it('o motivo e obrigatorio e so aceita offensive, impersonation ou spam', async () => {
    const linha = {
      reporter_uid: 'uid_x',
      reported_uid: 'uid_alvo',
      reported_public_id: 'pub-x',
      reported_nickname: 'Luz Azul',
      reported_nickname_normalized: 'luz azul',
      status: 'pending',
      created_at: AGORA.toISOString(),
    };
    await expect(knex(TABELA_DE_DENUNCIAS).insert({ ...linha, reason: 'other' })).rejects.toThrow();
    await expect(knex(TABELA_DE_DENUNCIAS).insert(linha)).rejects.toThrow();
    for (const [i, reason] of ['offensive', 'impersonation', 'spam'].entries()) {
      await knex(TABELA_DE_DENUNCIAS).insert({ ...linha, reporter_uid: `uid_motivo_${i}`, reason });
    }
    expect(await knex(TABELA_DE_DENUNCIAS)).toHaveLength(3);
  });
});

describe('registrarDenuncia', () => {
  it('guarda o apelido do momento, a forma normalizada, o motivo e o status pendente', async () => {
    expect(await registrarDenuncia(knex, denuncia({ apelido: 'Luz Azul' }), AGORA)).toEqual({
      nova: true,
      apelidoOcultado: false,
    });

    expect(await knex(TABELA_DE_DENUNCIAS)).toEqual([
      expect.objectContaining({
        reporter_uid: 'uid_denunciante',
        reported_uid: 'uid_alvo',
        reported_public_id: alvo,
        reported_nickname: 'Luz Azul',
        reported_nickname_normalized: 'luz azul',
        reason: 'offensive',
        status: 'pending',
        created_at: AGORA.toISOString(),
      }),
    ]);
  });

  it('uma denuncia por pessoa para cada apelido; variacao de maiusculas e o mesmo apelido', async () => {
    expect((await registrarDenuncia(knex, denuncia())).nova).toBe(true);
    expect((await registrarDenuncia(knex, denuncia({ apelido: 'LUZ azul', motivo: 'spam' }))).nova).toBe(false);
    expect((await registrarDenuncia(knex, denuncia({ apelido: 'Luz Rosa' }))).nova).toBe(true);
    expect((await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_outra_pessoa' }))).nova).toBe(true);

    expect(await knex(TABELA_DE_DENUNCIAS)).toHaveLength(3);
  });
});

describe('limite diario', () => {
  it('e de 5 denuncias por conta, contadas nas ultimas 24 horas', async () => {
    expect(LIMITE_DIARIO_DE_DENUNCIAS).toBe(5);

    await registrarDenuncia(knex, denuncia({ denunciadoIdPublico: 'pub-a' }), new Date('2026-09-16T11:00:00.000Z'));
    await registrarDenuncia(knex, denuncia({ denunciadoIdPublico: 'pub-b' }), new Date('2026-09-17T10:00:00.000Z'));
    await registrarDenuncia(knex, denuncia({ denunciadoIdPublico: 'pub-c' }), new Date('2026-09-17T11:00:00.000Z'));
    await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_outra_pessoa' }), AGORA);

    expect(await contarDenunciasDesde(knex, 'uid_denunciante', new Date('2026-09-16T12:00:00.000Z'))).toBe(2);
  });
});

describe('ocultacao automatica', () => {
  it('oculta o apelido na quinta denuncia pendente de contas distintas, com a data', async () => {
    expect(DENUNCIAS_PARA_OCULTAR).toBe(5);

    const quatro = await denunciarPor(4);
    expect(quatro.some((r) => r.apelidoOcultado)).toBe(false);
    expect((await buscarJogador(knex, 'uid_alvo'))?.apelidoOcultoPelaModeracao).toBe(false);

    const quinta = await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_pessoa_5' }), AGORA);
    expect(quinta).toEqual({ nova: true, apelidoOcultado: true });
    expect(await buscarJogador(knex, 'uid_alvo')).toEqual(
      expect.objectContaining({ apelidoOcultoPelaModeracao: true, apelidoOcultoEm: AGORA.toISOString() })
    );
  });

  it('a mesma pessoa repetindo a denuncia nao soma', async () => {
    for (let i = 0; i < 6; i++) await registrarDenuncia(knex, denuncia({ motivo: 'spam' }), AGORA);
    expect((await buscarJogador(knex, 'uid_alvo'))?.apelidoOcultoPelaModeracao).toBe(false);
  });

  it('denuncias do apelido anterior nao contam para o novo', async () => {
    await denunciarPor(4);
    await atualizarJogador(knex, 'uid_alvo', { apelido: 'Luz Rosa' });

    const noNovo = await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_pessoa_5', apelido: 'Luz Rosa' }), AGORA);
    expect(noNovo.apelidoOcultado).toBe(false);

    // A quinta no apelido antigo completa as dele, mas ele ja nao esta em uso.
    const noAntigo = await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_pessoa_5' }), AGORA);
    expect(noAntigo.apelidoOcultado).toBe(false);
    expect((await buscarJogador(knex, 'uid_alvo'))?.apelidoOcultoPelaModeracao).toBe(false);

    const antigas = await knex(TABELA_DE_DENUNCIAS).where({ reported_nickname_normalized: 'luz azul' });
    expect(antigas).toHaveLength(5);
  });

  it('a moderacao desfaz a ocultacao e as denuncias pendentes daquele apelido deixam de contar', async () => {
    await denunciarPor(5);
    expect((await buscarJogador(knex, 'uid_alvo'))?.apelidoOcultoPelaModeracao).toBe(true);

    const restaurado = await reverterOcultacaoDoApelido(knex, alvo, AGORA);
    expect(restaurado).toEqual(
      expect.objectContaining({ apelidoOcultoPelaModeracao: false, apelidoOcultoEm: null })
    );
    expect((await knex(TABELA_DE_DENUNCIAS)).every((d: any) => d.status === 'dismissed')).toBe(true);

    const depois = await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_pessoa_6' }), AGORA);
    expect(depois.apelidoOcultado).toBe(false);

    expect(await reverterOcultacaoDoApelido(knex, 'naoexiste', AGORA)).toBeNull();
  });
});

describe('apagarDenunciasDoJogador', () => {
  it('apaga as denuncias feitas pela conta e as feitas sobre ela', async () => {
    await registrarDenuncia(knex, denuncia());
    await registrarDenuncia(
      knex,
      denuncia({ denuncianteUid: 'uid_terceiro', denunciadoUid: 'uid_denunciante', denunciadoIdPublico: 'pub-d' })
    );
    await registrarDenuncia(knex, denuncia({ denuncianteUid: 'uid_terceiro', denunciadoUid: 'uid_quarto', denunciadoIdPublico: 'pub-e' }));

    expect(await apagarDenunciasDoJogador(knex, 'uid_denunciante')).toBe(2);
    expect((await knex(TABELA_DE_DENUNCIAS)).map((l: any) => l.reported_public_id)).toEqual(['pub-e']);
  });

  it('sem a tabela nao falha', async () => {
    const vazio = novoKnex();
    await expect(apagarDenunciasDoJogador(vazio, 'uid_qualquer')).resolves.toBe(0);
    await vazio.destroy();
  });
});
