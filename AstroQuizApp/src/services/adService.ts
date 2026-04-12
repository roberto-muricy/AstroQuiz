/**
 * AdService - Gerenciamento de anúncios AdMob
 * Suporta anúncios interstitial e rewarded
 */

import { Platform } from 'react-native';

// Importação segura do módulo ATT (App Tracking Transparency)
let requestTrackingAuthorization: (() => Promise<string>) | null = null;
try {
  const attModule = require('react-native-tracking-transparency');
  requestTrackingAuthorization = attModule.requestTrackingAuthorization;
} catch {
  // Módulo ATT não disponível
}

// Importação segura do módulo de ads
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let mobileAds: any = null;
let AdsConsent: any = null;
let isAdModuleAvailable = false;

try {
  const adsModule = require('react-native-google-mobile-ads');
  InterstitialAd = adsModule.InterstitialAd;
  RewardedAd = adsModule.RewardedAd;
  AdEventType = adsModule.AdEventType;
  RewardedAdEventType = adsModule.RewardedAdEventType;
  TestIds = adsModule.TestIds;
  mobileAds = adsModule.default;
  AdsConsent = adsModule.AdsConsent;
  isAdModuleAvailable = !!(InterstitialAd && RewardedAd && AdEventType && TestIds);
  console.log('[AdService] Module loaded:', isAdModuleAvailable);
} catch (error) {
  console.log('[AdService] Ads module not available:', error);
  isAdModuleAvailable = false;
}

/**
 * Solicita permissão de rastreamento (ATT) no iOS 14.5+
 * Deve ser chamado antes de carregar anúncios.
 * Usa ATTrackingManager nativo para garantir que o diálogo apareça no iOS 14.5+.
 */
export const requestTrackingPermission = async (): Promise<void> => {
  // Solicitar permissão ATT nativa no iOS (ATTrackingManager)
  if (Platform.OS === 'ios' && requestTrackingAuthorization) {
    try {
      const status = await requestTrackingAuthorization();
      console.log('[AdService] ATT native status:', status);
    } catch (attError) {
      console.log('[AdService] ATT native request error (non-fatal):', attError);
    }
  }

  if (!isAdModuleAvailable) {
    console.log('[AdService] Ads module not available, skipping SDK init');
    return;
  }

  try {
    // Inicializar SDK de ads (após permissão ATT)
    if (mobileAds) {
      await mobileAds().initialize();
      console.log('[AdService] Mobile Ads SDK initialized');
    }
  } catch (error) {
    console.log('[AdService] ATT/Ads init error (non-fatal):', error);
  }
};

// Ad Unit IDs - usar TestIds em desenvolvimento
const getInterstitialAdUnitId = () => {
  if (!isAdModuleAvailable) return '';

  const testId = TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';
  const AD_UNIT_IDS = {
    ios: __DEV__ ? testId : 'ca-app-pub-2123152010659436/2364158350',
    android: __DEV__ ? testId : 'ca-app-pub-2123152010659436/1485791576',
  };
  return Platform.OS === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;
};

// Tipos de Rewarded Ads
export type RewardedAdType = 'skip' | 'continue' | 'curiosity';

// Rewarded Ad Unit IDs por tipo
const REWARDED_AD_UNIT_IDS: Record<RewardedAdType, { ios: string; android: string }> = {
  skip: {
    ios: 'ca-app-pub-2123152010659436/9350919286',
    android: 'ca-app-pub-2123152010659436/5451212469',
  },
  continue: {
    ios: 'ca-app-pub-2123152010659436/8115962308',
    android: 'ca-app-pub-2123152010659436/8939855745',
  },
  curiosity: {
    ios: 'ca-app-pub-2123152010659436/1546684523',
    android: 'ca-app-pub-2123152010659436/5882447563',
  },
};

// Test ID oficial do Google para Rewarded Ads
const REWARDED_TEST_ID = 'ca-app-pub-3940256099942544/5224354917';

