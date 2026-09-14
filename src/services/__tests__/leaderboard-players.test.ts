/**
 * Jogadores do ranking: a migracao e o modelo, contra um SQLite em memoria.
 */

import knexFactory from 'knex';
import {
  TABELA_DE_JOGADORES,
  criarJogador,
  buscarJogador,
  buscarJogadorPorIdPublico,
  atualizarJogador,
  apagarJogador,
  normalizarApelido,
  normalizarCodigoDePais,
  ErroDeApelidoEmUso,
  ErroDePseudonimoEmUso,
} from '../leaderboard-players';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migracao = require('../../../database/migrations/2026.09.14T00.00.00.create-leaderboard-players.js');

const AGORA = new Date(Date.UTC(2026, 8, 14, 12, 0, 0));
const DEPOIS = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

let knex: any;

const novoKnex = () =>
  knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });

beforeEach(async () => {
  knex = novoKnex();
  await migracao.up(knex);
});

afterEach(async () => {
  await knex.destroy();
});

const pseudonimo = (numero = 42) => ({ adjetivo: 'veloz', objeto: 'cometa', numero });

describe('migracao', () => {
  it('cria a tabela e pode rodar de novo sem falhar', async () => {
    expect(await knex.schema.hasTable(TABELA_DE_JOGADORES)).toBe(true);
    await expect(migracao.up(knex)).resolves.toBeUndefined();
  });

  it('roda dentro de uma transacao, como o Strapi executa', async () => {
    const outro = novoKnex();
    await outro.transaction((trx: any) => migracao.up(trx));
    expect(await outro.schema.hasTable(TABELA_DE_JOGADORES)).toBe(true);
    await outro.destroy();
  });

  it('down remove a tabela', async () => {
    await migracao.down(knex);
    expect(await knex.schema.hasTable(TABELA_DE_JOGADORES)).toBe(false);
  });
});

describe('criarJogador', () => {
  it('cria com id publico aleatorio e os valores padrao', async () => {
    const jogador = await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo() }, AGORA);

    expect(jogador.idPublico).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(jogador).toEqual(
      expect.objectContaining({
        firebaseUid: 'uid_jogador_um',
        pseudonimo: pseudonimo(),
        apelido: null,
        apelidoAlteradoEm: null,
        pais: null,
        mostrarPais: true,
        visivel: true,
        ocultoPelaModeracao: false,
        apelidoOcultoPelaModeracao: false,
        criadoEm: AGORA.toISOString(),
        atualizadoEm: AGORA.toISOString(),
      })
    );
    expect(await buscarJogadorPorIdPublico(knex, jogador.idPublico)).toEqual(jogador);
  });

  it('conta ja cadastrada devolve o cadastro existente, sem alterar', async () => {
    const primeiro = await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo(1) });
    const segundo = await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo(2), pais: 'fr' });

    expect(segundo).toEqual(primeiro);
    expect(await knex(TABELA_DE_JOGADORES)).toHaveLength(1);
  });

  it('guarda o pais em maiusculas', async () => {
    const jogador = await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo(), pais: 'br' });
    expect(jogador.pais).toBe('BR');
  });

  it('nome gerado repetido e recusado com erro proprio', async () => {
    await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo(7) });
    await expect(
      criarJogador(knex, { firebaseUid: 'uid_jogador_dois', pseudonimo: pseudonimo(7) })
    ).rejects.toBeInstanceOf(ErroDePseudonimoEmUso);
  });

  it('recusa nome gerado malformado', async () => {
    for (const p of [
      { adjetivo: '', objeto: 'cometa', numero: 1 },
      { adjetivo: 'veloz', objeto: 'cometa', numero: 1.5 },
      { adjetivo: 'veloz', objeto: 'cometa', numero: 40000 },
      { adjetivo: 'v'.repeat(33), objeto: 'cometa', numero: 1 },
    ]) {
      await expect(criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: p as any })).rejects.toThrow(
        'Invalid pseudonym'
      );
    }
  });
});

