/**
 * O selo da Home dizia "10 dias seguidos" para quem tinha ficado dias sem
 * abrir o app. Não era erro de conta: o selo mostrava o recorde de ACERTOS
 * seguidos, que por ser recorde nunca cai. O app nunca tinha contado dias.
 *
 * O caso relatado está em "quem some por dias perde o selo". Os outros cobrem
 * as bordas que costumam quebrar uma contagem de dias: virada de mês e de ano,
 * ano bissexto, horário de verão e o fuso do aparelho.
 */

import {
  avancarSequencia,
  diaLocal,
  diasEntre,
  diasVisiveis,
  SEQUENCIA_VAZIA,
} from '../sequenciaDiaria';

/** Um instante local; meio-dia por padrão, longe da meia-noite de propósito. */
const em = (ano: number, mes: number, dia: number, hora = 12, minuto = 0) =>
  new Date(ano, mes - 1, dia, hora, minuto);

/** Termina uma fase em cada um dos instantes, na ordem. */
const jogarNos = (...instantes: Date[]) =>
  instantes.reduce((s, d) => avancarSequencia(s, d), SEQUENCIA_VAZIA);

describe('sequência de dias jogados', () => {
  it('a primeira fase terminada abre a sequência com 1 dia', () => {
    expect(avancarSequencia(SEQUENCIA_VAZIA, em(2026, 9, 10))).toEqual({
      dias: 1,
      ultimoDia: '2026-09-10',
    });
  });

  it('terminar várias fases no mesmo dia conta uma vez só', () => {
    const s = jogarNos(em(2026, 9, 10, 9), em(2026, 9, 10, 14), em(2026, 9, 10, 22));
    expect(s.dias).toBe(1);
  });

  it('dias corridos somam', () => {
    const s = jogarNos(em(2026, 9, 10), em(2026, 9, 11), em(2026, 9, 12));
    expect(s).toEqual({ dias: 3, ultimoDia: '2026-09-12' });
  });

  it('pular um dia recomeça do 1', () => {
    const s = jogarNos(em(2026, 9, 10), em(2026, 9, 11), em(2026, 9, 13));
    expect(s).toEqual({ dias: 1, ultimoDia: '2026-09-13' });
  });

  it('virada de mês, de ano e ano bissexto contam como dias seguidos', () => {
    expect(jogarNos(em(2026, 9, 30), em(2026, 10, 1)).dias).toBe(2);
    expect(jogarNos(em(2026, 12, 31), em(2027, 1, 1)).dias).toBe(2);
    expect(jogarNos(em(2028, 2, 28), em(2028, 2, 29), em(2028, 3, 1)).dias).toBe(3);
  });
});

describe('o que o selo mostra', () => {
  // Dez dias seguidos, de 1 a 10 de setembro.
  const dezDias = jogarNos(...Array.from({ length: 10 }, (_, i) => em(2026, 9, 1 + i)));

  it('mostra a sequência no dia em que ela foi estendida', () => {
    expect(diasVisiveis(dezDias, em(2026, 9, 10, 20))).toBe(10);
  });

  it('ainda mostra no dia seguinte — jogar hoje estende', () => {
    expect(diasVisiveis(dezDias, em(2026, 9, 11, 8))).toBe(10);
  });

  it('quem some por dias perde o selo', () => {
    // O caso relatado: dez dias seguidos, depois cinco sem abrir o app.
    expect(diasVisiveis(dezDias, em(2026, 9, 15))).toBe(0);
  });

  it('e ao voltar recomeça do 1, não do 11', () => {
    const volta = avancarSequencia(dezDias, em(2026, 9, 15));
    expect(diasVisiveis(volta, em(2026, 9, 15))).toBe(1);
  });

  it('sem nenhuma fase terminada não mostra nada', () => {
    expect(diasVisiveis(SEQUENCIA_VAZIA, em(2026, 9, 10))).toBe(0);
    expect(diasVisiveis(undefined, em(2026, 9, 10))).toBe(0);
  });
});

describe('bordas', () => {
  it('o dia é o do fuso do aparelho, não o UTC', () => {
    // 23h30 no Brasil já é o dia seguinte em UTC. Só pega a regressão para
    // toISOString() quando o teste roda fora de UTC — como o aparelho real.
    expect(diaLocal(em(2026, 9, 10, 23, 30))).toBe('2026-09-10');
    expect(diaLocal(em(2026, 9, 11, 0, 5))).toBe('2026-09-11');
  });

  it('a diferença entre dias não depende de horário de verão', () => {
    expect(diasEntre('2026-03-07', '2026-03-08')).toBe(1);
    expect(diasEntre('2026-10-31', '2026-11-01')).toBe(1);
    expect(diasEntre('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('relógio atrasado não zera nem infla a sequência', () => {
    const tres = jogarNos(em(2026, 9, 10), em(2026, 9, 11), em(2026, 9, 12));
    const atrasado = em(2026, 9, 9);
    expect(avancarSequencia(tres, atrasado)).toEqual(tres);
    expect(diasVisiveis(tres, atrasado)).toBe(3);
  });

  it('dado salvo corrompido é tratado como sequência vazia', () => {
    const lixo: any = { dias: 'x', ultimoDia: 42 };
    expect(avancarSequencia(lixo, em(2026, 9, 10))).toEqual({ dias: 1, ultimoDia: '2026-09-10' });
    expect(diasVisiveis(lixo, em(2026, 9, 10))).toBe(0);
  });
});
