/**
 * SubscriptionContext - Gerenciamento global de estado de assinaturas
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  initializeRevenueCat,
  getCustomerInfo,
  purchaseSubscription,
  restorePurchases,
  addCustomerInfoListener,
  identifyUser,
  logoutUser,
  CustomerInfo,
  PurchaseResult,
  getProducts,
  ProductInfo,
  isSubscriptionServiceAvailable,
} from '@/services/subscriptionService';
import { SubscriptionPlan } from '@/constants/subscription';
import { useAds } from './AdsContext';
import { useApp } from './AppContext';

/**
 * Só contas de verdade são identificadas no RevenueCat. Usuários anônimos
 * (`anon_…`) e o estado pós-logout (`guest`) ficam com o ID anônimo do próprio
 * SDK, que lê o recibo do aparelho.
 */
export const ehContaReal = (id?: string | null): boolean =>
  !!id && id !== 'guest' && !id.startsWith('anon_');

export type AcaoVinculo =
  | { tipo: 'identificar'; userId: string }
  | { tipo: 'desidentificar' }
  | { tipo: 'nada' };

/**
 * Decide o que fazer no RevenueCat quando o usuário do app muda.
 *
 * `identificado` é a conta atualmente vinculada (null = anônimo). A regra
 * delicada é a última: chamar logOut quando já estamos anônimos é erro no SDK,
 * então nesse caso não fazemos nada.
 */
export const decidirVinculo = (
  idDoUsuario: string | null | undefined,
  identificado: string | null,
): AcaoVinculo => {
  const alvo = ehContaReal(idDoUsuario) ? (idDoUsuario as string) : null;
  if (alvo === identificado) return { tipo: 'nada' };
  if (alvo) return { tipo: 'identificar', userId: alvo };
  return identificado ? { tipo: 'desidentificar' } : { tipo: 'nada' };
};

interface SubscriptionContextData {
  // Status da assinatura
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;

  // Produtos disponíveis
  products: ProductInfo[];
  monthlyProduct: ProductInfo | null;
  yearlyProduct: ProductInfo | null;

  // Ações
  purchaseMonthly: () => Promise<PurchaseResult>;
  purchaseYearly: () => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  refreshStatus: () => Promise<void>;

  // Identificação do usuário
  setUserId: (userId: string) => Promise<void>;
  clearUserId: () => Promise<void>;

  // Disponibilidade
  isAvailable: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextData>(
  {} as SubscriptionContextData
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
}) => {
  const { setAdsEnabled } = useAds();
  // Este provider fica dentro do AppProvider, então enxerga o usuário logado.
  const { user } = useApp();
  // Qual conta está identificada no RevenueCat agora (null = anônima).
  const identificadoRef = useRef<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [products, setProducts] = useState<ProductInfo[]>([]);

  const isAvailable = isSubscriptionServiceAvailable();
  const isPro = customerInfo?.isPro ?? false;

  // Inicializar RevenueCat
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      try {
        const success = await initializeRevenueCat();
        setIsInitialized(success);

        if (success) {
          // Carregar status atual
          const info = await getCustomerInfo();
          setCustomerInfo(info);

          // Carregar produtos
          const prods = await getProducts();
          setProducts(prods);

          // Configurar listener para mudanças
          const unsubscribe = addCustomerInfoListener((newInfo) => {
            console.log('[SubscriptionContext] Customer info updated:', newInfo.isPro);
            setCustomerInfo(newInfo);
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error('[SubscriptionContext] Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Sincronizar isPro com AdsContext
  useEffect(() => {
    // Se é Pro, desabilitar ads
    setAdsEnabled(!isPro);
    console.log('[SubscriptionContext] Ads enabled:', !isPro);
  }, [isPro, setAdsEnabled]);


  /**
   * Atualiza o status da assinatura
   */
  const refreshStatus = useCallback(async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[SubscriptionContext] Error refreshing status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Compra assinatura mensal
   */
  const purchaseMonthly = useCallback(async (): Promise<PurchaseResult> => {
    setIsLoading(true);
    try {
      const result = await purchaseSubscription('monthly');
      if (result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Compra assinatura anual
   */
  const purchaseYearly = useCallback(async (): Promise<PurchaseResult> => {
    setIsLoading(true);
    try {
      const result = await purchaseSubscription('yearly');
      if (result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restaura compras anteriores
   */
  const restore = useCallback(async (): Promise<PurchaseResult> => {
    setIsLoading(true);
    try {
      const result = await restorePurchases();
      if (result.customerInfo) {
        setCustomerInfo(result.customerInfo);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Identifica o usuário (para sync entre dispositivos)
   */
  const setUserId = useCallback(async (userId: string) => {
    await identifyUser(userId);
    await refreshStatus();
  }, [refreshStatus]);

  /**
   * Remove identificação do usuário
   */
  const clearUserId = useCallback(async () => {
    await logoutUser();
    // Não zeramos o status: a assinatura pertence ao Apple ID, não à conta do
    // app. Quem sai da conta continua Pro no mesmo aparelho — e a Apple exige
    // que seja assim. Relemos o estado real em vez de presumir "não-Pro".
    const info = await getCustomerInfo();
    setCustomerInfo(info);
  }, []);

  /**
   * Vincula a assinatura à conta do app.
   *
   * Sem isto o RevenueCat opera sempre com um ID anônimo preso ao aparelho:
   * quem assina no iPhone e entra com a mesma conta AstroQuiz no iPad não vê
   * o Pro. Como o SubscriptionProvider fica dentro do AppProvider, ele observa
   * o usuário e reage sozinho ao login e ao logout — nenhuma tela precisa
   * chamar nada.
   */
  useEffect(() => {
    if (!isInitialized) return;

    const acao = decidirVinculo(user?.id, identificadoRef.current);
    if (acao.tipo === 'nada') return;

    let cancelado = false;
    (async () => {
      try {
        if (acao.tipo === 'identificar') {
          await setUserId(acao.userId);
          if (!cancelado) identificadoRef.current = acao.userId;
        } else {
          await clearUserId();
          if (!cancelado) identificadoRef.current = null;
        }
      } catch (error) {
        // Falhar aqui não pode quebrar o app: o usuário segue com o ID anônimo,
        // que continua lendo o recibo do aparelho.
        console.error('[SubscriptionContext] Falha ao vincular a assinatura à conta:', error);
      }
    })();

    return () => { cancelado = true; };
  }, [isInitialized, user?.id, setUserId, clearUserId]);

  // Produtos filtrados
  const monthlyProduct = products.find((p) =>
    p.identifier.includes('monthly')
  ) || null;
  const yearlyProduct = products.find((p) =>
    p.identifier.includes('yearly')
  ) || null;

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isLoading,
        customerInfo,
        products,
        monthlyProduct,
        yearlyProduct,
        purchaseMonthly,
        purchaseYearly,
        restore,
        refreshStatus,
        setUserId,
        clearUserId,
        isAvailable,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Hook para usar o contexto de assinaturas
 */
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription deve ser usado dentro de SubscriptionProvider');
  }
  return context;
};
