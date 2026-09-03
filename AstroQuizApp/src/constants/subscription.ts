/**
 * Constantes de Assinatura - AstroQuiz Pro
 */

// RevenueCat API Keys
export const REVENUECAT_API_KEYS = {
  // Key de teste (para desenvolvimento)
  test: 'test_rUTmxCK0srpqCCmYNqvrbSGDPch',

  // Chaves públicas de SDK — feitas para viajar dentro do app.
  ios: 'appl_XdGQhsRvLWVsOGDnwzmbNJIlekM',
  android: 'goog_QYelOHlXrPBMTjJUiFAFdHnUzxQ',
};

// IDs dos produtos (devem corresponder aos configurados nas lojas)
export const PRODUCT_IDS = {
  monthly: 'astroquiz_pro_monthly',
  yearly: 'astroquiz_pro_yearly',
};

// ID do Entitlement no RevenueCat
export const ENTITLEMENT_ID = 'AstroQuiz Pro';

// Preços (para exibição, os preços reais vêm do RevenueCat)
export const PRICES = {
  monthly: {
    amount: 2.99,
    price: '2.99',
    currency: 'USD',
    period: 'month',
  },
  yearly: {
    amount: 19.99,
    price: '19.99',
    currency: 'USD',
    period: 'year',
    monthlyEquivalent: '1.67',
    discount: 44, // percentual de desconto vs mensal
  },
};

// Benefícios do Pro
export const PRO_BENEFITS = [
  {
    key: 'noAds',
    icon: 'ban',
    translationKey: 'subscription.benefits.noAds',
  },
  {
    key: 'skipsPerPhase',
    icon: 'skip-forward',
    translationKey: 'subscription.benefits.skipsPerPhase',
  },
];

// Tipos
export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'none';
