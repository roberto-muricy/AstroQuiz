/**
 * SubscriptionService - Gerenciamento de assinaturas via RevenueCat
 */

import { Platform } from 'react-native';
import {
  REVENUECAT_API_KEYS,
  ENTITLEMENT_ID,
  PRODUCT_IDS,
  SubscriptionPlan,
} from '@/constants/subscription';

// Importação segura do RevenueCat
let Purchases: any = null;
let LOG_LEVEL: any = null;
let isRevenueCatAvailable = false;

try {
  const purchasesModule = require('react-native-purchases');
  Purchases = purchasesModule.default || purchasesModule.Purchases;
  LOG_LEVEL = purchasesModule.LOG_LEVEL;
  isRevenueCatAvailable = !!Purchases;
  console.log('[SubscriptionService] RevenueCat module loaded:', isRevenueCatAvailable);
} catch (error) {
  console.log('[SubscriptionService] RevenueCat not available:', error);
  isRevenueCatAvailable = false;
}

// Tipos
export interface CustomerInfo {
  isPro: boolean;
  activeSubscription: SubscriptionPlan | null;
  expirationDate: Date | null;
  willRenew: boolean;
  originalPurchaseDate: Date | null;
}

export interface ProductInfo {
  identifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
  title: string;
  description: string;
  introPrice?: {
    priceString: string;
    price: number;
    period: string;
    periodUnit: string;
    periodNumberOfUnits: number;
  };
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  userCancelled?: boolean;
}

/**
 * Inicializa o RevenueCat SDK
 */
export const initializeRevenueCat = async (): Promise<boolean> => {
  if (!isRevenueCatAvailable) {
    console.log('[SubscriptionService] RevenueCat not available, skipping initialization');
    return false;
  }

  try {
    // Usar key de teste em DEV, ou key específica da plataforma em PROD
    let apiKey = REVENUECAT_API_KEYS.test;

    if (!__DEV__) {
      apiKey = Platform.OS === 'ios'
        ? REVENUECAT_API_KEYS.ios
        : REVENUECAT_API_KEYS.android;
    }

    // Configurar log level
    if (__DEV__ && LOG_LEVEL) {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    }

    // Configurar o SDK
    await Purchases.configure({ apiKey });

    console.log('[SubscriptionService] RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('[SubscriptionService] Error initializing RevenueCat:', error);
    return false;
  }
};

/**
 * Identifica o usuário no RevenueCat (para sincronizar entre dispositivos)
 */
export const identifyUser = async (userId: string): Promise<void> => {
  if (!isRevenueCatAvailable) return;

  try {
    await Purchases.logIn(userId);
    console.log('[SubscriptionService] User identified:', userId);
  } catch (error) {
    console.error('[SubscriptionService] Error identifying user:', error);
  }
};

/**
 * Faz logout do usuário atual
 */
export const logoutUser = async (): Promise<void> => {
  if (!isRevenueCatAvailable) return;

  try {
    await Purchases.logOut();
    console.log('[SubscriptionService] User logged out');
  } catch (error) {
    console.error('[SubscriptionService] Error logging out:', error);
  }
};

/**
 * Obtém informações do cliente atual
 */
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  const defaultInfo: CustomerInfo = {
    isPro: false,
    activeSubscription: null,
    expirationDate: null,
    willRenew: false,
    originalPurchaseDate: null,
  };

  if (!isRevenueCatAvailable) {
    return defaultInfo;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return parseCustomerInfo(customerInfo);
  } catch (error) {
    console.error('[SubscriptionService] Error getting customer info:', error);
    return defaultInfo;
  }
};

/**
 * Obtém os produtos disponíveis
 */
