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
 *
 * Allowlist: expressoes legitimas barradas por engano ficam em
 * config/nickname-allowlist.json. Elas entram como termos permitidos da
 * obscenity, que ignora um termo bloqueado so quando ele esta dentro da
 * expressao permitida inteira; qualquer outro termo no apelido continua
 * barrando.
 *
 * Nomes reservados: config/nickname-reserved.json guarda os nomes que ninguem
 * pode usar, para que nenhum jogador se passe pelo AstroQuiz, pela moderacao ou
 * por uma empresa. Nao e lista de palavrao: e protecao contra falsa identidade.
 */

import fs from 'fs';
import path from 'path';
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

export const ARQUIVO_DA_ALLOWLIST = path.join('config', 'nickname-allowlist.json');
export const ARQUIVO_DE_RESERVADOS = path.join('config', 'nickname-reserved.json');

export const TAMANHO_MINIMO_DO_APELIDO = 3;
export const TAMANHO_MAXIMO_DO_APELIDO = 20;
const MINIMO_DE_LETRAS = 2;
const MINIMO_PARA_O_MOTOR = 4;

export type MotivoDeApelidoInvalido =
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'too_few_letters'
  | 'reserved'
  | 'not_allowed';

export type ResultadoDoApelido =
  | { ok: true; apelido: string }
  | { ok: false; motivo: MotivoDeApelidoInvalido };

/** Devolve true quando o texto contem termo bloqueado. */
export type VerificadorDeConteudo = (texto: string) => boolean;

export interface ExpressaoPermitida {
  /** Como esta no arquivo, em minusculas. */
  escrita: string;
  /** Sem acentos, minusculas e espacos simples. */
  normalizada: string;
}

