/**
 * Regras de apelido: prazo de troca, reserva do apelido deixado e ocultacao do
 * apelido novo. Contra um SQLite em memoria, com o schema das migracoes.
 */

import knexFactory from 'knex';
import {
  definirConfiguracoes,
  sortearNovoPseudonimo,
  apagarDadosDoRanking,
  apagarReservasDoJogador,
  proximaTrocaDeApelido,
  TABELA_DE_RESERVAS,
  PedidoDeConfiguracoes,
} from '../leaderboard-settings';
import { buscarJogador, atualizarJogador, TABELA_DE_JOGADORES } from '../leaderboard-players';
import { anonimizarResultadosDoJogador, TABELA_DE_RESULTADOS } from '../phase-results';
import { registrarDenuncia, TABELA_DE_DENUNCIAS } from '../leaderboard-reports';

/* eslint-disable @typescript-eslint/no-var-requires */
const migracoes = [
  '2026.09.14T00.00.00.create-leaderboard-players.js',
  '2026.09.15T00.00.00.create-phase-results.js',
  '2026.09.16T00.00.00.create-leaderboard-reports.js',
  '2026.09.17T00.00.00.leaderboard-nickname-rules.js',
].map((nome) => require(`../../../database/migrations/${nome}`));
const migracaoDasRegras = migracoes[3];
/* eslint-enable @typescript-eslint/no-var-requires */

const INICIO = new Date('2026-09-17T12:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;
const depoisDe = (dias: number) => new Date(INICIO.getTime() + dias * DIA);

let knex: any;

beforeEach(async () => {
  knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  for (const migracao of migracoes) await migracao.up(knex);
});

let sessoes = 0;
async function resultadoDeFase(uid: string, extra: Record<string, any> = {}) {
  sessoes++;
  await knex(TABELA_DE_RESULTADOS).insert({
    session_id: `quiz_config_${sessoes}`,
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
    started_at: INICIO.toISOString(),
    finished_at: INICIO.toISOString(),
    created_at: INICIO.toISOString(),
    ...extra,
  });
}

afterEach(async () => {
  await knex.destroy();
});

const definir = (uid: string, pedido: PedidoDeConfiguracoes, dias = 0) =>
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

describe('visibilidade e pais', () => {
  it('liga e desliga aparecer no ranking e mostrar o pais, sem prazo', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul', pais: 'BR' });

    const escondido = await definir('uid_um', { visivel: false, mostrarPais: false }, 0.1);
    expect(escondido.tipo).toBe('ok');
    expect((escondido as any).jogador).toEqual(
      expect.objectContaining({ visivel: false, mostrarPais: false, apelido: 'Cometa Azul', pais: 'BR' })
    );

    const devolta = await definir('uid_um', { visivel: true, mostrarPais: true }, 0.2);
    expect((devolta as any).jogador).toEqual(expect.objectContaining({ visivel: true, mostrarPais: true }));
  });

  it('mudar so a visibilidade nao conta como troca de apelido', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' });

    await definir('uid_um', { visivel: false }, 1);
    expect((await buscarJogador(knex, 'uid_um'))?.apelidoAlteradoEm).toBe(INICIO.toISOString());
  });

  it('cria o cadastro mesmo quando o pedido e so de visibilidade', async () => {
    const resultado = await definir('uid_novo', { visivel: false });
    expect((resultado as any).jogador).toEqual(expect.objectContaining({ visivel: false, apelido: null }));
  });
});

describe('sortearNovoPseudonimo', () => {
  const nome = (numero: number) => ({ adjetivo: 'swift', objeto: 'comet', numero });

  it('cria o cadastro se faltar e troca por um nome diferente', async () => {
    const jogador = await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => nome(7) });
    expect(jogador.pseudonimo).toEqual(nome(7));
    expect(await knex(TABELA_DE_JOGADORES)).toHaveLength(1);
  });

  it('nao devolve o mesmo nome: sorteia de novo', async () => {
    const antes = (await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => nome(7) })).pseudonimo;

    const sorteios = [nome(7), nome(7), nome(8)];
    let chamadas = 0;
    const depois = await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => sorteios[chamadas++] });

    expect(depois.pseudonimo).not.toEqual(antes);
    expect(chamadas).toBe(3);
  });

  it('pula o nome que ja e de outra conta', async () => {
    await sortearNovoPseudonimo(knex, 'uid_outro', { sortear: () => nome(7) });
    await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => nome(1) });

    const sorteios = [nome(7), nome(9)];
    let chamadas = 0;
    const jogador = await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => sorteios[chamadas++] });

    expect(jogador.pseudonimo).toEqual(nome(9));
    expect(chamadas).toBe(2);
  });

  it('nao mexe no apelido nem nas datas dele', async () => {
    await definir('uid_um', { apelido: 'Cometa Azul' });
    const jogador = await sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => nome(7) });

    expect(jogador).toEqual(
      expect.objectContaining({ apelido: 'Cometa Azul', apelidoDefinidoEm: INICIO.toISOString(), apelidoAlteradoEm: null })
    );
  });

  it('desiste quando nao acha nome livre', async () => {
    await sortearNovoPseudonimo(knex, 'uid_outro', { sortear: () => nome(7) });
    await expect(sortearNovoPseudonimo(knex, 'uid_um', { sortear: () => nome(7) })).rejects.toThrow(
      'Could not allocate a pseudonym'
    );
  });
});

