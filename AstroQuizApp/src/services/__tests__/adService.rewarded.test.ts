/**
 * Regressao: o carregamento do anuncio premiado precisa escutar o evento da
 * familia certa.
 *
 * O bug: loadRewardedAd escutava AdEventType.LOADED. Anuncio premiado nao emite
 * esse evento — emite RewardedAdEventType.LOADED. Resultado: o anuncio
 * carregava, o Google registrava 100% de correspondencia, e o app nunca ficava
 * sabendo. isLoaded ficava falso, o botao respondia "anuncio nao disponivel"
 * segurando um anuncio pronto, e o relatorio do AdMob mostrava 26 solicitacoes,
 * 26 correspondidas e ZERO impressoes.
 *
 * O mock abaixo imita o SDK de verdade: dispara SOMENTE
 * RewardedAdEventType.LOADED. Se alguem voltar a escutar o evento generico,
 * isRewardedAdReady fica falso e estes testes falham.
 *
 * Os nomes precisam do prefixo "mock" — o Jest so permite fabricas de mock
 * referenciarem variaveis assim.
 */

// O bundler do React Native define isto; fora dele, nao existe.
(globalThis as any).__DEV__ = false;

const mockEventoGenericoLoaded = 'loaded';
const mockEventoPremiadoLoaded = 'rewarded_loaded';
const mockEventoErro = 'error';

/** Listeners registrados, para o teste poder dispara-los. */
const mockListeners: Record<string, (payload?: any) => void> = {};
/** O que o load() simulado deve fazer: carregar, errar, ou nao responder. */
const mockConfig = { comportamento: 'carrega' as 'carrega' | 'erro' | 'silencio' };

// Mesmo padrao dos outros testes do projeto: o react-native de verdade nao
// atravessa o transform do Jest.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (o: any) => o.ios },
  NativeModules: {},
}));

jest.mock('react-native-google-mobile-ads', () => {
  const criarAnuncio = () => ({
    addAdEventListener: (evento: string, cb: (p?: any) => void) => {
      mockListeners[evento] = cb;
      return () => {};
    },
    load: () => {
      // O SDK responde de forma assincrona.
      setTimeout(() => {
        if (mockConfig.comportamento === 'carrega') {
          // Somente o evento da familia premiada, como o SDK real.
          mockListeners[mockEventoPremiadoLoaded]?.();
        } else if (mockConfig.comportamento === 'erro') {
          mockListeners[mockEventoErro]?.(new Error('no fill'));
        }
        // 'silencio': nao dispara nada — cai na rede de seguranca.
      }, 0);
    },
    show: jest.fn(),
  });

  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn() }),
    InterstitialAd: { createForAdRequest: criarAnuncio },
    RewardedAd: { createForAdRequest: criarAnuncio },
    AdEventType: { LOADED: mockEventoGenericoLoaded, ERROR: mockEventoErro, CLOSED: 'closed' },
    RewardedAdEventType: { LOADED: mockEventoPremiadoLoaded, EARNED_REWARD: 'earned' },
    TestIds: { REWARDED: 'test-rewarded', INTERSTITIAL: 'test-interstitial' },
    AdsConsent: {},
  };
});

// require, e nao import: o import seria icado para antes da atribuicao de
// __DEV__ acima, e o adService a le no momento em que e carregado.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadRewardedAd, isRewardedAdReady } = require('../adService');

beforeEach(() => {
  for (const chave of Object.keys(mockListeners)) delete mockListeners[chave];
  mockConfig.comportamento = 'carrega';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('loadRewardedAd', () => {
  it('reconhece o anuncio carregado pelo evento da familia premiada', async () => {
    await loadRewardedAd('skip');
    // Este e o assert que teria pego o bug: com AdEventType.LOADED, false.
    expect(isRewardedAdReady('skip')).toBe(true);
  });

  it('registra o listener no evento premiado, nao apenas no generico', async () => {
    await loadRewardedAd('continue');
    expect(mockListeners[mockEventoPremiadoLoaded]).toBeDefined();
  });

  it('marca como nao carregado quando o SDK devolve erro', async () => {
    mockConfig.comportamento = 'erro';
    await loadRewardedAd('curiosity');
    expect(isRewardedAdReady('curiosity')).toBe(false);
  });
});
