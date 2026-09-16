/**
 * Cache local do ranking.
 *
 * A tela abre com o que estiver guardado e só depois troca pelo que o servidor
 * responder. Por isso o que fica guardado tem data: posição no ranking muda, e
 * mostrar o de ontem como se fosse de agora seria pior do que não mostrar nada.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LeaderboardStorage,
  chaveDoRecorte,
  estaFresco,
  VALIDADE_DO_CACHE_MS,
} from '../leaderboardStorage';

const AGORA = new Date('2026-09-16T12:00:00.000Z');
const depoisDe = (ms: number) => new Date(AGORA.getTime() + ms);

const pagina = (totalPlayers: number) => ({ totalPlayers, entries: [] });

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('guarda e devolve a pagina com a data em que veio', async () => {
  await LeaderboardStorage.guardar('weekly', null, pagina(3), AGORA);

  const guardada = await LeaderboardStorage.ler<any>('weekly');
  expect(guardada?.pagina).toEqual(pagina(3));
  expect(guardada?.salvoEm).toBe(AGORA.toISOString());
});

it('mundo e pais sao listas diferentes', async () => {
  await LeaderboardStorage.guardar('weekly', null, pagina(10), AGORA);
  await LeaderboardStorage.guardar('weekly', 'BR', pagina(2), AGORA);

  expect((await LeaderboardStorage.ler<any>('weekly'))?.pagina).toEqual(pagina(10));
  expect((await LeaderboardStorage.ler<any>('weekly', 'BR'))?.pagina).toEqual(pagina(2));
  expect(chaveDoRecorte('weekly', 'br')).toBe(chaveDoRecorte('weekly', 'BR'));
});

it('recorte sem nada guardado devolve null', async () => {
  expect(await LeaderboardStorage.ler('phase')).toBeNull();
});

it('estaFresco separa o recente do que ja envelheceu', async () => {
  await LeaderboardStorage.guardar('all-time', null, pagina(1), AGORA);
  const guardada = await LeaderboardStorage.ler<any>('all-time');

  expect(estaFresco(guardada, AGORA)).toBe(true);
  expect(estaFresco(guardada, depoisDe(VALIDADE_DO_CACHE_MS - 1000))).toBe(true);
  expect(estaFresco(guardada, depoisDe(VALIDADE_DO_CACHE_MS + 1000))).toBe(false);
  expect(estaFresco(null)).toBe(false);
  expect(estaFresco({ pagina: {}, salvoEm: 'nao e data' })).toBe(false);
});

it('o cache nao cresce sem limite: sai o mais antigo', async () => {
  for (let i = 0; i < 10; i++) {
    await LeaderboardStorage.guardar('weekly', `P${i}`, pagina(i), depoisDe(i * 1000));
  }

  const cache = JSON.parse((await AsyncStorage.getItem('@leaderboard_cache_v1')) as string);
  expect(Object.keys(cache)).toHaveLength(8);
  // Os dois mais antigos sairam; o mais novo ficou.
  expect(await LeaderboardStorage.ler('weekly', 'P0')).toBeNull();
  expect(await LeaderboardStorage.ler('weekly', 'P1')).toBeNull();
  expect(await LeaderboardStorage.ler('weekly', 'P9')).not.toBeNull();
});

it('limpar apaga tudo — usado ao sair da conta', async () => {
  await LeaderboardStorage.guardar('weekly', null, pagina(3), AGORA);
  await LeaderboardStorage.limpar();

  expect(await LeaderboardStorage.ler('weekly')).toBeNull();
});

it('cache corrompido nao derruba a leitura', async () => {
  await AsyncStorage.setItem('@leaderboard_cache_v1', 'isto nao e json');

  expect(await LeaderboardStorage.ler('weekly')).toBeNull();

  // E continua dando para guardar por cima.
  await LeaderboardStorage.guardar('weekly', null, pagina(1), AGORA);
  expect(await LeaderboardStorage.ler('weekly')).not.toBeNull();
});
