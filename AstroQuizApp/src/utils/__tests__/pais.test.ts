/**
 * Países do ranking.
 *
 * Os nomes vêm do `Intl` do aparelho em vez de uma tabela de 249 países em
 * quatro idiomas. Estes testes cobrem os dois caminhos: com `Intl` — que é o
 * caso normal, e o que o Node usa aqui — e sem ele, onde o país precisa
 * continuar aparecendo pelo código em vez de sumir da lista.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
}));

import {
  CODIGOS_DE_PAIS,
  normalizarCodigoDePais,
  bandeira,
  nomeDoPais,
  paisDoLocale,
  listaDePaises,
  filtrarPaises,
  limparCacheDeNomes,
} from '../pais';

beforeEach(() => {
  limparCacheDeNomes();
});

describe('lista de codigos', () => {
  it('tem os 249 paises da ISO 3166-1, sem repetir', () => {
    expect(CODIGOS_DE_PAIS).toHaveLength(249);
    expect(new Set(CODIGOS_DE_PAIS).size).toBe(249);
  });

  it('todos com duas letras maiusculas, em ordem', () => {
    expect(CODIGOS_DE_PAIS.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
    expect([...CODIGOS_DE_PAIS].sort()).toEqual([...CODIGOS_DE_PAIS]);
  });

  it('inclui os paises dos quatro idiomas do app', () => {
    for (const codigo of ['BR', 'PT', 'US', 'GB', 'ES', 'MX', 'AR', 'FR', 'CA', 'AO', 'MZ']) {
      expect(CODIGOS_DE_PAIS).toContain(codigo);
    }
  });
});

describe('normalizarCodigoDePais', () => {
  it('aceita em minusculas e com espaco', () => {
    expect(normalizarCodigoDePais('br')).toBe('BR');
    expect(normalizarCodigoDePais(' Pt ')).toBe('PT');
  });

  it('recusa o que nao e pais conhecido', () => {
    for (const invalido of ['XX', 'BRA', 'B', '', '12', null, undefined, 42 as any]) {
      expect(normalizarCodigoDePais(invalido as any)).toBeNull();
    }
  });
});

describe('bandeira', () => {
  it('sai do proprio codigo, sem tabela', () => {
    expect(bandeira('BR')).toBe('🇧🇷');
    expect(bandeira('pt')).toBe('🇵🇹');
    expect(bandeira('JP')).toBe('🇯🇵');
  });

  it('codigo invalido nao vira simbolo estranho', () => {
    expect(bandeira('XX')).toBe('');
    expect(bandeira(null)).toBe('');
  });

  it('toda a lista gera uma bandeira', () => {
    const semBandeira = CODIGOS_DE_PAIS.filter((c) => bandeira(c).length === 0);
    expect(semBandeira).toEqual([]);
  });
});

describe('nomeDoPais', () => {
  it('traduz para o idioma de quem ve', () => {
    expect(nomeDoPais('BR', 'pt')).toBe('Brasil');
    expect(nomeDoPais('BR', 'en')).toBe('Brazil');
    expect(nomeDoPais('BR', 'es')).toBe('Brasil');
    expect(nomeDoPais('BR', 'fr')).toBe('Brésil');
  });

  it('codigo invalido devolve vazio', () => {
    expect(nomeDoPais('XX', 'pt')).toBe('');
    expect(nomeDoPais(null, 'pt')).toBe('');
  });

  it('sem Intl.DisplayNames, o pais aparece pelo codigo em vez de sumir', () => {
    const original = (Intl as any).DisplayNames;
    (Intl as any).DisplayNames = undefined;
    limparCacheDeNomes();
    try {
      expect(nomeDoPais('BR', 'pt')).toBe('BR');
      expect(bandeira('BR')).toBe('🇧🇷');
    } finally {
      (Intl as any).DisplayNames = original;
      limparCacheDeNomes();
    }
  });
});

describe('paisDoLocale', () => {
  it('lê a região do identificador do aparelho', () => {
    expect(paisDoLocale('pt-BR')).toBe('BR');
    expect(paisDoLocale('pt_BR')).toBe('BR');
    expect(paisDoLocale('en-US')).toBe('US');
    expect(paisDoLocale('fr-CA')).toBe('CA');
    // Com escrita no meio: zh-Hans-CN.
    expect(paisDoLocale('zh-Hans-CN')).toBe('CN');
  });

  it('idioma sem regiao nao inventa pais', () => {
    expect(paisDoLocale('pt')).toBeNull();
    expect(paisDoLocale('')).toBeNull();
    expect(paisDoLocale(null)).toBeNull();
    expect(paisDoLocale('pt-XX')).toBeNull();
  });
});

describe('listaDePaises e busca', () => {
  it('vem com nome e bandeira, ordenada pelo nome no idioma', () => {
    const lista = listaDePaises('pt');
    expect(lista).toHaveLength(249);

    const nomes = lista.map((p) => p.nome);
    expect([...nomes].sort((a, b) => a.localeCompare(b, 'pt'))).toEqual(nomes);
    expect(lista.find((p) => p.codigo === 'BR')).toEqual({
      codigo: 'BR',
      nome: 'Brasil',
      bandeira: '🇧🇷',
    });
  });

  it('a busca ignora acento e maiuscula, e tambem acha pelo codigo', () => {
    const lista = listaDePaises('pt');

    expect(filtrarPaises(lista, 'brasil').map((p) => p.codigo)).toContain('BR');
    expect(filtrarPaises(lista, 'BRASIL').map((p) => p.codigo)).toContain('BR');
    expect(filtrarPaises(lista, 'br').map((p) => p.codigo)).toContain('BR');

    // Digitando com acento, acha o nome sem acento — e o contrario.
    const comAcento = filtrarPaises(lista, 'méxico').map((p) => p.codigo);
    const semAcento = filtrarPaises(lista, 'mexico').map((p) => p.codigo);
    expect(comAcento).toContain('MX');
    expect(semAcento).toContain('MX');
  });

  it('busca vazia devolve a lista inteira', () => {
    const lista = listaDePaises('en');
    expect(filtrarPaises(lista, '')).toHaveLength(249);
    expect(filtrarPaises(lista, '   ')).toHaveLength(249);
  });

  it('busca sem resultado devolve lista vazia, e nao a lista toda', () => {
    expect(filtrarPaises(listaDePaises('pt'), 'zzzzzz')).toEqual([]);
  });
});
