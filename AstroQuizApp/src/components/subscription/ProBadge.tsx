/**
 * ProBadge - Badge que indica status Pro ou botão para upgrade
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Crown, Star } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/design-system';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface ProBadgeProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const ProBadge: React.FC<ProBadgeProps> = ({
  onPress,
  size = 'medium',
}) => {
  const { isPro, isLoading } = useSubscription();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animação de pulse para usuários free (chamar atenção)
  useEffect(() => {
    if (!isPro && !isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isPro, isLoading, pulseAnim]);

  const iconSize = size === 'small' ? 16 : size === 'large' ? 28 : 22;
  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    isPro ? styles.containerPro : styles.containerFree,
  ];

  if (isLoading) {
    return (
      <View style={[containerStyle, styles.containerLoading]}>
        <Star size={iconSize} color={COLORS.textTertiary} />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          containerStyle,
          !isPro && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {isPro ? (
          <>
            <Crown size={iconSize} color="#FFD700" fill="#FFD700" />
            {size !== 'small' && (
              <Text style={styles.proText}>PRO</Text>
            )}
          </>
        ) : (
          <>
            <Star size={iconSize} color={COLORS.primary} />
            {size !== 'small' && (
              <Text style={styles.freeText}>PRO</Text>
            )}
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: RADIUS.round,
  },

  // Sizes
  container_small: {
    width: 32,
    height: 32,
  },
  container_medium: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    minWidth: 70,
  },
  container_large: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 90,
  },

  // States
  containerPro: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  containerFree: {
    backgroundColor: COLORS.backgroundHighlight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  containerLoading: {
    backgroundColor: COLORS.backgroundHighlight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Text
  proText: {
    ...TYPOGRAPHY.caption,
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },
  freeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
  },
});

export default ProBadge;
