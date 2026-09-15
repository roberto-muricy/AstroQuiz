/**
 * Nome gerado do ranking: adjetivo + objeto astronomico + numero.
 *
 * Sao chaves, e nao texto: o app traduz cada uma para o idioma de quem ve.
 * Como sao escolhidas aqui, e nunca digitadas, nao passam por moderacao.
 */

import { randomInt } from 'crypto';
import type { Pseudonimo } from './leaderboard-players';

export const ADJETIVOS_DO_PSEUDONIMO: readonly string[] = [
  'swift',
  'bright',
  'curious',
  'silent',
  'distant',
  'radiant',
  'brave',
  'calm',
  'clever',
  'cosmic',
  'golden',
  'silver',
  'steady',
  'wandering',
  'shining',
  'bold',
  'gentle',
  'keen',
  'lucky',
  'noble',
  'quick',
  'serene',
  'vivid',
  'patient',
];

export const OBJETOS_DO_PSEUDONIMO: readonly string[] = [
  'comet',
  'nebula',
  'pulsar',
  'quasar',
  'galaxy',
  'meteor',
  'orbit',
  'planet',
  'star',
  'moon',
  'aurora',
  'eclipse',
  'cluster',
  'nova',
  'rocket',
  'satellite',
  'telescope',
  'asteroid',
  'horizon',
  'cosmos',
  'zenith',
  'photon',
  'equinox',
  'solstice',
];

export const MENOR_NUMERO_DO_PSEUDONIMO = 10;
export const MAIOR_NUMERO_DO_PSEUDONIMO = 999;

export function sortearPseudonimo(): Pseudonimo {
  return {
    adjetivo: ADJETIVOS_DO_PSEUDONIMO[randomInt(ADJETIVOS_DO_PSEUDONIMO.length)],
    objeto: OBJETOS_DO_PSEUDONIMO[randomInt(OBJETOS_DO_PSEUDONIMO.length)],
    numero: randomInt(MENOR_NUMERO_DO_PSEUDONIMO, MAIOR_NUMERO_DO_PSEUDONIMO + 1),
  };
}