describe('apagarDadosDoRanking', () => {
  beforeEach(async () => {
    await definir('uid_um', { apelido: 'Órion Azul' });
    await definir('uid_um', { apelido: 'Nebulosa Rosa' }); // deixa uma reserva
    await definir('uid_outro', { apelido: 'Luz Verde' });

    const eu = await buscarJogador(knex, 'uid_um');
    const outro = await buscarJogador(knex, 'uid_outro');
    await registrarDenuncia(knex, {
      denuncianteUid: 'uid_um',
      denunciadoUid: 'uid_outro',
      denunciadoIdPublico: outro!.idPublico,
      apelido: 'Luz Verde',
      motivo: 'offensive',
    });
    await registrarDenuncia(knex, {
      denuncianteUid: 'uid_outro',
      denunciadoUid: 'uid_um',
      denunciadoIdPublico: eu!.idPublico,
      apelido: 'Nebulosa Rosa',
      motivo: 'spam',
    });

    await resultadoDeFase('uid_um');
    await resultadoDeFase('uid_um', { session_id: 'quiz_config_meu_2', phase: 2 });
    await resultadoDeFase('uid_outro', { session_id: 'quiz_config_outro' });
  });

  it('apaga cadastro, reservas e denuncias, e libera o apelido', async () => {
    const resumo = await apagarDadosDoRanking(knex, 'uid_um');

    expect(resumo).toEqual(
      expect.objectContaining({ jogadorApagado: true, reservas: 1, denuncias: 2, resultadosAnonimizados: 2 })
    );
    expect(await buscarJogador(knex, 'uid_um')).toBeNull();
    expect(await knex(TABELA_DE_RESERVAS)).toHaveLength(0);
    expect(await knex(TABELA_DE_DENUNCIAS)).toHaveLength(0);

    // O apelido que ele deixou volta a ficar livre para outra conta.
    expect((await definir('uid_terceiro', { apelido: 'Órion Azul' }, 1)).tipo).toBe('ok');
  });

  it('as partidas ficam sem dono, em vez de sumir', async () => {
    await apagarDadosDoRanking(knex, 'uid_um');

    const linhas = await knex(TABELA_DE_RESULTADOS).orderBy('id');
    expect(linhas).toHaveLength(3);
    const minhas = linhas.filter((l: any) => l.session_id !== 'quiz_config_outro');
    expect(minhas.every((l: any) => l.firebase_uid === null && !l.eligible)).toBe(true);
    // A partida de outra conta continua intacta.
    const daOutra = linhas.find((l: any) => l.session_id === 'quiz_config_outro');
    expect(daOutra.firebase_uid).toBe('uid_outro');
    expect(Boolean(daOutra.eligible)).toBe(true);
  });

  it('nao toca no cadastro das outras contas', async () => {
    await apagarDadosDoRanking(knex, 'uid_um');
    expect(await buscarJogador(knex, 'uid_outro')).not.toBeNull();
  });

  it('repetir e seguro, e quem nunca teve cadastro nao quebra', async () => {
    await apagarDadosDoRanking(knex, 'uid_um');

    expect(await apagarDadosDoRanking(knex, 'uid_um')).toEqual({
      jogadorApagado: false,
      reservas: 0,
      denuncias: 0,
      resultadosAnonimizados: 0,
    });
    expect(await apagarDadosDoRanking(knex, 'uid_que_nunca_existiu')).toEqual(
      expect.objectContaining({ jogadorApagado: false })
    );
  });

  it('sem as tabelas nao falha', async () => {
    const vazio = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    await expect(apagarDadosDoRanking(vazio, 'uid_qualquer')).resolves.toEqual({
      jogadorApagado: false,
      reservas: 0,
      denuncias: 0,
      resultadosAnonimizados: 0,
    });
    await expect(anonimizarResultadosDoJogador(vazio, 'uid_qualquer')).resolves.toBe(0);
    await vazio.destroy();
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