const getRewardedAdUnitId = (type: RewardedAdType): string => {
  if (!isAdModuleAvailable) return '';

  const testId = TestIds?.REWARDED || REWARDED_TEST_ID;

  if (__DEV__) {
    return testId;
  }

  const ids = REWARDED_AD_UNIT_IDS[type];
  return Platform.OS === 'ios' ? ids.ios : ids.android;
};

const adUnitId = getInterstitialAdUnitId();

// Fase mínima para mostrar anúncios
const MIN_PHASE_FOR_ADS = 3;

// Criar instância do interstitial
let interstitialAd: any = null;
let isAdLoaded = false;

/**
 * Inicializa e carrega o anúncio interstitial
 */
export const loadInterstitialAd = (): void => {
  if (!isAdModuleAvailable) {
    console.log('[AdService] Ads module not available, skipping initialization');
    return;
  }

  try {
    interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // Listener quando o anúncio carrega
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[AdService] Interstitial loaded');
      isAdLoaded = true;
    });

    // Listener quando o anúncio fecha
    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdService] Interstitial closed');
      isAdLoaded = false;
      // Recarregar para a próxima vez
      loadInterstitialAd();
    });

    // Listener para erros
    interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[AdService] Interstitial error:', error);
      isAdLoaded = false;
    });

    // Carregar o anúncio
    interstitialAd.load();
  } catch (error) {
    console.log('[AdService] Error initializing interstitial:', error);
  }
};

/**
 * Mostra o anúncio interstitial se:
 * - A fase for >= MIN_PHASE_FOR_ADS
 * - O anúncio estiver carregado
 *
 * @param phaseNumber - Número da fase completada
 * @returns Promise<boolean> - true se o anúncio foi mostrado
 */
export const showInterstitialAfterPhase = async (phaseNumber: number): Promise<boolean> => {
  // Não mostrar anúncios nas primeiras fases
  if (phaseNumber < MIN_PHASE_FOR_ADS) {
    console.log(`[AdService] Phase ${phaseNumber} < ${MIN_PHASE_FOR_ADS}, skipping ad`);
    return false;
  }

  // Verificar se o anúncio está carregado
  if (!isAdLoaded || !interstitialAd) {
    console.log('[AdService] Ad not loaded, skipping');
    return false;
  }

  try {
    await interstitialAd.show();
    console.log(`[AdService] Showing interstitial after phase ${phaseNumber}`);
    return true;
  } catch (error) {
    console.log('[AdService] Error showing interstitial:', error);
    return false;
  }
};

/**
 * Verifica se deve mostrar anúncio para a fase
 */
export const shouldShowAd = (phaseNumber: number): boolean => {
  return phaseNumber >= MIN_PHASE_FOR_ADS && isAdLoaded;
};

/**
 * Retorna se o anúncio está carregado
 */
export const isAdReady = (): boolean => {
  return isAdLoaded;
};

// ============================================
// REWARDED ADS (com suporte a múltiplos tipos)
// ============================================

export interface RewardedAdResult {
  completed: boolean;  // Usuário assistiu até o fim
  rewarded: boolean;   // Recompensa concedida
  rewardType?: string;
  rewardAmount?: number;
  error?: string;
}

// Estado dos rewarded ads por tipo
interface RewardedAdState {
  ad: any;
  isLoaded: boolean;
  loadPromise: Promise<void> | null;
}

const rewardedAds: Record<RewardedAdType, RewardedAdState> = {
  skip: { ad: null, isLoaded: false, loadPromise: null },
  continue: { ad: null, isLoaded: false, loadPromise: null },
  curiosity: { ad: null, isLoaded: false, loadPromise: null },
};

/**
 * Inicializa e carrega um anúncio rewarded específico
 * @param type - Tipo do rewarded ad (skip, continue, curiosity)
 */
