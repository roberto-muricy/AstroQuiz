/**
 * Card Component
 * Card com gradiente baseado no design system
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

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
      ? ['rgba(222, 47, 36, 0.30)', 'rgba(243, 150, 12, 0.30)']
      : ['rgba(94, 74, 139, 0.30)', 'rgba(123, 107, 168, 0.30)'];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradientColors}
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  gradient: {
    padding: 1,
  },
  content: {
    padding: 16,
    borderRadius: 19,
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
  },
});


