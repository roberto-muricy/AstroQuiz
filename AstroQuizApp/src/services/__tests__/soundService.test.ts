/**
 * Regressão: o serviço precisa ler as preferências salvas em disco.
 * Antes desta correção `settings` já nascia preenchido com os padrões, então
 * `ensureSettings()` nunca consultava o armazenamento e a música de fundo
 * jamais iniciava sozinha — só depois de o usuário mexer no toggle.
 */

const mockSaved = {
  soundEnabled: true,
  vibrationEnabled: true,
  musicEnabled: true, // usuário deixou a música LIGADA na sessão anterior
  notificationsEnabled: true,
  language: 'pt' as const,
};

const mockGetSettings = jest.fn();

jest.mock('@/utils/settingsStorage', () => ({
  SettingsStorage: {
    getSettings: mockGetSettings,
    setMusicEnabled: jest.fn().mockResolvedValue(undefined),
    setSoundEnabled: jest.fn().mockResolvedValue(undefined),
    setVibrationEnabled: jest.fn().mockResolvedValue(undefined),
  },
}));

// Sem módulo nativo: exercita apenas a camada de preferências.
jest.mock('react-native', () => ({
  Vibration: { vibrate: jest.fn() },
  NativeModules: {},
}));

/** Instância nova a cada teste — o serviço é um singleton com estado. */
const freshService = () => {
  let service: any;
  jest.isolateModules(() => {
    service = require('../soundService').default;
  });
  return service;
};

beforeEach(() => {
  mockGetSettings.mockReset();
  mockGetSettings.mockResolvedValue(mockSaved);
});

describe('soundService — preferências', () => {
  it('lê a música ligada do armazenamento em vez de usar o padrão desligado', async () => {
    const settings = await freshService().getSettings();
    expect(settings.musicEnabled).toBe(true);
  });

  it('consulta o armazenamento uma única vez, mesmo com chamadas simultâneas', async () => {
    const service = freshService();
    await Promise.all([service.getSettings(), service.getSettings(), service.getSettings()]);
    expect(mockGetSettings).toHaveBeenCalledTimes(1);
  });

  it('mantém a escolha do usuário depois de desligar a música', async () => {
    const service = freshService();
    await service.setMusicEnabled(false);
    expect((await service.getSettings()).musicEnabled).toBe(false);
  });

  it('cai nos padrões sem quebrar se o armazenamento falhar', async () => {
    mockGetSettings.mockRejectedValue(new Error('disco indisponível'));
    const settings = await freshService().getSettings();
    expect(settings.soundEnabled).toBe(true);
  });
});
