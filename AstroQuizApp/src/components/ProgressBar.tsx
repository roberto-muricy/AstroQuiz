/**
 * ProgressBar Component
 * Barra de progresso animada
 */

import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 12,
  showLabel = true,
  label = 'Progresso',
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
            colors={['#FFA726', '#FFB74D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          >
            <View style={styles.thumb} />
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
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  percentage: {
    fontSize: 14,
    color: '#FFA726',
    fontFamily: 'Poppins-Bold',
  },
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 100,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateY: -10 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});


