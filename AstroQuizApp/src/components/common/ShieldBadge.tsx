/**
 * ShieldBadge Component
 * Renderiza badges/ícones com estilo consistente
 *
 * Mantém estilo visual atual (círculo com fundo primaryLight)
 */

import React from 'react';
import { Image, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, TYPOGRAPHY, COLORS, SIZES } from '../../constants/design-system';
import { BadgeData } from '../../constants/badges';

interface ShieldBadgeProps {
  badge: BadgeData;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  locked?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP = {
  small: SIZES.iconSmall,
  medium: SIZES.iconBadge,
  large: SIZES.avatarLarge,
};

const CONTAINER_SIZE_MAP = {
  small: 40,
  medium: 48,
  large: 64,
};

export const ShieldBadge: React.FC<ShieldBadgeProps> = ({
  badge,
  size = 'medium',
  showLabel = false,
  locked = false,
  style,
}) => {
  const imageSize = SIZE_MAP[size];
  const containerSize = CONTAINER_SIZE_MAP[size];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
          locked && styles.locked,
        ]}
      >
        <Image
          source={badge.image}
          style={[
            {
              width: imageSize,
              height: imageSize,
            },
            locked && styles.lockedImage,
          ]}
          resizeMode="contain"
        />
      </View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            size === 'small' && styles.labelSmall,
            locked && styles.labelLocked,
          ]}
          numberOfLines={2}
        >
          {badge.name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  locked: {
    backgroundColor: COLORS.backgroundMuted,
  },
  lockedImage: {
    opacity: 0.3,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
    maxWidth: 80,
  },
  labelSmall: {
    fontSize: 10,
  },
  labelLocked: {
    color: COLORS.textTertiary,
  },
});
