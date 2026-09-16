/**
 * O Firebase descarta evento com nome inválido em silêncio.
 *
 * Não há erro, não há aviso: o evento simplesmente não chega ao painel, e só se
 * descobre semanas depois, quando alguém vai olhar o funil e não encontra nada.
 * As regras são poucas e fáceis de furar sem querer — um nome com mais de 40
 * caracteres, um hífen, um prefixo reservado.
 */

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperty: jest.fn(),
    logScreenView: jest.fn(),
    setAnalyticsCollectionEnabled: jest.fn(),
  }),
}));

import { AnalyticsEvents } from '../analyticsService';

const PREFIXOS_RESERVADOS = ['firebase_', 'google_', 'ga_'];

describe('nomes de evento', () => {
  const nomes = Object.values(AnalyticsEvents);

  it('existe evento para registrar', () => {
    expect(nomes.length).toBeGreaterThan(10);
  });

  it('seguem o formato que o Firebase aceita', () => {
    const invalidos = nomes.filter((nome) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nome));
    expect(invalidos).toEqual([]);
  });

  it('cabem no limite de 40 caracteres', () => {
    const longos = nomes.filter((nome) => nome.length > 40);
    expect(longos).toEqual([]);
  });

  it('nao usam prefixo reservado pelo Firebase', () => {
    const reservados = nomes.filter((nome) =>
      PREFIXOS_RESERVADOS.some((prefixo) => nome.toLowerCase().startsWith(prefixo)),
    );
    expect(reservados).toEqual([]);
  });

  it('nao ha dois nomes iguais em chaves diferentes', () => {
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('os eventos do ranking estao todos declarados', () => {
    // O plano do ranking previa estes seis; faltar um e perder uma etapa
    // inteira do funil sem ninguem notar.
    expect(nomes).toEqual(
      expect.arrayContaining([
        'leaderboard_view',
        'leaderboard_filter_change',
        'leaderboard_login_cta_click',
        'leaderboard_enroll',
        'leaderboard_nickname_set',
        'leaderboard_report',
      ]),
    );
  });
});
