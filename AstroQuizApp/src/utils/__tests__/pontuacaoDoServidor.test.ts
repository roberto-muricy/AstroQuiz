/**
 * A pontuação do servidor guardada no aparelho.
 *
 * É ela que permite dizer ao convidado a posição que ele teria no ranking antes
 * de criar conta. Dois cuidados que estes testes prendem:
 *
 *   - guardar só a MELHOR de cada fase, como o servidor faz;
 *   - ficar FORA de `stats`. O `stats` inteiro é enviado a
 *     PUT /user-profile/:uid/stats, e um campo que não existe em user_profiles
 *     quebraria a sincronização de quem está logado.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/services/authService', () => ({
  __esModule: true,
  default: { getCurrentUser: () => null },
}));
jest.mock('@/services/strapiSyncService', () => ({
  __esModule: true,
  default: { updateUserStats: jest.fn(() => Promise.resolve()) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressStorage } from '../progressStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('guarda a pontuacao da fase e soma as melhores', async () => {
  await ProgressStorage.registrarPontuacaoDoServidor(1, 500);
  await ProgressStorage.registrarPontuacaoDoServidor(2, 300);

  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(800);
});

it('repetir a fase so conta se bater o recorde', async () => {
  await ProgressStorage.registrarPontuacaoDoServidor(1, 500);

  await ProgressStorage.registrarPontuacaoDoServidor(1, 400);
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(500);

  await ProgressStorage.registrarPontuacaoDoServidor(1, 690);
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(690);
});

it('fase reprovada com zero ponto tambem e registrada', async () => {
  await ProgressStorage.registrarPontuacaoDoServidor(3, 0);

  const progresso = await ProgressStorage.getProgress();
  expect(progresso.pontuacoesDoServidor).toEqual({ '3': 0 });
});

it('ignora fase invalida e trata pontuacao estranha como zero', async () => {
  await ProgressStorage.registrarPontuacaoDoServidor(0, 500);
  await ProgressStorage.registrarPontuacaoDoServidor(-1, 500);
  await ProgressStorage.registrarPontuacaoDoServidor(NaN as any, 500);
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(0);

  await ProgressStorage.registrarPontuacaoDoServidor(1, NaN as any);
  await ProgressStorage.registrarPontuacaoDoServidor(2, -50);
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(0);
});

it('sem nenhuma fase registrada, a soma e zero', async () => {
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(0);
});

it('fica fora de stats, que e o que vai para o servidor', async () => {
  await ProgressStorage.registrarPontuacaoDoServidor(1, 500);

  const salvo = JSON.parse((await AsyncStorage.getItem('@quiz_progress_v2')) as string);
  expect(salvo.pontuacoesDoServidor).toEqual({ '1': 500 });
  expect(salvo.stats.pontuacoesDoServidor).toBeUndefined();
  expect(JSON.stringify(salvo.stats)).not.toContain('pontuacoesDoServidor');
});

it('nao atrapalha progresso salvo por versoes anteriores', async () => {
  await AsyncStorage.setItem(
    '@quiz_progress_v2',
    JSON.stringify({ unlockedPhases: 5, completedPhases: [1, 2], stats: { totalXP: 120 } })
  );

  await ProgressStorage.registrarPontuacaoDoServidor(2, 400);

  const progresso = await ProgressStorage.getProgress();
  expect(progresso.unlockedPhases).toBe(5);
  expect(progresso.stats.totalXP).toBe(120);
  expect(await ProgressStorage.pontuacaoTotalDoServidor()).toBe(400);
});
