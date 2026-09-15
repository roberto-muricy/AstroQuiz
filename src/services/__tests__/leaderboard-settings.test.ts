/**
 * Regras de apelido: prazo de troca, reserva do apelido deixado e ocultacao do
 * apelido novo. Contra um SQLite em memoria, com o schema das migracoes.
 */

import knexFactory from 'knex';
import {
  definirConfiguracoes,
  apagarReservasDoJogador,
  proximaTrocaDeApelido,
  TABELA_DE_RESERVAS,
} from '../leaderboard-settings';
import { buscarJogador, atualizarJogador, TABELA_DE_JOGADORES } from '../leaderboard-players';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracaoDeJogadores = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');
const migracaoDasRegras = require('../../../database/migrations/2026.09.17T00.00.00.leaderboard-nickname-rules.js');
/* eslint-enable @typescript-eslint/no-var-requires */

const INICIO = new Date('2026-09-17T12:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;
const depoisDe = (dias: number) => new Date(INICIO.getTime() + dias * DIA);

let knex: any;

beforeEach(async () => {
  knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  await migracaoDeJogadores.up(knex);
  await migracaoDasRegras.up(knex);
});

afterEach(async () => {
  await knex.destroy();
});

const definir = (uid: string, pedido: { apelido?: string | null; pais?: string | null }, dias = 0) =>
  definirConfiguracoes(knex, uid, pedido, depoisDe(dias));

const apelidoDe = async (uid: string) => (await buscarJogador(knex, uid))?.apelido ?? null;

describe('migracao das regras de apelido', () => {
  it('adiciona as datas do apelido e a tabela de reservas, e pode rodar de novo', async () => {
    expect(await knex.schema.hasColumn(TABELA_DE_JOGADORES, 'nickname_first_set_at')).toBe(true);
    expect(await knex.schema.hasColumn(TABELA_DE_JOGADORES, 'nickname_hidden_at')).toBe(true);
    expect(await knex.schema.hasTable(TABELA_DE_RESERVAS)).toBe(true);

    await expect(migracaoDasRegras.up(knex)).resolves.toBeUndefined();

    await migracaoDasRegras.down(knex);
    expect(await knex.schema.hasTable(TABELA_DE_RESERVAS)).toBe(false);
    expect(await knex.schema.hasColumn(TABELA_DE_JOGADORES, 'nickname_hidden_at')).toBe(false);
  });
});

describe('prazo de troca de apelido', () => {
  it('a primeira definicao e livre e nao inicia o prazo', async () => {
    const resultado = await definir('uid_um', { apelido: 'Cometa Azul' });

    expect(resultado.tipo).toBe('ok');
    const jogador = (resultado as any).jogador;
    expect(jogador).toEqual(
      expect.objectContaining({ apelido: 'Cometa Azul', apelidoDefinidoEm: INICIO.toISOString(), apelidoAlteradoEm: null })
    );
    expect(proximaTrocaDeApelido(jogador, INICIO)).toBeNull();
  });

  it('cada troca exige 7 dias desde a troca anterior', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    expect((await definir('uid_um', { apelido: 'Nebulosa Rosa' })).tipo).toBe('ok');

    expect(await definir('uid_um', { apelido: 'Luz Verde' }, 6.9)).toEqual({ tipo: 'cedo', liberaEm: depoisDe(7) });
    expect(await apelidoDe('uid_um')).toBe('Nebulosa Rosa');

    expect((await definir('uid_um', { apelido: 'Luz Verde' }, 7)).tipo).toBe('ok');
    expect(await apelidoDe('uid_um')).toBe('Luz Verde');
  });

  it('remover e sempre permitido e nao inicia prazo; definir depois conta como troca', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });

    expect((await definir('uid_um', { apelido: null }, 1)).tipo).toBe('ok');
    expect((await buscarJogador(knex, 'uid_um'))?.apelidoAlteradoEm).toBe(INICIO.toISOString());

    expect(await definir('uid_um', { apelido: 'Luz Verde' }, 2)).toEqual({ tipo: 'cedo', liberaEm: depoisDe(7) });
  });

  it('quem definiu e removeu pode definir outro na hora, e isso ja conta como troca', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await definir('uid_um', { apelido: null });

    const resultado = await definir('uid_um', { apelido: 'Luz Verde' });
    expect(resultado.tipo).toBe('ok');
    expect((resultado as any).jogador.apelidoAlteradoEm).toBe(INICIO.toISOString());

    expect((await definir('uid_um', { apelido: 'Estrela Guia' }, 1)).tipo).toBe('cedo');
  });

  it('repetir o mesmo apelido ou mudar so o pais nao e troca', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });

    const resultado = await definir('uid_um', { apelido: 'Nebulosa Rosa', pais: 'PT' }, 1);
    expect(resultado.tipo).toBe('ok');
    expect((resultado as any).jogador).toEqual(
      expect.objectContaining({ pais: 'PT', apelidoAlteradoEm: INICIO.toISOString() })
    );
  });
});

