/**
 * A sequência de dias é gravada na tela de resultado, no meio de outras três
 * escritas do progresso. A ordem importa: o bloco de conquistas salva
 * `{ ...updated }`, uma cópia lida dentro do `updateAfterPhase`. O que for
 * gravado depois dessa leitura e antes desse save é sobrescrito sem aviso.
 *
 * Estes testes repetem a sequência real da QuizResultScreen contra um
 * AsyncStorage em memória — e mostram o que acontece na ordem errada, para
 * ninguém mover a chamada achando que tanto faz.
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

const HOJE = new Date(2026, 8, 10, 12);
const AMANHA = new Date(2026, 8, 11, 12);

/** Os passos de gravação da tela de resultado para uma fase aprovada. */
async function terminarFaseAprovada(agora: Date) {
  await ProgressStorage.registrarPerguntasVistas([101, 102, 103]);
  await ProgressStorage.registrarDiaJogado(agora);
  const updated = await ProgressStorage.updateAfterPhase({
    phaseNumber: 1,
    correctAnswers: 9,
    totalQuestions: 10,
    maxStreak: 9,
  });
  // O bloco de conquistas: salva a cópia lida no updateAfterPhase.
  await ProgressStorage.saveProgress({
    ...updated,
    stats: { ...updated.stats, achievements: ['first_steps'] },
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('sequência de dias no progresso salvo', () => {
  it('sobrevive às escritas da tela de resultado', async () => {
    await terminarFaseAprovada(HOJE);
    const p = await ProgressStorage.getProgress();
    expect(p.sequenciaDiaria).toEqual({ dias: 1, ultimoDia: '2026-09-10' });
    // As outras escritas continuam intactas.
    expect(p.stats.achievements).toEqual(['first_steps']);
    expect(p.answeredQuestionIds).toEqual(expect.arrayContaining([101, 102, 103]));
  });

  it('soma dias corridos entre aberturas do app', async () => {
    await terminarFaseAprovada(HOJE);
    await terminarFaseAprovada(AMANHA);
    const p = await ProgressStorage.getProgress();
    expect(p.sequenciaDiaria).toEqual({ dias: 2, ultimoDia: '2026-09-11' });
  });

  it('fase reprovada também conta o dia', async () => {
    // Reprovar não passa pelo updateAfterPhase — só estas duas escritas.
    await ProgressStorage.registrarPerguntasVistas([201]);
    await ProgressStorage.registrarDiaJogado(HOJE);
    const p = await ProgressStorage.getProgress();
    expect(p.sequenciaDiaria).toEqual({ dias: 1, ultimoDia: '2026-09-10' });
  });

  it('progresso salvo por versão antiga, sem o campo, começa do 1', async () => {
    await AsyncStorage.setItem(
      '@quiz_progress_v2',
      JSON.stringify({ unlockedPhases: 7, completedPhases: [1, 2, 3, 4, 5, 6], stats: { maxStreak: 10 } })
    );
    const antes = await ProgressStorage.getProgress();
    expect(antes.sequenciaDiaria).toBeUndefined();
    expect(antes.unlockedPhases).toBe(7);

    await ProgressStorage.registrarDiaJogado(HOJE);
    const depois = await ProgressStorage.getProgress();
    expect(depois.sequenciaDiaria).toEqual({ dias: 1, ultimoDia: '2026-09-10' });
    expect(depois.unlockedPhases).toBe(7);
  });

  it('na ordem errada o dia é perdido — por isso a chamada vem antes', async () => {
    // Registrado DEPOIS do updateAfterPhase e antes do save das conquistas.
    await ProgressStorage.registrarPerguntasVistas([101]);
    const updated = await ProgressStorage.updateAfterPhase({
      phaseNumber: 1,
      correctAnswers: 9,
      totalQuestions: 10,
      maxStreak: 9,
    });
    await ProgressStorage.registrarDiaJogado(HOJE);
    await ProgressStorage.saveProgress({ ...updated, stats: { ...updated.stats, achievements: ['x'] } });

    const p = await ProgressStorage.getProgress();
    expect(p.sequenciaDiaria).toBeUndefined();
  });
});
