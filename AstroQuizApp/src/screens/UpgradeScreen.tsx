/**
 * UpgradeScreen - Tela de assinatura Pro
 * Modal com paywall para upgrade
 */

import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { X, Star, Zap, SkipForward, Heart, Crown, Check } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/design-system';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PRICES } from '@/constants/subscription';

export const UpgradeScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isPro, purchaseMonthly, purchaseYearly, restore, customerInfo, isLoading } = useSubscription();
  const expirationDate = customerInfo?.expirationDate;
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = selectedPlan === 'yearly' ? await purchaseYearly() : await purchaseMonthly();
      if (result?.success) {
        Alert.alert(
          t('subscription.successTitle'),
          t('subscription.successMessage'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert(t('common.error'), t('subscription.purchaseError'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await restore();
      if (result?.success) {
        Alert.alert(
          t('subscription.restoreSuccessTitle'),
          t('subscription.restoreSuccessMessage'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error'), t('subscription.noSubscriptionFound'));
      }
    } catch {
      Alert.alert(t('common.error'), t('subscription.restoreError'));
    } finally {
      setPurchasing(false);
    }
  };

  const benefits = [
    { icon: <Zap size={20} color="#FFD700" />, text: t('subscription.benefits.noAds'), sub: t('subscription.benefitsSub.noAds') },
    { icon: <SkipForward size={20} color="#FFD700" />, text: t('subscription.benefits.unlimitedSkips'), sub: t('subscription.benefitsSub.skips') },
    { icon: <Heart size={20} color="#FFD700" />, text: t('subscription.benefits.unlimitedContinues'), sub: t('subscription.benefitsSub.continues') },
  ];

  // Se ja e Pro, mostrar status
  if (isPro) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.closeRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.proActiveContainer}>
            <View style={styles.proActiveIcon}>
              <Crown size={48} color="#FFD700" fill="#FFD700" />
            </View>
            <Text style={styles.proActiveTitle}>{t('subscription.title')}</Text>
            <Text style={styles.proActiveStatus}>{t('subscription.status.active')}</Text>
            {expirationDate && (
              <Text style={styles.proActiveExpiry}>
                {t('subscription.status.renewsOn', { date: new Date(expirationDate).toLocaleDateString() })}
              </Text>
            )}
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => {
                const url = Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions';
                Linking.openURL(url);
              }}
            >
              <Text style={styles.manageButtonText}>{t('subscription.status.manageSubscription')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Close button */}
        <View style={styles.closeRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Star size={48} color="#FFD700" fill="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>{t('subscription.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('subscription.subtitle')}</Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>{benefit.icon}</View>
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>{benefit.text}</Text>
                  <Text style={styles.benefitSub}>{benefit.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Plan cards */}
          <View style={styles.plansContainer}>
            {/* Yearly - highlighted */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.8}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{t('subscription.bestValue')}</Text>
              </View>
              <View style={styles.planRadio}>
                {selectedPlan === 'yearly' ? (
                  <View style={styles.planRadioSelected}><Check size={14} color="#FFF" /></View>
                ) : (
                  <View style={styles.planRadioEmpty} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{t('subscription.yearly')}</Text>
                <Text style={styles.planPrice}>
                  ${PRICES.yearly.price}/{t('subscription.year')}
                </Text>
                <Text style={styles.planEquivalent}>
                  ${PRICES.yearly.monthlyEquivalent}/{t('subscription.month')} — {t('subscription.save', { percent: 44 })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' ? (
                  <View style={styles.planRadioSelected}><Check size={14} color="#FFF" /></View>
                ) : (
                  <View style={styles.planRadioEmpty} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{t('subscription.monthly')}</Text>
                <Text style={styles.planPrice}>
                  ${PRICES.monthly.price}/{t('subscription.month')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Subscribe button */}
          <TouchableOpacity
            style={[styles.subscribeButton, purchasing && styles.subscribeButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFB300', '#FF8F00']}
              style={styles.subscribeGradient}
            >
              <Text style={styles.subscribeText}>
                {purchasing ? t('common.loading') : t('subscription.subscribe')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} disabled={purchasing}>
            <Text style={styles.restoreText}>{t('subscription.restore')}</Text>
          </TouchableOpacity>

          {/* Legal */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>{t('subscription.legalText')}</Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://robertomuricy.github.io/astroquiz/terms-of-service')}>
                <Text style={styles.legalLink}>{t('profile.terms')}</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://robertomuricy.github.io/astroquiz/privacy-policy')}>
                <Text style={styles.legalLink}>{t('profile.privacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Hero
  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Benefits
  benefitsContainer: {
    marginBottom: 28,
    gap: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
  },
  benefitSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    marginTop: 1,
  },
  // Plans
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: 'Poppins-Bold',
  },
  planRadio: {
    marginRight: 14,
  },
  planRadioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
  },
  planPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  planEquivalent: {
    fontSize: 12,
    color: '#FFD700',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  // Subscribe button
  subscribeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: 'Poppins-Bold',
  },
  // Restore
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Medium',
    textDecorationLine: 'underline',
  },
  // Legal
  legalContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legalText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Medium',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  // Pro active status
  proActiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  proActiveIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  proActiveTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  proActiveStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  proActiveExpiry: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
  },
  manageButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manageButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
});

export default UpgradeScreen;
