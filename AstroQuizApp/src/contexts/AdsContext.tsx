/**
 * AdsContext - Gerenciamento global de estado de anúncios
 * Controla se ads estão habilitados e limites diários de uso
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// Limites diários para usuários free
const DAILY_LIMITS = {
  skips: 3,
  continues: 2,
};

const STORAGE_KEYS = {
  dailySkips: '@ads_daily_skips',
  dailyContinues: '@ads_daily_continues',
  lastResetDate: '@ads_last_reset_date',
};

interface AdsContextData {
  // Se ads estão habilitados (false quando Pro)
  adsEnabled: boolean;
  setAdsEnabled: (enabled: boolean) => void;

  // Contadores diários
  dailySkipsUsed: number;
  dailyContinuesUsed: number;

  // Limites restantes
  skipsRemaining: number;
  continuesRemaining: number;

  // Funções para incrementar uso
  incrementSkipUsed: () => void;
  incrementContinueUsed: () => void;

  // Verificar se pode usar
  canUseSkip: boolean;
  canUseContinue: boolean;

  // Reset manual (para testes)
  resetDailyCounters: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

const AdsContext = createContext<AdsContextData>({} as AdsContextData);

interface AdsProviderProps {
  children: ReactNode;
}

export const AdsProvider: React.FC<AdsProviderProps> = ({ children }) => {
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [dailySkipsUsed, setDailySkipsUsed] = useState(0);
  const [dailyContinuesUsed, setDailyContinuesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar contadores do storage
  useEffect(() => {
    loadDailyCounters();
  }, []);

  /**
   * Verifica se é um novo dia e reseta contadores se necessário
   */
  const checkAndResetIfNewDay = async (): Promise<boolean> => {
    try {
      const lastResetDate = await AsyncStorage.getItem(STORAGE_KEYS.lastResetDate);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      if (lastResetDate !== today) {
        // É um novo dia, resetar contadores
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.dailySkips, '0'],
          [STORAGE_KEYS.dailyContinues, '0'],
          [STORAGE_KEYS.lastResetDate, today],
        ]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AdsContext] Erro ao verificar reset diário:', error);
      return false;
    }
  };

  /**
   * Carrega contadores salvos
   */
  const loadDailyCounters = async () => {
    try {
      setIsLoading(true);

      // Verificar se precisa resetar
      const wasReset = await checkAndResetIfNewDay();

      if (wasReset) {
        setDailySkipsUsed(0);
        setDailyContinuesUsed(0);
      } else {
        // Carregar valores salvos
        const [skips, continues] = await AsyncStorage.multiGet([
          STORAGE_KEYS.dailySkips,
          STORAGE_KEYS.dailyContinues,
        ]);

        setDailySkipsUsed(parseInt(skips[1] || '0', 10));
        setDailyContinuesUsed(parseInt(continues[1] || '0', 10));
      }
    } catch (error) {
      console.error('[AdsContext] Erro ao carregar contadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Incrementa contador de skips usados
   */
  const incrementSkipUsed = useCallback(async () => {
    const newValue = dailySkipsUsed + 1;
    setDailySkipsUsed(newValue);
    await AsyncStorage.setItem(STORAGE_KEYS.dailySkips, String(newValue));
    console.log(`[AdsContext] Skip usado: ${newValue}/${DAILY_LIMITS.skips}`);
  }, [dailySkipsUsed]);

  /**
   * Incrementa contador de continues usados
   */
  const incrementContinueUsed = useCallback(async () => {
    const newValue = dailyContinuesUsed + 1;
    setDailyContinuesUsed(newValue);
    await AsyncStorage.setItem(STORAGE_KEYS.dailyContinues, String(newValue));
    console.log(`[AdsContext] Continue usado: ${newValue}/${DAILY_LIMITS.continues}`);
  }, [dailyContinuesUsed]);

  /**
   * Reseta contadores manualmente (para testes)
   */
  const resetDailyCounters = async () => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.dailySkips, '0'],
      [STORAGE_KEYS.dailyContinues, '0'],
      [STORAGE_KEYS.lastResetDate, today],
    ]);
    setDailySkipsUsed(0);
    setDailyContinuesUsed(0);
    console.log('[AdsContext] Contadores resetados');
  };

  // Calcular valores derivados
  const skipsRemaining = Math.max(0, DAILY_LIMITS.skips - dailySkipsUsed);
  const continuesRemaining = Math.max(0, DAILY_LIMITS.continues - dailyContinuesUsed);

  // Se Pro (adsEnabled=false), pode usar ilimitado
  // Se Free, verificar limites
  const canUseSkip = !adsEnabled || skipsRemaining > 0;
  const canUseContinue = !adsEnabled || continuesRemaining > 0;

  return (
    <AdsContext.Provider
      value={{
        adsEnabled,
        setAdsEnabled,
        dailySkipsUsed,
        dailyContinuesUsed,
        skipsRemaining,
        continuesRemaining,
        incrementSkipUsed,
        incrementContinueUsed,
        canUseSkip,
        canUseContinue,
        resetDailyCounters,
        isLoading,
      }}
    >
      {children}
    </AdsContext.Provider>
  );
};

/**
 * Hook para usar o contexto de ads
 */
export const useAds = () => {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds deve ser usado dentro de AdsProvider');
  }
  return context;
};

export { DAILY_LIMITS };
