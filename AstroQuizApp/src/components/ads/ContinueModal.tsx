/**
 * ContinueModal - Modal para continuar após game over
 * Permite assistir um ad para continuar ou encerrar o quiz
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, Play, X, Crown } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/design-system';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useAds } from '@/contexts/AdsContext';
import { RootStackParamList } from '@/types';

interface ContinueModalProps {
  visible: boolean;
  onContinue: () => void;
  onEnd: () => void;
  errorsCount?: number;
}

export const ContinueModal: React.FC<ContinueModalProps> = ({
  visible,
  onContinue,
  onEnd,
  errorsCount = 3,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isLoaded, isShowing, showAd } = useRewardedAd({ type: 'continue' });
  const { adsEnabled, canUseContinue, continuesRemaining, incrementContinueUsed } = useAds();

  const [isProcessing, setIsProcessing] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the heart
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, pulseAnim]);

  const handleWatchAd = async () => {
    if (isProcessing || !canUseContinue) return;

    setIsProcessing(true);

    try {
      // Se Pro, não mostra ad
      if (!adsEnabled) {
        incrementContinueUsed();
        onContinue();
        return;
      }

      const result = await showAd();

      if (result.rewarded) {
        incrementContinueUsed();
        onContinue();
      }
      // Se não completou, não faz nada (modal continua visível)
    } catch (error) {
      console.error('[ContinueModal] Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled = isProcessing || isShowing || (!adsEnabled ? false : !canUseContinue);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEnd}
    >
      <TouchableWithoutFeedback onPress={onEnd}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modal,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Heart Icon */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Heart size={48} color="#EF4444" fill="#EF4444" />
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>{t('ads.continueModalTitle')}</Text>

              {/* Message */}
              <Text style={styles.message}>{t('ads.continueModalMessage')}</Text>

              {/* Errors count */}
              <View style={styles.errorsContainer}>
                <Text style={styles.errorsText}>
                  {errorsCount} {t('result.incorrect_plural').toLowerCase()}
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                {/* Watch Ad Button */}
                <TouchableOpacity
                  style={[
                    styles.watchButton,
                    isButtonDisabled && styles.buttonDisabled,
                  ]}
                  onPress={handleWatchAd}
                  disabled={isButtonDisabled}
                  activeOpacity={0.8}
                >
                  {isProcessing || isShowing ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <>
                      {adsEnabled && (
                        <View style={styles.adBadge}>
                          <Play size={10} color={COLORS.text} fill={COLORS.text} />
                          <Text style={styles.adBadgeText}>AD</Text>
                        </View>
                      )}
                      <Heart size={20} color={COLORS.text} />
                      <Text style={styles.watchButtonText}>
                        {t('ads.continueModalWatch')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Usage remaining */}
                {adsEnabled && (
                  <Text style={styles.usageText}>
                    {canUseContinue
                      ? t('ads.continuesRemaining', { count: continuesRemaining })
                      : t('ads.dailyLimitReached')}
                  </Text>
                )}

                {/* Upgrade Pro - quando limite atingido */}
                {adsEnabled && !canUseContinue && (
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => {
                      onEnd();
                      setTimeout(() => navigation.navigate('Upgrade'), 300);
                    }}
                    activeOpacity={0.8}
                  >
                    <Crown size={18} color="#FFD700" />
                    <Text style={styles.upgradeButtonText}>
                      {t('subscription.title')} — {t('subscription.benefits.unlimitedContinues')}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Remove Ads link - sempre visível para free */}
                {adsEnabled && canUseContinue && (
                  <TouchableOpacity
                    style={styles.removeAdsLink}
                    onPress={() => {
                      onEnd();
                      setTimeout(() => navigation.navigate('Upgrade'), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Crown size={14} color="#FFD700" />
                    <Text style={styles.removeAdsText}>{t('subscription.benefits.noAds')}?</Text>
                  </TouchableOpacity>
                )}

                {/* End Quiz Button */}
                <TouchableOpacity
                  style={styles.endButton}
                  onPress={onEnd}
                  activeOpacity={0.8}
                >
                  <X size={18} color={COLORS.textSecondary} />
                  <Text style={styles.endButtonText}>{t('ads.continueModalEnd')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  errorsContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
    marginBottom: SPACING.lg,
  },
  errorsText: {
    ...TYPOGRAPHY.caption,
    color: '#EF4444',
    fontFamily: 'Poppins-SemiBold',
  },
  buttons: {
    width: '100%',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    width: '100%',
    position: 'relative',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  adBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.info,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  adBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: COLORS.text,
  },
  watchButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  usageText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  upgradeButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFD700',
  },
  removeAdsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  removeAdsText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 215, 0, 0.7)',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  endButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});

export default ContinueModal;
