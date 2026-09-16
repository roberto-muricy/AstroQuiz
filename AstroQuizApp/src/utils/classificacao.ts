/**
 * Como a posição e a pontuação do ranking aparecem em cada idioma.
 *
 * Ordinal não é sufixo colado: em inglês depende do último dígito e tem as
 * exceções de 11 a 13 ("11th", não "11st"); em francês só o primeiro é "1er".
 * Fazer isso na tela, com um `+ 'º'`, daria "11st" em inglês e "1e" em francês.
 */

import { IdiomaSuportado } from './pseudonimo';

/** Separador de milhar de cada idioma: 1.234 em pt, 1,234 em en, 1 234 em fr. */
const SEPARADOR: Record<IdiomaSuportado, string> = {
  pt: '.',
  es: '.',
  en: ',',
  fr: ' ', // espaço fino, como manda a norma francesa
};

function sufixoIngles(posicao: number): string {
  const doisUltimos = posicao % 100;
  if (doisUltimos >= 11 && doisUltimos <= 13) return 'th';
  switch (posicao % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** A posição como se escreve no idioma: 12º, 12.º, 12th, 12e. */
export function ordinal(posicao: number, idioma: IdiomaSuportado): string {
  if (!Number.isFinite(posicao) || posicao < 1) return '';
  const n = Math.floor(posicao);

  switch (idioma) {
    case 'en':
      return `${n}${sufixoIngles(n)}`;
    case 'fr':
      return n === 1 ? '1er' : `${n}e`;
    case 'es':
      return `${n}.º`;
    default:
      return `${n}º`;
  }
}

/** Pontuação com separador de milhar do idioma. */
export function formatarPontuacao(pontos: number, idioma: IdiomaSuportado): string {
  if (!Number.isFinite(pontos)) return '0';
  const inteiro = Math.max(0, Math.floor(pontos));
  return String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR[idioma] || '.');
}

/**
 * Quantos jogadores ficam atrás de quem está nesta posição.
 *
 * É o que dá sentido ao número na tela do convidado: "você entraria em 8º,
 * à frente de 42 jogadores" diz mais do que o 8º sozinho. Devolve 0 quando
 * ninguém fica atrás, e a tela decide se vale a pena dizer alguma coisa.
 */
export function jogadoresAtras(posicao: number, totalDeJogadores: number): number {
  if (!Number.isFinite(posicao) || !Number.isFinite(totalDeJogadores)) return 0;
  return Math.max(0, Math.floor(totalDeJogadores) - Math.floor(posicao));
}