/** Letras ASCII minusculas, sem acentos: e a forma que o motor compara. */
function formaComparavel(texto: string): string {
  return texto.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Le a allowlist. Arquivo ausente vira lista vazia; formato invalido e erro,
 * para uma configuracao errada nao passar despercebida. Cada expressao precisa
 * ter duas palavras ou mais, para que a allowlist nunca libere um termo sozinho.
 */
export function carregarAllowlist(
  caminho: string = path.resolve(process.cwd(), ARQUIVO_DA_ALLOWLIST)
): ExpressaoPermitida[] {
  let conteudo: string;
  try {
    conteudo = fs.readFileSync(caminho, 'utf8');
  } catch (erro: any) {
    if (erro?.code === 'ENOENT') return [];
    throw erro;
  }

  const lista = JSON.parse(conteudo)?.expressions;
  if (!Array.isArray(lista)) {
    throw new Error(`${ARQUIVO_DA_ALLOWLIST}: "expressions" must be an array`);
  }

  const porForma = new Map<string, ExpressaoPermitida>();
  for (const item of lista) {
    if (typeof item !== 'string') {
      throw new Error(`${ARQUIVO_DA_ALLOWLIST}: every expression must be a string`);
    }
    const normalizada = normalizarApelido(item);
    if (!/^\p{L}+( \p{L}+)+$/u.test(normalizada)) {
      throw new Error(`${ARQUIVO_DA_ALLOWLIST}: every expression must have two or more words made of letters`);
    }
    // Repetida (mesma forma normalizada): vale a primeira.
    if (porForma.has(normalizada)) continue;
    const escrita = item.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
    porForma.set(normalizada, { escrita, normalizada });
  }
  return [...porForma.values()];
}

/**
 * Le os nomes reservados. Arquivo ausente vira conjunto vazio; formato invalido
 * e erro, para uma configuracao errada nao passar despercebida.
 */
export function carregarReservados(
  caminho: string = path.resolve(process.cwd(), ARQUIVO_DE_RESERVADOS)
): Set<string> {
  let conteudo: string;
  try {
    conteudo = fs.readFileSync(caminho, 'utf8');
  } catch (erro: any) {
    if (erro?.code === 'ENOENT') return new Set();
    throw erro;
  }

  const lista = JSON.parse(conteudo)?.names;
  if (!Array.isArray(lista)) {
    throw new Error(`${ARQUIVO_DE_RESERVADOS}: "names" must be an array`);
  }

  const nomes = new Set<string>();
  for (const item of lista) {
    if (typeof item !== 'string') {
      throw new Error(`${ARQUIVO_DE_RESERVADOS}: every name must be a string`);
    }
    const canonico = formaComparavel(item);
    if (!canonico) throw new Error(`${ARQUIVO_DE_RESERVADOS}: every name must have letters`);
    nomes.add(canonico);
  }
  return nomes;
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
const allowlist = carregarAllowlist();
const reservados = carregarReservados();

/**
 * O apelido tenta se passar por um nome reservado? Pega o apelido inteiro
 * ("Astro Quiz", "A.d.m.i.n") e tambem o nome reservado usado como palavra
 * ("Admin Cometa"). Pontuacao e numeros nao disfarcam.
 */
export function eNomeReservado(apelido: string): boolean {
  if (reservados.has(formaComparavel(apelido))) return true;
  return apelido
    .split(/[^\p{L}\p{N}]+/u)
    .some((palavra) => {
      const canonico = formaComparavel(palavra);
      return canonico.length > 0 && reservados.has(canonico);
    });
}

/** Nomes reservados carregados, na forma comparavel. */
export function nomesReservados(): string[] {
  return [...reservados];
}

const conjunto = new DataSet<any>().addAll(englishDataset as any);
for (const termo of listas.paraOMotor) {
  // So letras a-z depois de formaComparavel: nada que a sintaxe de padroes interprete.
  conjunto.addPhrase((frase) => frase.addPattern(parseRawPattern(termo)));
}
for (const expressao of allowlist) {
  // As duas formas: o validador confere o apelido digitado e o sem acentos.
  for (const termo of new Set([expressao.escrita, expressao.normalizada])) {
    conjunto.addPhrase((frase) => frase.addWhitelistedTerm(termo));
  }
}

const matcher = new RegExpMatcher({
  ...conjunto.build(),
  blacklistMatcherTransformers: [
    ...englishRecommendedBlacklistMatcherTransformers,
    skipNonAlphabeticTransformer(),
  ],
  whitelistMatcherTransformers: englishRecommendedWhitelistMatcherTransformers,
});

// Para a conferencia por palavra inteira: tira as expressoes permitidas antes
// de separar as palavras. So letras e espacos (validado ao carregar), entao a
// expressao nao tem nada que a expressao regular interprete.
const expressoesPermitidasNoTexto = allowlist.map(
  ({ normalizada }) => new RegExp(`(^|[^\\p{L}])${normalizada.replace(/ /g, '[^\\p{L}]+')}(?=$|[^\\p{L}])`, 'gu')
);

function palavrasForaDaAllowlist(texto: string): string[] {
  let restante = normalizarApelido(texto);
  for (const expressao of expressoesPermitidasNoTexto) restante = restante.replace(expressao, '$1 ');
  return restante.split(/[^\p{L}]+/u);
}

/** Quantos termos de cada idioma foram carregados do pacote. */
export function termosCarregadosPorIdioma(): Record<string, number> {
  return { ...listas.quantidadePorIdioma };
}

/** Expressoes carregadas da allowlist, na forma normalizada. */
export function expressoesPermitidas(): string[] {
  return allowlist.map((expressao) => expressao.normalizada);
}

export const contemTermoBloqueado: VerificadorDeConteudo = (texto) =>
  matcher.hasMatch(texto) ||
  palavrasForaDaAllowlist(texto).some((palavra) => listas.soPalavraInteira.has(formaComparavel(palavra)));

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
  if (eNomeReservado(apelido)) return { ok: false, motivo: 'reserved' };

  // A forma digitada e a forma sem acentos: o motor compara letras ASCII.
  if (verificar(apelido) || verificar(normalizarApelido(apelido))) {
    return { ok: false, motivo: 'not_allowed' };
  }

  return { ok: true, apelido };
}
