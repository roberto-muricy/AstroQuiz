/**
 * RewardedAdButton - Botão para assistir anúncio e ganhar recompensa
 * Usado para skip de pergunta, continue após erro, e curiosidades
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, SkipForward, Heart } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/design-system';
import { useRewardedAd, RewardType } from '@/hooks/useRewardedAd';
import { useAds } from '@/contexts/AdsContext';

export interface RewardedAdButtonProps {
  /** Tipo de recompensa */
  rewardType: RewardType;
  /** Callback quando a recompensa é obtida */
  onRewardEarned: () => void;
  /**
   * Disparado no toque, antes do anúncio aparecer. Quem chama usa para
   * suspender o que não pode correr por baixo do vídeo — o cronômetro da
   * pergunta, por exemplo.
   */
  onStarted?: () => void;
  /** Callback quando o ad falha ou usuário cancela */
  onFailed?: (error?: string) => void;
  /** Se o botão está desabilitado */
  disabled?: boolean;
  /** Texto customizado (opcional) */
  label?: string;
  /** Estilo customizado para o container */
  style?: ViewStyle;
  /** Variante do botão */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Tamanho do botão */
  size?: 'small' | 'medium' | 'large';
  /** Se deve mostrar o contador de usos restantes */
  showUsageCount?: boolean;
}

type SupportedRewardType = 'skip' | 'continue';

const ICONS: Record<SupportedRewardType, React.ComponentType<any>> = {
  skip: SkipForward,
  continue: Heart,
};

const DEFAULT_LABELS: Record<SupportedRewardType, string> = {
  skip: 'ads.skipQuestion',
  continue: 'ads.continueGame',
};

export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  rewardType,
  onRewardEarned,
  onStarted,
  onFailed,
  disabled = false,
  label,
  style,
  variant = 'primary',
  size = 'medium',
  showUsageCount = true,
}) => {
  const { t } = useTranslation();
  const { isLoaded, isShowing, showAd } = useRewardedAd({ type: rewardType });
  const {
    adsEnabled,
    canUseSkip,
    canUseContinue,
    skipsRemaining,
    continuesRemaining,
    incrementSkipUsed,
    incrementContinueUsed,
  } = useAds();

  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar se pode usar baseado no tipo
  const canUse = {
    skip: canUseSkip,
    continue: canUseContinue,
  }[rewardType as SupportedRewardType] ?? false;

  const remaining = {
    skip: skipsRemaining,
    continue: continuesRemaining,
  }[rewardType as SupportedRewardType] ?? 0;

  const incrementUsed = {
    skip: incrementSkipUsed,
    continue: incrementContinueUsed,
  }[rewardType as SupportedRewardType] ?? (() => {});

  const Icon = ICONS[rewardType as SupportedRewardType] || Heart;
  const defaultLabel = t(DEFAULT_LABELS[rewardType]);
  const buttonLabel = label || defaultLabel;

  const handlePress = async () => {
    if (isProcessing || disabled || !canUse) return;

    setIsProcessing(true);
    onStarted?.();

    try {
      // Se usuário é Pro (adsEnabled=false), não mostra ad
      if (!adsEnabled) {
        console.log('[RewardedAdButton] Pro user, giving reward directly');
        incrementUsed();
        onRewardEarned();
        return;
      }

      // Mostrar ad
      const result = await showAd();

      if (result.rewarded) {
        console.log('[RewardedAdButton] User earned reward');
        incrementUsed();
        onRewardEarned();
      } else {
        console.log('[RewardedAdButton] User did not earn reward:', result.error);
        onFailed?.(result.error);
      }
    } catch (error) {
      console.error('[RewardedAdButton] Error:', error);
      onFailed?.(String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || !canUse || isProcessing || isShowing;
  const showLoading = isProcessing || isShowing;

  // Estilos dinâmicos
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    isDisabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    isDisabled && styles.textDisabled,
  ];

  const iconColor = isDisabled
    ? COLORS.textDisabled
    : variant === 'primary'
    ? COLORS.text
    : COLORS.primary;

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {showLoading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Icon size={iconSize} color={iconColor} />
      )}

      <Text style={textStyles}>{buttonLabel}</Text>

      {/* Badge com ad/Pro indicator */}
      <View style={styles.badge}>
        {adsEnabled ? (
          <View style={styles.adBadge}>
            <Play size={10} color={COLORS.text} fill={COLORS.text} />
            <Text style={styles.adBadgeText}>AD</Text>
          </View>
        ) : (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Contador de usos restantes.
          Aparece também para o Pro: desde que a cota dele passou a ser por
          fase, esconder o número deixaria o botão simplesmente apagar sem
          explicação depois do segundo pulo. */}
      {showUsageCount && (
        <View style={styles.usageCount}>
          <Text style={styles.usageCountText}>{remaining}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    position: 'relative',
  },

  // Variants
  button_primary: {
    backgroundColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.backgroundHighlight,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // Sizes
  button_small: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
  },
  button_medium: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
  },
  button_large: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minHeight: 52,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontFamily: 'Poppins-SemiBold',
  },
  text_primary: {
    color: COLORS.text,
  },
  text_secondary: {
    color: COLORS.text,
  },
  text_outline: {
    color: COLORS.primary,
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
  textDisabled: {
    color: COLORS.textDisabled,
  },

  // Badge (AD ou PRO)
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  adBadge: {
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
  proBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  proBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: COLORS.background,
  },

  // Usage count
  usageCount: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageCountText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: COLORS.textSecondary,
  },
});

export default RewardedAdButton;
