/**
 * Regras de vinculação da assinatura à conta do app.
 *
 * O RevenueCat trata "identificar" e "desidentificar" de forma assimétrica:
 * logIn pode ser chamado a qualquer momento, mas logOut sobre um usuário já
 * anônimo é erro. Estes testes fixam esse contrato.
 */
import { ehContaReal, decidirVinculo } from '../SubscriptionContext';

jest.mock('@/services/subscriptionService', () => ({}));
jest.mock('@/constants/subscription', () => ({}));
jest.mock('../AdsContext', () => ({ useAds: () => ({ setAdsEnabled: jest.fn() }) }));
jest.mock('../AppContext', () => ({ useApp: () => ({ user: null }) }));

describe('ehContaReal', () => {
  it('aceita um UID do Firebase', () => {
    expect(ehContaReal('kQ8vZ2mNpR4tYwXbC7dLfGh1')).toBe(true);
  });

  it('recusa o usuário anônimo criado no primeiro uso', () => {
    expect(ehContaReal('anon_1786810085027_725pdo89d9b')).toBe(false);
  });

  it('recusa o estado pós-logout', () => {
    expect(ehContaReal('guest')).toBe(false);
  });

  it('recusa ausência de usuário', () => {
    expect(ehContaReal(null)).toBe(false);
    expect(ehContaReal(undefined)).toBe(false);
    expect(ehContaReal('')).toBe(false);
  });
});

describe('decidirVinculo', () => {
  const uid = 'kQ8vZ2mNpR4tYwXbC7dLfGh1';

  it('identifica ao entrar numa conta', () => {
    expect(decidirVinculo(uid, null)).toEqual({ tipo: 'identificar', userId: uid });
  });

  it('desidentifica ao sair da conta', () => {
    expect(decidirVinculo('guest', uid)).toEqual({ tipo: 'desidentificar' });
  });

  it('NÃO chama logOut quando o usuário já era anônimo', () => {
    // Este é o caso que quebraria o SDK: abrir o app sem nunca ter entrado.
    expect(decidirVinculo('anon_123_abc', null)).toEqual({ tipo: 'nada' });
    expect(decidirVinculo(null, null)).toEqual({ tipo: 'nada' });
  });

  it('não repete a identificação a cada renderização', () => {
    expect(decidirVinculo(uid, uid)).toEqual({ tipo: 'nada' });
  });

  it('troca a identificação quando outra conta entra', () => {
    const outro = 'zP3xW9kTvB6nQrLmA2sDcYh8';
    expect(decidirVinculo(outro, uid)).toEqual({ tipo: 'identificar', userId: outro });
  });

  it('trata o anônimo como saída quando havia conta identificada', () => {
    expect(decidirVinculo('anon_999_xyz', uid)).toEqual({ tipo: 'desidentificar' });
  });
});
