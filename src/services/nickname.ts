/**
 * Regras do apelido do ranking.
 *
 * Formato, depois de normalizar (NFC, sem espacos nas pontas, espacos
 * repetidos viram um): de 3 a 20 caracteres; letras de qualquer alfabeto,
 * numeros, espaco, ponto, hifen e sublinhado; pelo menos 2 letras. Isso ja
 * deixa de fora arroba, barras e dois-pontos (e-mail e endereco), emojis,
 * caracteres invisiveis e acentos soltos empilhados.
 *
 * Conteudo: termos bloqueados pela biblioteca obscenity, com os
 * transformadores recomendados por ela (caracteres parecidos, letras trocadas
 * por numeros, maiusculas, letras repetidas) mais o skipNonAlphabetic da
 * propria biblioteca, que o conjunto padrao nao aplica: sem ele, letras
 * separadas por ponto, hifen ou espaco passavam. Nao ha lista propria.
 *
 * Limite conhecido: a obscenity 0.4.6 so traz conjunto de dados em ingles
 * (englishDataset); nao ha conjunto para portugues, espanhol ou frances.
 */

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedBlacklistMatcherTransformers,
  englishRecommendedWhitelistMatcherTransformers,
  skipNonAlphabeticTransformer,
} from 'obscenity';
import { normalizarApelido } from './leaderboard-players';

export const TAMANHO_MINIMO_DO_APELIDO = 3;
export const TAMANHO_MAXIMO_DO_APELIDO = 20;
const MINIMO_DE_LETRAS = 2;

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

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  blacklistMatcherTransformers: [
    ...englishRecommendedBlacklistMatcherTransformers,
    skipNonAlphabeticTransformer(),
  ],
  whitelistMatcherTransformers: englishRecommendedWhitelistMatcherTransformers,
});

export const contemTermoBloqueado: VerificadorDeConteudo = (texto) => matcher.hasMatch(texto);

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

  // A forma digitada e a forma sem acentos: a biblioteca compara letras ASCII.
  if (verificar(apelido) || verificar(normalizarApelido(apelido))) {
    return { ok: false, motivo: 'not_allowed' };
  }

  return { ok: true, apelido };
}
