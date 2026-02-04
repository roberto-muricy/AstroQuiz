/**
 * AdService - Gerenciamento de anúncios AdMob
 * Mostra anúncios interstitial apenas após a fase 2
 */

import { Platform } from 'react-native';

// Importação segura do módulo de ads
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let isAdModuleAvailable = false;

try {
  const adsModule = require('react-native-google-mobile-ads');
  InterstitialAd = adsModule.InterstitialAd;
  AdEventType = adsModule.AdEventType;
  TestIds = adsModule.TestIds;
  isAdModuleAvailable = !!(InterstitialAd && AdEventType && TestIds);
  console.log('[AdService] Module loaded:', isAdModuleAvailable);
} catch (error) {
  console.log('[AdService] Ads module not available:', error);
  isAdModuleAvailable = false;
}

// Ad Unit IDs - usar TestIds em desenvolvimento
const getAdUnitId = () => {
  if (!isAdModuleAvailable) return '';

  const testId = TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';
  const AD_UNIT_IDS = {
    ios: __DEV__ ? testId : 'ca-app-pub-2123152010659436/2364158350',
    android: __DEV__ ? testId : 'ca-app-pub-2123152010659436/1485791576',
  };
  return Platform.OS === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;
};

const adUnitId = getAdUnitId();

// Fase mínima para mostrar anúncios
const MIN_PHASE_FOR_ADS = 3;

// Criar instância do interstitial
let interstitialAd: InterstitialAd | null = null;
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
