/**
 * useRewardedAd - Hook para gerenciar anúncios rewarded
 * Facilita o carregamento e exibição de anúncios com recompensa
 */

import { useCallback, useEffect, useState } from 'react';
import {
  loadRewardedAd,
  showRewardedAd,
  isRewardedAdReady,
  isAdsModuleAvailable,
  RewardedAdResult,
  RewardedAdType,
} from '@/services/adService';
import { useAds } from '@/contexts/AdsContext';

export type RewardType = RewardedAdType;

/** Espaçamento entre novas tentativas de carregar um anúncio que falhou. */
const INTERVALO_NOVA_TENTATIVA_MS = 20000;
/** Teto de tentativas enquanto o botão estiver na tela. */
const MAX_TENTATIVAS = 3;

export interface UseRewardedAdOptions {
  /**
   * Tipo do rewarded ad (skip, continue, curiosity)
   * @default 'skip'
   */
  type?: RewardedAdType;
  /**
   * Se deve pré-carregar o ad automaticamente
   * @default true
   */
  autoLoad?: boolean;
}

export interface UseRewardedAdReturn {
  /** Se o ad está carregado e pronto */
  isLoaded: boolean;
  /** Se está carregando o ad */
  isLoading: boolean;
  /** Se está mostrando o ad */
  isShowing: boolean;
  /** Erro ao carregar/mostrar */
  error: string | null;
  /** Se ads estão disponíveis no dispositivo */
  isAvailable: boolean;
  /** Mostrar o ad e aguardar resultado */
  showAd: () => Promise<RewardedAdResult>;
  /** Recarregar o ad manualmente */
  loadAd: () => Promise<void>;
}

/**
 * Hook para gerenciar anúncios rewarded
 *
 * @example
 * const { isLoaded, showAd } = useRewardedAd({ type: 'skip' });
 *
 * const handleSkip = async () => {
 *   const result = await showAd();
 *   if (result.rewarded) {
 *     // Usuário completou o ad, dar a recompensa
 *   }
 * };
 */
export const useRewardedAd = (options: UseRewardedAdOptions = {}): UseRewardedAdReturn => {
  const { type = 'skip', autoLoad = true } = options;
  const { adsEnabled } = useAds();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isAdsModuleAvailable();

  /**
   * Carregar o ad
   */
  const loadAd = useCallback(async () => {
    if (!isAvailable) {
      setError('Ads module not available');
      return;
    }

    // Se ads estão desabilitados (Pro), não precisa carregar
    if (!adsEnabled) {
      console.log(`[useRewardedAd] Ads disabled (Pro user), skipping load for ${type}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadRewardedAd(type);
      setIsLoaded(isRewardedAdReady(type));
    } catch (err) {
      console.error(`[useRewardedAd] Error loading ad (${type}):`, err);
      setError(String(err));
      setIsLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, adsEnabled, type]);

  /**
   * Mostrar o ad
   */
  const showAd = useCallback(async (): Promise<RewardedAdResult> => {
    // Se ads estão desabilitados (Pro), simular sucesso
    if (!adsEnabled) {
      console.log(`[useRewardedAd] Ads disabled (Pro user), simulating reward for ${type}`);
      return {
        completed: true,
        rewarded: true,
      };
    }

    if (!isAvailable) {
      return {
        completed: false,
        rewarded: false,
        error: 'Ads not available on this device',
      };
    }

    // Se não está carregado, tentar carregar
    if (!isLoaded) {
      console.log(`[useRewardedAd] Ad (${type}) not loaded, attempting to load...`);
      await loadAd();

      // Verificar novamente
      if (!isRewardedAdReady(type)) {
        return {
          completed: false,
          rewarded: false,
          error: 'Ad failed to load',
        };
      }
    }

    setIsShowing(true);
    setError(null);

    try {
      const result = await showRewardedAd(type);

      if (result.error) {
        setError(result.error);
      }

      // Atualizar estado de carregado (ad foi usado)
      setIsLoaded(isRewardedAdReady(type));

      return result;
    } catch (err) {
      console.error(`[useRewardedAd] Error showing ad (${type}):`, err);
      const errorMsg = String(err);
      setError(errorMsg);
      return {
        completed: false,
        rewarded: false,
        error: errorMsg,
      };
    } finally {
      setIsShowing(false);
    }
  }, [isAvailable, adsEnabled, isLoaded, loadAd, type]);

  // Auto-carregar ao montar
  useEffect(() => {
    if (autoLoad && adsEnabled) {
      loadAd();
    }
  }, [autoLoad, adsEnabled, loadAd]);

  // Atualizar estado de carregado periodicamente
  useEffect(() => {
    if (!adsEnabled) return;

    const checkLoaded = () => {
      setIsLoaded(isRewardedAdReady(type));
    };

    const interval = setInterval(checkLoaded, 1000);
    return () => clearInterval(interval);
  }, [adsEnabled, type]);

  // Nova tentativa depois de uma falha de carregamento.
  //
  // Sem isto, um anúncio que falha ao carregar deixa o botão morto: o próximo
  // toque encontra o mesmo estado vazio e mostra o mesmo erro. Falta de
  // preenchimento é rotina no AdMob, então o caso é comum, não excepcional.
  //
  // O intervalo é longo e o número de tentativas é limitado de propósito —
  // repetir requisição de anúncio em rajada é violação de política.
  useEffect(() => {
    if (!adsEnabled || !isAvailable) return;

    let tentativas = 0;
    const intervalo = setInterval(() => {
      if (isRewardedAdReady(type)) {
        tentativas = 0;
        return;
      }
      if (tentativas >= MAX_TENTATIVAS) return;
      tentativas += 1;
      console.log(`[useRewardedAd] Recarregando ${type} (tentativa ${tentativas})`);
      loadAd();
    }, INTERVALO_NOVA_TENTATIVA_MS);

    return () => clearInterval(intervalo);
  }, [adsEnabled, isAvailable, type, loadAd]);

  return {
    isLoaded: adsEnabled ? isLoaded : true, // Pro sempre "carregado"
    isLoading,
    isShowing,
    error,
    isAvailable,
    showAd,
    loadAd,
  };
};

export default useRewardedAd;