export const getProducts = async (): Promise<ProductInfo[]> => {
  if (!isRevenueCatAvailable) {
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current || !offerings.current.availablePackages) {
      console.log('[SubscriptionService] No offerings available');
      return [];
    }

    return offerings.current.availablePackages.map((pkg: any) => ({
      identifier: pkg.product.identifier,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      title: pkg.product.title,
      description: pkg.product.description,
      introPrice: pkg.product.introPrice ? {
        priceString: pkg.product.introPrice.priceString,
        price: pkg.product.introPrice.price,
        period: pkg.product.introPrice.period,
        periodUnit: pkg.product.introPrice.periodUnit,
        periodNumberOfUnits: pkg.product.introPrice.periodNumberOfUnits,
      } : undefined,
    }));
  } catch (error) {
    console.error('[SubscriptionService] Error getting products:', error);
    return [];
  }
};

/**
 * Realiza a compra de uma assinatura
 */
export const purchaseSubscription = async (plan: SubscriptionPlan): Promise<PurchaseResult> => {
  if (!isRevenueCatAvailable) {
    return { success: false, error: 'RevenueCat not available' };
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      return { success: false, error: 'No offerings available' };
    }

    const productId = plan === 'monthly' ? PRODUCT_IDS.monthly : PRODUCT_IDS.yearly;
    const packageToPurchase = offerings.current.availablePackages.find(
      (pkg: any) => pkg.product.identifier === productId
    );

    if (!packageToPurchase) {
      return { success: false, error: `Product ${productId} not found` };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    return {
      success: true,
      customerInfo: parseCustomerInfo(customerInfo),
    };
  } catch (error: any) {
    // Verificar se o usuário cancelou
    if (error.userCancelled) {
      return { success: false, userCancelled: true };
    }

    console.error('[SubscriptionService] Purchase error:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
};

/**
 * Restaura compras anteriores
 */
export const restorePurchases = async (): Promise<PurchaseResult> => {
  if (!isRevenueCatAvailable) {
    return { success: false, error: 'RevenueCat not available' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();

    const parsed = parseCustomerInfo(customerInfo);

    return {
      success: parsed.isPro,
      customerInfo: parsed,
      error: parsed.isPro ? undefined : 'No active subscription found',
    };
  } catch (error: any) {
    console.error('[SubscriptionService] Restore error:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
};

/**
 * Adiciona listener para mudanças no status da assinatura
 */
export const addCustomerInfoListener = (
  callback: (info: CustomerInfo) => void
): (() => void) => {
  if (!isRevenueCatAvailable) {
    return () => {};
  }

  const listener = (customerInfo: any) => {
    callback(parseCustomerInfo(customerInfo));
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  // Retorna função para remover o listener
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
};

/**
 * Verifica se o RevenueCat está disponível
 */
export const isSubscriptionServiceAvailable = (): boolean => {
  return isRevenueCatAvailable;
};

// ============================================
// HELPERS
// ============================================

/**
 * Converte CustomerInfo do RevenueCat para nosso formato
 */
const parseCustomerInfo = (customerInfo: any): CustomerInfo => {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

  if (!entitlement) {
    return {
      isPro: false,
      activeSubscription: null,
      expirationDate: null,
      willRenew: false,
      originalPurchaseDate: null,
    };
  }

  // Determinar qual plano está ativo
  let activeSubscription: SubscriptionPlan | null = null;
  if (entitlement.productIdentifier === PRODUCT_IDS.monthly) {
    activeSubscription = 'monthly';
  } else if (entitlement.productIdentifier === PRODUCT_IDS.yearly) {
    activeSubscription = 'yearly';
  }

  return {
    isPro: true,
    activeSubscription,
    expirationDate: entitlement.expirationDate
      ? new Date(entitlement.expirationDate)
      : null,
    willRenew: entitlement.willRenew || false,
    originalPurchaseDate: entitlement.originalPurchaseDate
      ? new Date(entitlement.originalPurchaseDate)
      : null,
  };
};

export default {
  initializeRevenueCat,
  identifyUser,
  logoutUser,
  getCustomerInfo,
  getProducts,
  purchaseSubscription,
  restorePurchases,
  addCustomerInfoListener,
  isSubscriptionServiceAvailable,
};