describe('atualizarJogador', () => {
  beforeEach(async () => {
    await criarJogador(knex, { firebaseUid: 'uid_jogador_um', pseudonimo: pseudonimo(1) }, AGORA);
    await criarJogador(knex, { firebaseUid: 'uid_jogador_dois', pseudonimo: pseudonimo(2) }, AGORA);
  });

  it('guarda o apelido limpo e a data da troca', async () => {
    const jogador = await atualizarJogador(knex, 'uid_jogador_um', { apelido: '  Cometa   Azul ' }, DEPOIS);
    expect(jogador).toEqual(
      expect.objectContaining({ apelido: 'Cometa Azul', apelidoAlteradoEm: DEPOIS.toISOString() })
    );
  });

  it('repetir o mesmo apelido nao muda a data da troca', async () => {
    await atualizarJogador(knex, 'uid_jogador_um', { apelido: 'Cometa Azul' }, AGORA);
    const jogador = await atualizarJogador(knex, 'uid_jogador_um', { apelido: 'Cometa Azul' }, DEPOIS);
    expect(jogador?.apelidoAlteradoEm).toBe(AGORA.toISOString());
  });

  it('apelido igual ao de outro jogador, escrito de outro jeito, e recusado', async () => {
    await atualizarJogador(knex, 'uid_jogador_um', { apelido: 'Órion Azul' });
    for (const variacao of ['orion azul', 'ORION  AZUL', ' Órion Azul ']) {
      await expect(
        atualizarJogador(knex, 'uid_jogador_dois', { apelido: variacao })
      ).rejects.toBeInstanceOf(ErroDeApelidoEmUso);
    }
  });

  it('remover o apelido volta ao nome gerado e libera o nome', async () => {
    await atualizarJogador(knex, 'uid_jogador_um', { apelido: 'Cometa Azul' });
    const semApelido = await atualizarJogador(knex, 'uid_jogador_um', { apelido: '   ' });
    expect(semApelido?.apelido).toBeNull();

    const outro = await atualizarJogador(knex, 'uid_jogador_dois', { apelido: 'cometa azul' });
    expect(outro?.apelido).toBe('cometa azul');
  });

  it('altera pais e visibilidade', async () => {
    const jogador = await atualizarJogador(
      knex,
      'uid_jogador_um',
      { pais: 'pt', mostrarPais: false, visivel: false },
      DEPOIS
    );
    expect(jogador).toEqual(
      expect.objectContaining({ pais: 'PT', mostrarPais: false, visivel: false, atualizadoEm: DEPOIS.toISOString() })
    );

    const semPais = await atualizarJogador(knex, 'uid_jogador_um', { pais: null });
    expect(semPais?.pais).toBeNull();
  });

  it('troca o nome gerado, sem repetir o de outro jogador', async () => {
    const jogador = await atualizarJogador(knex, 'uid_jogador_um', { pseudonimo: pseudonimo(99) });
    expect(jogador?.pseudonimo.numero).toBe(99);
    await expect(
      atualizarJogador(knex, 'uid_jogador_dois', { pseudonimo: pseudonimo(99) })
    ).rejects.toBeInstanceOf(ErroDePseudonimoEmUso);
  });

  it('recusa valores de tipo errado e apelido maior que a coluna', async () => {
    await expect(atualizarJogador(knex, 'uid_jogador_um', { visivel: 'sim' as any })).rejects.toThrow();
    await expect(atualizarJogador(knex, 'uid_jogador_um', { mostrarPais: 1 as any })).rejects.toThrow();
    await expect(atualizarJogador(knex, 'uid_jogador_um', { pais: 'BRA' })).rejects.toThrow();
    await expect(atualizarJogador(knex, 'uid_jogador_um', { apelido: 42 as any })).rejects.toThrow();
    await expect(atualizarJogador(knex, 'uid_jogador_um', { apelido: 'a'.repeat(33) })).rejects.toThrow(
      'Nickname too long'
    );
  });

  it('sem alteracoes devolve o jogador como esta', async () => {
    const antes = await buscarJogador(knex, 'uid_jogador_um');
    expect(await atualizarJogador(knex, 'uid_jogador_um', {}, DEPOIS)).toEqual(antes);
  });

  it('conta nao cadastrada devolve null', async () => {
    expect(await atualizarJogador(knex, 'uid_sem_cadastro', { visivel: false })).toBeNull();
  });
});

describe('apagarJogador', () => {
  it('remove so a conta indicada', async () => {
    await criarJogador(knex, { firebaseUid: 'uid_que_sai', pseudonimo: pseudonimo(1) });
    await criarJogador(knex, { firebaseUid: 'uid_que_fica', pseudonimo: pseudonimo(2) });

    expect(await apagarJogador(knex, 'uid_que_sai')).toBe(1);
    expect(await buscarJogador(knex, 'uid_que_sai')).toBeNull();
    expect(await buscarJogador(knex, 'uid_que_fica')).not.toBeNull();
  });

  it('sem a tabela nao falha', async () => {
    await migracao.down(knex);
    await expect(apagarJogador(knex, 'uid_qualquer')).resolves.toBe(0);
  });
});

describe('normalizacao', () => {
  it('ignora acentos, maiusculas e espacos repetidos', () => {
    expect(normalizarApelido('  Órion   AZUL ')).toBe('orion azul');
    expect(normalizarApelido('İstanbul')).toBe('istanbul');
    expect(normalizarApelido('Ça Va')).toBe('ca va');
  });

  it('nao alonga o apelido', () => {
    for (const apelido of ['한국어', 'ﬁnal', 'Ǆ']) {
      expect([...normalizarApelido(apelido)].length).toBeLessThanOrEqual([...apelido].length);
    }
  });

  it('codigo de pais: duas letras, em maiusculas, ou nulo', () => {
    expect(normalizarCodigoDePais('br')).toBe('BR');
    expect(normalizarCodigoDePais('')).toBeNull();
    expect(normalizarCodigoDePais(null)).toBeNull();
    for (const invalido of ['B', 'BRA', '12', 42]) {
      expect(() => normalizarCodigoDePais(invalido)).toThrow('Invalid country code');
    }
  });
});
