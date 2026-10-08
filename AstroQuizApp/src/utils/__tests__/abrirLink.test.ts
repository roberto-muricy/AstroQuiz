/**
 * Quando o iPhone se recusa a abrir um endereço (Safari bloqueado, Mail sem
 * conta), o toque não pode morrer em silêncio nem virar erro no Sentry.
 */

const mockOpenURL = jest.fn();
const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  Linking: { openURL: (...a: unknown[]) => mockOpenURL(...a) },
  Alert: { alert: (...a: unknown[]) => mockAlert(...a) },
}));
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (chave: string, vars?: Record<string, string>) => (vars ? `${chave} ${vars.address}` : chave) },
}));

import { abrirLink } from '@/utils/abrirLink';

beforeEach(() => {
  mockOpenURL.mockReset();
  mockAlert.mockReset();
});

describe('abrirLink', () => {
  it('abre o endereço quando o aparelho deixa', async () => {
    mockOpenURL.mockResolvedValue(true);
    await abrirLink('https://astroquiz-legal.vercel.app/terms.html');
    expect(mockOpenURL).toHaveBeenCalledWith('https://astroquiz-legal.vercel.app/terms.html');
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('quando o aparelho recusa, mostra o endereço em vez de falhar', async () => {
    mockOpenURL.mockRejectedValue(new Error('Unable to open URL'));
    await expect(abrirLink('https://astroquiz-legal.vercel.app/privacy.html')).resolves.toBeUndefined();
    expect(mockAlert).toHaveBeenCalledWith(
      'common.linkErrorTitle',
      'common.linkErrorMessage https://astroquiz-legal.vercel.app/privacy.html',
    );
  });

  it('no e-mail, mostra só o endereço, sem o mailto:', async () => {
    mockOpenURL.mockRejectedValue(new Error('Unable to open URL'));
    await abrirLink('mailto:contato@exemplo.com');
    expect(mockAlert).toHaveBeenCalledWith('common.linkErrorTitle', 'common.linkErrorMessage contato@exemplo.com');
  });
});
