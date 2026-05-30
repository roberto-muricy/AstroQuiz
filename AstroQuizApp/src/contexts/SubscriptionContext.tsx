/**
 * SubscriptionContext - Gerenciamento global de estado de assinaturas
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
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
    setCustomerInfo({
      isPro: false,
      activeSubscription: null,
      expirationDate: null,
      willRenew: false,
      originalPurchaseDate: null,
    });
  }, []);

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
