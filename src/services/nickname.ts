/**
 * Regras do apelido do ranking.
 *
 * Formato, depois de normalizar (NFC, sem espacos nas pontas, espacos
 * repetidos viram um): de 3 a 20 caracteres; letras de qualquer alfabeto,
 * numeros, espaco, ponto, hifen e sublinhado; pelo menos 2 letras. Isso ja
 * deixa de fora arroba, barras e dois-pontos (e-mail e endereco), emojis,
 * caracteres invisiveis e acentos soltos empilhados.
 *
 * Conteudo: o motor e a biblioteca obscenity, com o conjunto de dados em ingles
 * dela e, carregadas em tempo de execucao, as listas de portugues, espanhol,
 * frances e ingles do pacote naughty-words (List of Dirty, Naughty, Obscene
 * and Otherwise Bad Words, licenca CC BY 4.0). Nenhum termo fica no codigo.
 *
 * Transformadores: os recomendados pela obscenity (caracteres parecidos, letras
 * trocadas por numeros, maiusculas, letras repetidas) mais o skipNonAlphabetic
 * dela, que pega letras separadas por ponto, hifen ou espaco.
 *
 * Termos das listas com menos de MINIMO_PARA_O_MOTOR letras nao vao para o
 * motor: com o skipNonAlphabetic a fronteira de palavra deixa de funcionar, e
 * termos curtos apareciam dentro de palavras comuns. Eles sao conferidos so
 * como palavra inteira do apelido.
 */

import {
  RegExpMatcher,
  DataSet,
  englishDataset,
  englishRecommendedBlacklistMatcherTransformers,
  englishRecommendedWhitelistMatcherTransformers,
  parseRawPattern,
  skipNonAlphabeticTransformer,
} from 'obscenity';
import { normalizarApelido } from './leaderboard-players';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const listasDoPacote: Record<string, unknown> = require('naughty-words');

export const IDIOMAS_DAS_LISTAS = ['pt', 'es', 'fr', 'en'] as const;

export const TAMANHO_MINIMO_DO_APELIDO = 3;
export const TAMANHO_MAXIMO_DO_APELIDO = 20;
const MINIMO_DE_LETRAS = 2;
const MINIMO_PARA_O_MOTOR = 4;

export type MotivoDeApelidoInvalido =
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'too_few_letters'
  | 'not_allowed';

export type ResultadoDoApelido =
  | { ok: true; apelido: string }
  | { ok: false; motivo: MotivoDeApelidoInvalido };

/** Devolve true quando o texto contem termo bloqueado. */
export type VerificadorDeConteudo = (texto: string) => boolean;

/** Letras ASCII minusculas, sem acentos: e a forma que o motor compara. */
function formaComparavel(texto: string): string {
  return texto.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
}

function carregarListas() {
  const quantidadePorIdioma: Record<string, number> = {};
  const paraOMotor = new Set<string>();
  const soPalavraInteira = new Set<string>();

  for (const idioma of IDIOMAS_DAS_LISTAS) {
    const lista = listasDoPacote[idioma];
    if (!Array.isArray(lista)) {
      throw new Error(`naughty-words: no list for language "${idioma}"`);
    }
    const termos = new Set(
      lista
        .filter((termo): termo is string => typeof termo === 'string')
        .map(formaComparavel)
        .filter(Boolean)
    );
    quantidadePorIdioma[idioma] = termos.size;
    for (const termo of termos) {
      (termo.length >= MINIMO_PARA_O_MOTOR ? paraOMotor : soPalavraInteira).add(termo);
    }
  }

  return { quantidadePorIdioma, paraOMotor, soPalavraInteira };
}

const listas = carregarListas();

const conjunto = new DataSet<any>().addAll(englishDataset as any);
for (const termo of listas.paraOMotor) {
  // So letras a-z depois de formaComparavel: nada que a sintaxe de padroes interprete.
  conjunto.addPhrase((frase) => frase.addPattern(parseRawPattern(termo)));
}

const matcher = new RegExpMatcher({
  ...conjunto.build(),
  blacklistMatcherTransformers: [
    ...englishRecommendedBlacklistMatcherTransformers,
    skipNonAlphabeticTransformer(),
  ],
  whitelistMatcherTransformers: englishRecommendedWhitelistMatcherTransformers,
});

/** Quantos termos de cada idioma foram carregados do pacote. */
export function termosCarregadosPorIdioma(): Record<string, number> {
  return { ...listas.quantidadePorIdioma };
}

export const contemTermoBloqueado: VerificadorDeConteudo = (texto) =>
  matcher.hasMatch(texto) ||
  texto.split(/[^\p{L}]+/u).some((palavra) => listas.soPalavraInteira.has(formaComparavel(palavra)));

export function validarApelido(
  entrada: unknown,
  verificar: VerificadorDeConteudo = contemTermoBloqueado
): ResultadoDoApelido {
  if (typeof entrada !== 'string') return { ok: false, motivo: 'invalid_characters' };

  const apelido = entrada.normalize('NFC').trim().replace(/\s+/g, ' ');
  const tamanho = [...apelido].length;

  if (tamanho < TAMANHO_MINIMO_DO_APELIDO) return { ok: false, motivo: 'too_short' };
  if (tamanho > TAMANHO_MAXIMO_DO_APELIDO) return { ok: false, motivo: 'too_long' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(apelido)) return { ok: false, motivo: 'invalid_characters' };
  if ((apelido.match(/\p{L}/gu) ?? []).length < MINIMO_DE_LETRAS) {
    return { ok: false, motivo: 'too_few_letters' };
  }

  // A forma digitada e a forma sem acentos: o motor compara letras ASCII.
  if (verificar(apelido) || verificar(normalizarApelido(apelido))) {
    return { ok: false, motivo: 'not_allowed' };
  }

  return { ok: true, apelido };
}