describe('reserva do apelido deixado', () => {
  it('uma troca reserva o apelido anterior por 30 dias contra outras contas', async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });

    expect(await definir('uid_dois', { apelido: 'Órion Azul' }, 29.9)).toEqual({ tipo: 'em-uso' });
    expect(await apelidoDe('uid_dois')).toBeNull();

    expect((await definir('uid_dois', { apelido: 'Órion Azul' }, 30)).tipo).toBe('ok');
  });

  it('remover tambem reserva, e a reserva vale para variacoes de maiusculas e acentos', async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: null }, 1);

    expect(await definir('uid_dois', { apelido: 'ORION azul' }, 2)).toEqual({ tipo: 'em-uso' });
  });

  it('o dono retoma o apelido sem esperar a reserva, e a reserva deixa de existir', async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: null });

    expect((await definir('uid_um', { apelido: 'Órion Azul' }, 1)).tipo).toBe('ok');
    expect(await knex(TABELA_DE_RESERVAS)).toHaveLength(0);
  });

  it('retomar o proprio apelido e uma troca, e respeita o prazo de 7 dias', async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });

    expect(await definir('uid_um', { apelido: 'Órion Azul' }, 1)).toEqual({ tipo: 'cedo', liberaEm: depoisDe(7) });
    expect((await definir('uid_um', { apelido: 'Órion Azul' }, 7)).tipo).toBe('ok');
  });

  it('varias trocas no periodo mantem todas as reservas', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });
    await definir('uid_um', { apelido: 'Luz Verde' }, 7);

    expect(await definir('uid_dois', { apelido: 'Cometa Azul' }, 8)).toEqual({ tipo: 'em-uso' });
    expect(await definir('uid_dois', { apelido: 'Nebulosa Rosa' }, 8)).toEqual({ tipo: 'em-uso' });
  });

  it('mudar so maiusculas do proprio apelido nao cria reserva', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    expect((await definir('uid_um', { apelido: 'cometa azul' })).tipo).toBe('ok');
    expect(await knex(TABELA_DE_RESERVAS)).toHaveLength(0);
  });

  it('apagar a conta libera as reservas', async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: null });

    expect(await apagarReservasDoJogador(knex, 'uid_um')).toBe(1);
    expect((await definir('uid_dois', { apelido: 'Órion Azul' }, 1)).tipo).toBe('ok');
  });
});

describe('ocultacao do apelido', () => {
  it('um apelido novo comeca sem ocultacao; mudar so maiusculas mantem', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await atualizarJogador(knex, 'uid_um', { apelidoOculto: true, apelidoOcultoEm: INICIO });

    const soMaiusculas = await definir('uid_um', { apelido: 'cometa azul' });
    expect((soMaiusculas as any).jogador.apelidoOcultoPelaModeracao).toBe(true);

    const novo = await definir('uid_um', { apelido: 'Luz Verde' }, 7);
    expect((novo as any).jogador).toEqual(
      expect.objectContaining({ apelidoOcultoPelaModeracao: false, apelidoOcultoEm: null })
    );
  });
});
