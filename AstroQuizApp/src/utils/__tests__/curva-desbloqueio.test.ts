/**
 * Regressao: a regua do app e a do servidor precisam dizer a mesma coisa.
 *
 * O bug: o servidor sempre aprovou com SCORING.passThreshold = 60 nas 50 fases,
 * e devolvia `passed: true` e `nextPhaseUnlocked: true`. Mas quem decidia o
 * desbloqueio era o app, com uma escada propria — 0 / 50 / 60 / 70 / 80%, mais
 * "10 de 10 na fase anterior" a partir da 46.
 *
 * Da fase 36 em diante o jogador podia terminar com 6 de 10, ver "aprovado" na
 * tela, e encontrar a proxima fase trancada. Duas fontes de verdade para a
 * mesma pergunta, e o campo do servidor era decorativo.
 *
 * A curva ficou plana em 60 por decisao de produto: a dificuldade ja sobe pelas
 * perguntas (nivel medio 1,0 na fase 1 contra 4,5 na 50).
 *
 * Este teste falha se alguem reintroduzir a escada sem mexer no servidor.
 */

import {
  getUnlockRequirement,
  isPhaseUnlocked,
  MIN_ACERTO_PARA_PASSAR,
} from '../progressionSystem';

/** O mesmo valor de SCORING.passThreshold em src/services/quiz-logic.ts. */
const PASS_THRESHOLD_DO_SERVIDOR = 60;

const TODAS_AS_FASES = Array.from({ length: 50 }, (_, i) => i + 1);

describe('curva de desbloqueio', () => {
  it('o app usa o mesmo limiar do servidor', () => {
    expect(MIN_ACERTO_PARA_PASSAR).toBe(PASS_THRESHOLD_DO_SERVIDOR);
  });

  it('a exigencia e a mesma nas 50 fases', () => {
    const distintas = new Set(TODAS_AS_FASES.map((f) => getUnlockRequirement(f).requiredAccuracy));
    expect([...distintas]).toEqual([PASS_THRESHOLD_DO_SERVIDOR]);
  });

  it('nenhuma fase exige mais do que o servidor aprova', () => {
    // Aprovado pelo servidor com o minimo: 6 de 10. Nenhuma fase pode barrar.
    const aprovadoNoLimite = { accuracy: PASS_THRESHOLD_DO_SERVIDOR, correctAnswers: 6 };
    const barradas = TODAS_AS_FASES.filter((f) => !isPhaseUnlocked(f, aprovadoNoLimite));
    expect(barradas).toEqual([]);
  });

  it('quem nao passa continua barrado', () => {
    const reprovado = { accuracy: 50, correctAnswers: 5 };
    // As dez primeiras sao livres por desenho; da 11 em diante, reprovar tranca.
    const abertas = TODAS_AS_FASES.filter((f) => f > 10 && isPhaseUnlocked(f, reprovado));
    expect(abertas).toEqual([]);
  });

  it('nao ha mais exigencia de fase perfeita', () => {
    // A regra antiga pedia 10 de 10 na fase anterior para destravar a 46: uma
    // unica falha em dez perguntas de nivel 4-5 travava a progressao.
    const quaseP = { accuracy: 90, correctAnswers: 9 };
    expect(isPhaseUnlocked(46, quaseP)).toBe(true);
    expect(isPhaseUnlocked(50, quaseP)).toBe(true);
  });

  it('nao sobrou requisito especial em nenhuma fase', () => {
    const comEspecial = TODAS_AS_FASES.filter((f) => getUnlockRequirement(f).specialRequirement);
    expect(comEspecial).toEqual([]);
  });
});
