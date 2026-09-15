/**
 * Nome gerado do ranking e cadastro automatico do jogador.
 */

import knexFactory from 'knex';
import {
  ADJETIVOS_DO_PSEUDONIMO,
  OBJETOS_DO_PSEUDONIMO,
  MENOR_NUMERO_DO_PSEUDONIMO,
  MAIOR_NUMERO_DO_PSEUDONIMO,
  sortearPseudonimo,
} from '../pseudonym';
import { garantirJogador, TABELA_DE_JOGADORES } from '../leaderboard-players';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migracao = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');

describe('chaves do nome gerado', () => {
  it('sao chaves curtas, em minusculas e sem repeticao', () => {
    for (const lista of [ADJETIVOS_DO_PSEUDONIMO, OBJETOS_DO_PSEUDONIMO]) {
      expect(lista.every((chave) => /^[a-z]{2,32}$/.test(chave))).toBe(true);
      expect(new Set(lista).size).toBe(lista.length);
    }
  });

  it('o sorteio fica dentro das listas e da faixa de numeros', () => {
    for (let i = 0; i < 300; i++) {
      const { adjetivo, objeto, numero } = sortearPseudonimo();
      expect(ADJETIVOS_DO_PSEUDONIMO).toContain(adjetivo);
      expect(OBJETOS_DO_PSEUDONIMO).toContain(objeto);
      expect(numero).toBeGreaterThanOrEqual(MENOR_NUMERO_DO_PSEUDONIMO);
      expect(numero).toBeLessThanOrEqual(MAIOR_NUMERO_DO_PSEUDONIMO);
    }
  });
});

describe('garantirJogador', () => {
  let knex: any;

  beforeEach(async () => {
    knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    await migracao.up(knex);
  });

  afterEach(async () => {
    await knex.destroy();
  });

  const fixo = { adjetivo: 'swift', objeto: 'comet', numero: 42 };
  const outro = { adjetivo: 'calm', objeto: 'nova', numero: 7 };

  it('cria o cadastro uma vez e devolve o mesmo depois', async () => {
    const primeiro = await garantirJogador(knex, 'uid_um');
    const segundo = await garantirJogador(knex, 'uid_um', { sortear: () => outro });

    expect(segundo).toEqual(primeiro);
    expect(await knex(TABELA_DE_JOGADORES)).toHaveLength(1);
  });

  it('sorteia de novo quando o nome gerado ja esta em uso', async () => {
    await garantirJogador(knex, 'uid_um', { sortear: () => fixo });

    const sorteios = [fixo, outro];
    let chamadas = 0;
    const jogador = await garantirJogador(knex, 'uid_dois', { sortear: () => sorteios[chamadas++] });

    expect(jogador.pseudonimo).toEqual(outro);
    expect(chamadas).toBe(2);
  });

  it('desiste depois de muitas tentativas sem nome livre', async () => {
    await garantirJogador(knex, 'uid_um', { sortear: () => fixo });
    await expect(garantirJogador(knex, 'uid_dois', { sortear: () => fixo })).rejects.toThrow(
      'Could not allocate a pseudonym'
    );
  });
});
