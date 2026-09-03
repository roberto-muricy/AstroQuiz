/**
 * Regressao: o teto de tempo do validador nao pode ficar abaixo do tempo que o
 * jogo concede por pergunta.
 *
 * O bug: MAX_TIME_PER_QUESTION era 30000 enquanto game-rules dava 45000. Como
 * o app envia o tempo real gasto, toda pergunta cujo tempo esgotava chegava com
 * 45000 e era recusada com 400. O app entrava em laco tentando registrar, e o
 * jogador ficava preso na fase sem nenhum botao para sair.
 *
 * Os dois valores vivem em arquivos diferentes — um em TypeScript, outro na
 * config CommonJS — entao nada os mantinha em sincronia. Este teste mantem.
 */
import { MAX_TIME_PER_QUESTION, validateTimeUsed } from '../validation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GAME_RULES } = require('../../../config/game-rules');

const TEMPO_POR_PERGUNTA: number = GAME_RULES.general.timePerQuestion;

describe('MAX_TIME_PER_QUESTION vs. regras do jogo', () => {
  it('as regras do jogo declaram um tempo por pergunta', () => {
    expect(typeof TEMPO_POR_PERGUNTA).toBe('number');
    expect(TEMPO_POR_PERGUNTA).toBeGreaterThan(0);
  });

  it('o teto do validador cobre o tempo integral da pergunta', () => {
    // Este e o assert que teria pego o bug: 30000 < 45000.
    expect(MAX_TIME_PER_QUESTION).toBeGreaterThanOrEqual(TEMPO_POR_PERGUNTA);
  });

  it('aceita o tempo cheio, que e o que chega quando o tempo esgota', () => {
    expect(validateTimeUsed(TEMPO_POR_PERGUNTA).valid).toBe(true);
  });

  it('tolera folga acima do tempo cheio, para latencia e relogio impreciso', () => {
    expect(validateTimeUsed(TEMPO_POR_PERGUNTA + 5000).valid).toBe(true);
  });
});

describe('validateTimeUsed', () => {
  it('aceita zero', () => {
    expect(validateTimeUsed(0).valid).toBe(true);
  });

  it('recusa negativo', () => {
    expect(validateTimeUsed(-1).valid).toBe(false);
  });

  it('recusa valor nao numerico', () => {
    expect(validateTimeUsed('abc').valid).toBe(false);
  });

  it('recusa valor absurdo, acima do teto', () => {
    expect(validateTimeUsed(MAX_TIME_PER_QUESTION + 1).valid).toBe(false);
  });

  it('ignora ausencia — o campo e opcional', () => {
    expect(validateTimeUsed(undefined).valid).toBe(true);
  });
});
