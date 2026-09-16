/**
 * Conferência local do apelido, para o erro aparecer enquanto a pessoa digita.
 *
 * Só o formato: o filtro de palavras e os nomes reservados ficam no servidor, e
 * duplicá-los aqui criaria duas listas para manter. Os motivos têm os mesmos
 * nomes que o servidor devolve, para a tela ter uma mensagem só por motivo,
 * venha ela daqui ou de lá.
 */

import {
  validarApelidoLocalmente,
  limparApelido,
  caracteresRestantes,
  TAMANHO_MAXIMO,
} from '../apelido';

const motivoDe = (entrada: string) => {
  const resultado = validarApelidoLocalmente(entrada);
  return resultado.ok ? null : resultado.motivo;
};

describe('validarApelidoLocalmente', () => {
  it('aceita apelidos comuns nos quatro idiomas', () => {
    const recusados = [
      'Cometa Azul',
      'Estrella Fugaz',
      'Étoile Filante',
      'Star Gazer',
      'Órion 42',
      'Luz_do_Sol',
      'Dr. Nebulosa',
      'Ана-Звезда',
      '星空観測',
    ].filter((a) => !validarApelidoLocalmente(a).ok);

    expect(recusados).toEqual([]);
  });

  it('devolve o apelido ja limpo', () => {
    expect(validarApelidoLocalmente('  Cometa   Azul ')).toEqual({
      ok: true,
      apelido: 'Cometa Azul',
    });
  });

  it('conta o tamanho depois de limpar', () => {
    expect(motivoDe('Ab')).toBe('too_short');
    expect(motivoDe('   Ab   ')).toBe('too_short');
    expect(motivoDe('a'.repeat(21))).toBe('too_long');
    expect(validarApelidoLocalmente('É'.repeat(20)).ok).toBe(true);
  });

  it('conta caracteres, nao bytes: acento e emoji contam uma vez', () => {
    // 20 letras acentuadas cabem; 21 nao.
    expect(validarApelidoLocalmente('ã'.repeat(20)).ok).toBe(true);
    expect(motivoDe('ã'.repeat(21))).toBe('too_long');
  });

  it('recusa caracteres que nao sao de apelido', () => {
    expect(motivoDe('nome@site')).toBe('invalid_characters');
    expect(motivoDe('a/b nome')).toBe('invalid_characters');
    expect(motivoDe('hora:certa')).toBe('invalid_characters');
    expect(motivoDe('Nave 🚀')).toBe('invalid_characters');
  });

  it('exige pelo menos duas letras', () => {
    expect(motivoDe('1234')).toBe('too_few_letters');
    expect(motivoDe('A-123')).toBe('too_few_letters');
    expect(motivoDe('__.-')).toBe('too_few_letters');
  });

  it('entrada vazia ou ausente e apelido curto demais', () => {
    expect(motivoDe('')).toBe('too_short');
    expect(motivoDe('   ')).toBe('too_short');
    expect(validarApelidoLocalmente(null as any).ok).toBe(false);
  });
});

describe('limparApelido', () => {
  it('tira espaco das pontas e junta os repetidos', () => {
    expect(limparApelido('  Cometa    Azul  ')).toBe('Cometa Azul');
  });
});

describe('caracteresRestantes', () => {
  it('conta o que ainda cabe, ja descontando a limpeza', () => {
    expect(caracteresRestantes('')).toBe(TAMANHO_MAXIMO);
    expect(caracteresRestantes('Cometa')).toBe(TAMANHO_MAXIMO - 6);
    expect(caracteresRestantes('  Cometa  ')).toBe(TAMANHO_MAXIMO - 6);
    expect(caracteresRestantes('ã'.repeat(20))).toBe(0);
  });

  it('fica negativo quando passou, para a tela poder avisar', () => {
    expect(caracteresRestantes('a'.repeat(25))).toBe(-5);
  });
});
