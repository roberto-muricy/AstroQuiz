/**
 * Ordinal não é sufixo colado.
 *
 * Em inglês, 11, 12 e 13 fogem da regra do último dígito — "11th", e não
 * "11st". Em francês só o primeiro é "1er"; o resto é "e". Um `+ 'º'` na tela
 * erraria os dois, e erraria em todas as telas ao mesmo tempo.
 */

import { ordinal, formatarPontuacao, jogadoresAtras } from '../classificacao';

describe('ordinal', () => {
  it('portugues e espanhol', () => {
    expect(ordinal(1, 'pt')).toBe('1º');
    expect(ordinal(12, 'pt')).toBe('12º');
    expect(ordinal(1, 'es')).toBe('1.º');
    expect(ordinal(12, 'es')).toBe('12.º');
  });

  it('ingles segue o ultimo digito', () => {
    expect(ordinal(1, 'en')).toBe('1st');
    expect(ordinal(2, 'en')).toBe('2nd');
    expect(ordinal(3, 'en')).toBe('3rd');
    expect(ordinal(4, 'en')).toBe('4th');
    expect(ordinal(21, 'en')).toBe('21st');
    expect(ordinal(22, 'en')).toBe('22nd');
    expect(ordinal(103, 'en')).toBe('103rd');
  });

  it('ingles: 11, 12 e 13 sao a excecao', () => {
    expect(ordinal(11, 'en')).toBe('11th');
    expect(ordinal(12, 'en')).toBe('12th');
    expect(ordinal(13, 'en')).toBe('13th');
    expect(ordinal(111, 'en')).toBe('111th');
    expect(ordinal(112, 'en')).toBe('112th');
  });

  it('frances: so o primeiro e 1er', () => {
    expect(ordinal(1, 'fr')).toBe('1er');
    expect(ordinal(2, 'fr')).toBe('2e');
    expect(ordinal(21, 'fr')).toBe('21e');
  });

  it('posicao invalida nao vira texto quebrado', () => {
    expect(ordinal(0, 'pt')).toBe('');
    expect(ordinal(-3, 'en')).toBe('');
    expect(ordinal(NaN, 'fr')).toBe('');
  });
});

describe('formatarPontuacao', () => {
  it('usa o separador de milhar de cada idioma', () => {
    expect(formatarPontuacao(1234, 'pt')).toBe('1.234');
    expect(formatarPontuacao(1234, 'es')).toBe('1.234');
    expect(formatarPontuacao(1234, 'en')).toBe('1,234');
    expect(formatarPontuacao(1234, 'fr')).toBe('1 234');
  });

  it('separa a cada tres casas', () => {
    expect(formatarPontuacao(66330, 'pt')).toBe('66.330');
    expect(formatarPontuacao(1234567, 'en')).toBe('1,234,567');
  });

  it('numeros curtos ficam como estao', () => {
    expect(formatarPontuacao(0, 'pt')).toBe('0');
    expect(formatarPontuacao(999, 'en')).toBe('999');
  });

  it('valor estranho vira zero', () => {
    expect(formatarPontuacao(NaN, 'pt')).toBe('0');
    expect(formatarPontuacao(-50, 'pt')).toBe('0');
  });
});

describe('jogadoresAtras', () => {
  it('conta quantos ficam atras de quem esta na posicao', () => {
    expect(jogadoresAtras(8, 50)).toBe(42);
    expect(jogadoresAtras(1, 2)).toBe(1);
  });

  it('ultimo colocado nao tem ninguem atras', () => {
    expect(jogadoresAtras(50, 50)).toBe(0);
    expect(jogadoresAtras(60, 50)).toBe(0);
    expect(jogadoresAtras(1, 1)).toBe(0);
  });
});
