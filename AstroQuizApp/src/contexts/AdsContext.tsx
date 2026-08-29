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

// Limites diários — sobraram apenas os continues, que hoje são código morto
// (o quiz não tem game over de onde continuar). Pulos migraram para cota por
// fase; ver PHASE_LIMITS.
const DAILY_LIMITS = {
  continues: 2,
};

/**
 * Cota de pulos por fase.
 *
 * Por fase, e não por dia, seguindo o modelo das ajudas do Show do Milhão: a
 * ajuda faz parte da estrutura da partida, não de uma cota de consumo. Para
 * quem joga de graça isso é mais legível — a cota volta em toda fase, em vez
 * de sumir pelo resto do dia — e rende mais anúncios premiados ao longo do
 * tempo do que um teto diário de três.
 *
 * O Pro leva dois e não paga anúncio; ninguém leva ilimitado. As fases 41-50
 * exigem 85% de acerto, e pulo sem limite levaria o assinante à fase 50 sem
 * saber astronomia — patente, XP e ranking perderiam o sentido. O benefício
 * do Pro é não esperar o vídeo, não burlar o jogo.
 */
const PHASE_LIMITS = {
  free: 1,
  pro: 2,
};

/**
 * Quantos pulos ainda restam nesta fase.
 *
 * Fica fora do componente para poder ser testado sem montar a árvore de
 * contexto.
 */
export const calcularPulosRestantes = (
  ehPro: boolean,
  usadosNaFase: number,
): number =>
  Math.max(0, (ehPro ? PHASE_LIMITS.pro : PHASE_LIMITS.free) - usadosNaFase);

const STORAGE_KEYS = {
  dailyContinues: '@ads_daily_continues',
  lastResetDate: '@ads_last_reset_date',
};

interface AdsContextData {
  // Se ads estão habilitados (false quando Pro)
  adsEnabled: boolean;
  setAdsEnabled: (enabled: boolean) => void;

  // Contadores
  phaseSkipsUsed: number;
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

  // Zera a cota de pulos da fase. O QuizScreen chama ao abrir uma fase.
  resetPhaseCounters: () => void;

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
  const [dailyContinuesUsed, setDailyContinuesUsed] = useState(0);
  // Pulos gastos na fase atual. Vive só em memória: a fase dura uma sessão, e
  // quem fechar o app no meio perde o progresso do quiz junto.
  const [phaseSkipsUsed, setPhaseSkipsUsed] = useState(0);
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
        setDailyContinuesUsed(0);
      } else {
        const continues = await AsyncStorage.getItem(STORAGE_KEYS.dailyContinues);
        setDailyContinuesUsed(parseInt(continues || '0', 10));
      }
    } catch (error) {
      console.error('[AdsContext] Erro ao carregar contadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Incrementa contador de skips usados.
   *
   * Nada vai para o disco: a cota é da fase, e a fase não sobrevive ao
   * fechamento do app.
   */
  const incrementSkipUsed = useCallback(() => {
    setPhaseSkipsUsed(anterior => anterior + 1);
  }, []);

  /**
   * Zera a cota por fase. Chamado ao entrar numa fase nova.
   */
  const resetPhaseCounters = useCallback(() => {
    setPhaseSkipsUsed(0);
  }, []);

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
      [STORAGE_KEYS.dailyContinues, '0'],
      [STORAGE_KEYS.lastResetDate, today],
    ]);
    setDailyContinuesUsed(0);
    setPhaseSkipsUsed(0);
    console.log('[AdsContext] Contadores resetados');
  };

  // Calcular valores derivados
  const ehPro = !adsEnabled;
  const skipsRemaining = calcularPulosRestantes(ehPro, phaseSkipsUsed);
  const continuesRemaining = Math.max(0, DAILY_LIMITS.continues - dailyContinuesUsed);

  // Ninguém é ilimitado — nem o Pro (ver PHASE_LIMITS).
  const canUseSkip = skipsRemaining > 0;
  const canUseContinue = ehPro || continuesRemaining > 0;

  return (
    <AdsContext.Provider
      value={{
        adsEnabled,
        setAdsEnabled,
        phaseSkipsUsed,
        dailyContinuesUsed,
        skipsRemaining,
        continuesRemaining,
        incrementSkipUsed,
        incrementContinueUsed,
        canUseSkip,
        canUseContinue,
        resetPhaseCounters,
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

export { DAILY_LIMITS, PHASE_LIMITS };
