/**
 * ProgressBar Component
 * Barra de progresso animada
 */

import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '@/constants/design-system';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  label?: string;
  showThumb?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 12,
  showLabel = true,
  label = 'Progresso',
  showThumb = true,
}) => {
  const animatedWidth = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percentage}>{Math.round(progress)}%</Text>
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View style={{ width: widthInterpolated, height: '100%' }}>
          <LinearGradient
            colors={COLORS.primaryGradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          >
            {showThumb && <View style={styles.thumb} />}
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontFamily: 'Poppins-Medium',
  },
  percentage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  track: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.round,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.text,
    transform: [{ translateY: -10 }],
    ...SHADOWS.sm,
  },
});


