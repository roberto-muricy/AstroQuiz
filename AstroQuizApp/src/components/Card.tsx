/**
 * Card Component - Refatorado
 * Card com gradiente baseado no design system
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  COLORS,
  RADIUS,
  SIZES,
} from '@/constants/design-system';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'daily-challenge';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const gradientColors =
    variant === 'daily-challenge'
      ? COLORS.cardChallengeGradient
      : COLORS.cardGradient;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>{children}</View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  gradient: {
    padding: 1,
  },
  content: {
    padding: SIZES.cardPadding,
    borderRadius: RADIUS.lg - 1,
    backgroundColor: COLORS.backgroundElevated,
  },
});