export const loadRewardedAd = (type: RewardedAdType = 'skip'): Promise<void> => {
  if (!isAdModuleAvailable) {
    console.log('[AdService] Ads module not available, skipping rewarded ad initialization');
    return Promise.resolve();
  }

  const state = rewardedAds[type];

  // Evitar múltiplos carregamentos simultâneos
  if (state.loadPromise) {
    return state.loadPromise;
  }

  const adUnitId = getRewardedAdUnitId(type);

  state.loadPromise = new Promise((resolve) => {
    try {
      state.ad = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      state.ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log(`[AdService] Rewarded ad (${type}) loaded`);
        state.isLoaded = true;
        state.loadPromise = null;
        resolve();
      });

      state.ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log(`[AdService] Rewarded ad (${type}) error:`, error);
        state.isLoaded = false;
        state.loadPromise = null;
        resolve();
      });

      state.ad.load();
    } catch (error) {
      console.log(`[AdService] Error initializing rewarded ad (${type}):`, error);
      state.loadPromise = null;
      resolve();
    }
  });

  return state.loadPromise;
};

/**
 * Carrega todos os rewarded ads de uma vez
 */
export const loadAllRewardedAds = async (): Promise<void> => {
  await Promise.all([
    loadRewardedAd('skip'),
    loadRewardedAd('continue'),
    loadRewardedAd('curiosity'),
  ]);
};

/**
 * Mostra o anúncio rewarded e aguarda o resultado
 * @param type - Tipo do rewarded ad (skip, continue, curiosity)
 * @returns Promise com resultado do ad (completed, rewarded, etc)
 */
export const showRewardedAd = (type: RewardedAdType = 'skip'): Promise<RewardedAdResult> => {
  return new Promise((resolve) => {
    if (!isAdModuleAvailable) {
      console.log('[AdService] Ads module not available');
      resolve({ completed: false, rewarded: false, error: 'Ads not available' });
      return;
    }

    const state = rewardedAds[type];

    if (!state.isLoaded || !state.ad) {
      console.log(`[AdService] Rewarded ad (${type}) not loaded`);
      resolve({ completed: false, rewarded: false, error: 'Ad not loaded' });
      return;
    }

    let wasRewarded = false;
    let rewardType: string | undefined;
    let rewardAmount: number | undefined;

    // Listener para quando o usuário ganha a recompensa
    const earnedUnsubscribe = state.ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward: { type: string; amount: number }) => {
        console.log(`[AdService] User earned reward (${type}):`, reward);
        wasRewarded = true;
        rewardType = reward.type;
        rewardAmount = reward.amount;
      }
    );

    // Listener para quando o ad fecha
    const closedUnsubscribe = state.ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log(`[AdService] Rewarded ad (${type}) closed, rewarded:`, wasRewarded);
      state.isLoaded = false;

      // Limpar listeners
      earnedUnsubscribe();
      closedUnsubscribe();

      // Recarregar para próximo uso
      loadRewardedAd(type);

      resolve({
        completed: true,
        rewarded: wasRewarded,
        rewardType,
        rewardAmount,
      });
    });

    // Mostrar o ad
    try {
      state.ad.show();
      console.log(`[AdService] Showing rewarded ad (${type})`);
    } catch (error) {
      console.log(`[AdService] Error showing rewarded ad (${type}):`, error);
      earnedUnsubscribe();
      closedUnsubscribe();
      resolve({ completed: false, rewarded: false, error: String(error) });
    }
  });
};

/**
 * Verifica se um rewarded ad específico está carregado e pronto
 * @param type - Tipo do rewarded ad
 */
export const isRewardedAdReady = (type: RewardedAdType = 'skip'): boolean => {
  return rewardedAds[type].isLoaded;
};

/**
 * Verifica se algum rewarded ad está carregado
 */
export const isAnyRewardedAdReady = (): boolean => {
  return Object.values(rewardedAds).some(state => state.isLoaded);
};

/**
 * Verifica se o módulo de ads está disponível
 */
export const isAdsModuleAvailable = (): boolean => {
  return isAdModuleAvailable;
};
