/**
 * Regressao: a lista de perguntas ja vistas precisa ser respeitada na selecao.
 *
 * O bug, medido contra producao: `excludeQuestions` chegava ao servidor, era
 * repassado a `strapi.service('api::quiz-engine.selector')` — que NUNCA resolve,
 * porque a api quiz-engine nao tem content-types e o Strapi 5 nao a registra — e
 * o codigo caia no caminho de reserva, que montava a fase sem olhar a lista.
 *
 * A prova: excluindo as 237 perguntas de nivel 1-2 em pt, a fase 1 devolvia 10
 * perguntas, TODAS da lista excluida. Um jogador via as mesmas perguntas da fase
 * 1 reaparecerem na fase 2.
 *
 * A correcao trata a lista como PREFERENCIA e nao como filtro, porque o cliente
 * guarda ate 300 IDs e o nivel 1 tem 96 perguntas: um filtro absoluto deixaria
 * quem jogou muito com fases incompletas.
 */

import { preferirIneditas } from '../quiz-logic';

const perguntas = (ids: number[]) => ids.map((id) => ({ id }));
const idsDe = (qs: { id: number }[]) => qs.map((q) => q.id);

describe('preferirIneditas', () => {
  it('nao devolve pergunta ja vista enquanto houver inedita', () => {
    const nivel = perguntas([1, 2, 3, 4, 5, 6, 7, 8]);
    const vistas = new Set([1, 2, 3]);

    // A fase pega as 4 primeiras da fila: nenhuma pode ser das vistas, porque
    // sobram 5 ineditas — mais que suficiente.
    const primeiras4 = idsDe(preferirIneditas(nivel, vistas)).slice(0, 4);

    expect(primeiras4).toHaveLength(4);
    primeiras4.forEach((id) => expect(vistas.has(id)).toBe(false));
  });

  it('completa com as ja vistas quando as ineditas acabam', () => {
    const nivel = perguntas([1, 2, 3, 4, 5]);
    const vistas = new Set([1, 2, 3, 4]); // so a 5 e inedita

    const fila = idsDe(preferirIneditas(nivel, vistas));

    // Nenhuma pergunta some: a fase continua com 5 candidatas disponiveis.
    expect(fila).toHaveLength(5);
    expect(new Set(fila)).toEqual(new Set([1, 2, 3, 4, 5]));
    // E a unica inedita vem primeiro.
    expect(fila[0]).toBe(5);
  });

  it('nao perde ninguem quando TODAS ja foram vistas', () => {
    // O caso de quem jogou 30 fases: a lista de 300 IDs cobre o nivel inteiro.
    // Um filtro absoluto devolveria zero candidatas e a fase nasceria quebrada.
    const nivel = perguntas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const vistas = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const fila = idsDe(preferirIneditas(nivel, vistas));

    expect(fila).toHaveLength(10);
    expect(new Set(fila)).toEqual(vistas);
  });

  it('sem lista de vistas, devolve o nivel inteiro', () => {
    const nivel = perguntas([1, 2, 3, 4, 5]);

    expect(idsDe(preferirIneditas(nivel, new Set())).sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5]);
  });

  it('embaralha dentro de cada grupo, sem vazar a ordem original', () => {
    const nivel = perguntas(Array.from({ length: 40 }, (_, i) => i + 1));
    const vistas = new Set<number>();

    // Em 40 elementos, a chance de duas embaralhadas saírem iguais é
    // desprezível. Se a funcao parar de embaralhar, isto falha.
    const a = idsDe(preferirIneditas(nivel, vistas));
    const b = idsDe(preferirIneditas(nivel, vistas));

    expect(a).not.toEqual(b);
  });
});
