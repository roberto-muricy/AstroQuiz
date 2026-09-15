/**
 * Regras do apelido.
 *
 * Os testes de conteudo montam, em tempo de execucao, um texto que o proprio
 * conjunto de dados da biblioteca bloqueia: nenhum termo aparece no codigo, e
 * as assercoes sobre ele sao booleanas para que nenhum termo apareca na saida.
 * A unica expressao citada e a da allowlist, um termo tecnico de astronomia.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { englishDataset } from 'obscenity';
import {
  validarApelido,
  contemTermoBloqueado,
  termosCarregadosPorIdioma,
  carregarAllowlist,
  expressoesPermitidas,
} from '../nickname';

const NO_LITERAL = 2; // SyntaxKind.Literal na obscenity

function textoBloqueadoPelaBiblioteca(maximo = 9): string {
  for (const termo of englishDataset.build().blacklistedTerms) {
    const nos: any[] = termo.pattern.nodes;
    if (nos.length === 0 || !nos.every((no) => no.kind === NO_LITERAL)) continue;
    const texto = nos.map((no) => String.fromCodePoint(...no.chars)).join('');
    if (new RegExp(`^\\p{L}{4,${maximo}}$`, 'u').test(texto) && contemTermoBloqueado(texto)) return texto;
  }
  throw new Error('conjunto de dados sem termo utilizavel no teste');
}

const recusadoPor = (entrada: unknown, motivo: string, verificar?: (texto: string) => boolean) => {
  const resultado = verificar ? validarApelido(entrada, verificar) : validarApelido(entrada);
  return resultado.ok === false && resultado.motivo === motivo;
};

describe('listas do naughty-words', () => {
  it('carrega pt, es, fr e en em tempo de execucao, cada uma com mais de 50 entradas', () => {
    const quantidades = termosCarregadosPorIdioma();
    for (const idioma of ['pt', 'es', 'fr', 'en']) {
      expect(quantidades[idioma]).toBeGreaterThan(50);
    }
  });
});

describe('allowlist', () => {
  const EXPRESSAO = 'Buraco Negro';

  it('e carregada do arquivo de configuracao', () => {
    expect(expressoesPermitidas()).toEqual(expect.arrayContaining(['buraco negro', 'agujero negro']));
  });

  it('cada expressao da allowlist passa como apelido', () => {
    const recusadas = expressoesPermitidas().filter((expressao) => !validarApelido(expressao).ok);
    expect(recusadas).toEqual([]);
    expect(validarApelido('Agujero Negro').ok).toBe(true);
  });

  it('libera apelidos com a expressao de astronomia', () => {
    for (const apelido of [EXPRESSAO, 'BURACO NEGRO', 'Buraco Negro 42', 'Meu Buraco Negro']) {
      expect(validarApelido(apelido).ok).toBe(true);
    }
  });

  it('libera so a expressao inteira: a palavra sozinha e outros termos continuam barrados', () => {
    const [, segunda] = EXPRESSAO.split(' ');
    expect(recusadoPor(segunda, 'not_allowed')).toBe(true);
    expect(recusadoPor(`Capitao ${segunda}`, 'not_allowed')).toBe(true);
    expect(recusadoPor(`${EXPRESSAO} ${textoBloqueadoPelaBiblioteca(7)}`, 'not_allowed')).toBe(true);
  });

  describe('carregarAllowlist', () => {
    const arquivo = (conteudo: string) => {
      const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'allowlist-'));
      const caminho = path.join(pasta, 'nickname-allowlist.json');
      fs.writeFileSync(caminho, conteudo);
      return caminho;
    };

    it('normaliza as expressoes e remove repetidas', () => {
      const caminho = arquivo(JSON.stringify({ expressions: ['Via  Láctea', 'via lactea', 'Anã Branca'] }));
      expect(carregarAllowlist(caminho)).toEqual([
        { escrita: 'via láctea', normalizada: 'via lactea' },
        { escrita: 'anã branca', normalizada: 'ana branca' },
      ]);
    });

    it('arquivo ausente vira lista vazia', () => {
      expect(carregarAllowlist(path.join(os.tmpdir(), 'nao-existe', 'nickname-allowlist.json'))).toEqual([]);
    });

    it('formato invalido e erro, e expressao de uma palavra so nao e aceita', () => {
      expect(() => carregarAllowlist(arquivo('{"expressions": "buraco negro"}'))).toThrow();
      expect(() => carregarAllowlist(arquivo('{"expressions": [42]}'))).toThrow();
      expect(() => carregarAllowlist(arquivo('{"expressions": ["cometa"]}'))).toThrow();
      expect(() => carregarAllowlist(arquivo('{"expressions": ["buraco-negro 42"]}'))).toThrow();
      expect(() => carregarAllowlist(arquivo('nao e json'))).toThrow();
    });
  });
});

describe('validarApelido', () => {
  it('aceita apelidos comuns nos quatro idiomas do app e em outros alfabetos', () => {
    const apelidos = [
      'Cometa Azul',
      'Estrela Guia',
      'Estrella Fugaz',
      'Étoile Filante',
      'Star Gazer',
      'Órion 42',
      'Luz_do_Sol',
      'Dr. Nebulosa',
      'Ана-Звезда',
      '星空観測',
    ];
    const recusados = apelidos.filter((apelido) => !validarApelido(apelido).ok);
    expect(recusados).toEqual([]);
  });

  it('limpa espacos nas pontas e repetidos', () => {
    expect(validarApelido('  Cometa   Azul ')).toEqual({ ok: true, apelido: 'Cometa Azul' });
  });

  it('conta o tamanho em caracteres, depois de limpar', () => {
    expect(recusadoPor('Ab', 'too_short')).toBe(true);
    expect(recusadoPor('   Ab   ', 'too_short')).toBe(true);
    expect(recusadoPor('a'.repeat(21), 'too_long')).toBe(true);
    expect(validarApelido('É'.repeat(20)).ok).toBe(true);
  });

  it('recusa caracteres fora do permitido', () => {
    for (const apelido of ['nome@site', 'a/b nome', 'hora:certa', 'Nave 🚀', 'Co​meta', 'Cometá́́']) {
      expect(recusadoPor(apelido, 'invalid_characters')).toBe(true);
    }
    expect(recusadoPor(42, 'invalid_characters')).toBe(true);
    expect(recusadoPor({}, 'invalid_characters')).toBe(true);
  });

  it('exige pelo menos duas letras', () => {
    for (const apelido of ['1234', 'A-123', '__.-']) {
      expect(recusadoPor(apelido, 'too_few_letters')).toBe(true);
    }
  });

  it('recusa termos do conjunto de dados da biblioteca, tambem disfarcados', () => {
    const texto = textoBloqueadoPelaBiblioteca();
    expect(recusadoPor(texto, 'not_allowed')).toBe(true);
    expect(recusadoPor(texto.toUpperCase(), 'not_allowed')).toBe(true);
    expect(recusadoPor(`Capitao ${texto}`, 'not_allowed')).toBe(true);
    // Letras separadas: so pegas com o skipNonAlphabetic, fora do conjunto padrao.
    expect(recusadoPor(texto.split('').join('.'), 'not_allowed')).toBe(true);
    expect(recusadoPor(texto.split('').join('-'), 'not_allowed')).toBe(true);
  });

  it('verifica a forma digitada e a forma sem acentos', () => {
    const verificados: string[] = [];
    const resultado = validarApelido('Órion Azul', (texto) => {
      verificados.push(texto);
      return false;
    });
    expect(resultado).toEqual({ ok: true, apelido: 'Órion Azul' });
    expect(verificados).toEqual(['Órion Azul', 'orion azul']);

    expect(recusadoPor('Órion Azul', 'not_allowed', (texto) => texto === 'orion azul')).toBe(true);
  });
});
