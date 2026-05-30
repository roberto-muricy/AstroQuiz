/**
 * Toast Component
 * Notificação temporária elegante que aparece e desaparece automaticamente
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/design-system';
import { CheckIcon, InfoIcon, IconSizes, IconColors } from '@/components/Icons';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 2000,
  onHide,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      // Animação de entrada
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide após duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.95)',
          icon: <CheckIcon size={IconSizes.md} color="#FFFFFF" />,
        };
      case 'info':
        return {
          backgroundColor: 'rgba(33, 150, 243, 0.95)',
          icon: <InfoIcon size={IconSizes.md} color="#FFFFFF" />,
        };
      case 'warning':
        return {
          backgroundColor: 'rgba(255, 167, 38, 0.95)',
          icon: <InfoIcon size={IconSizes.md} color="#FFFFFF" />,
        };
      case 'error':
        return {
          backgroundColor: 'rgba(244, 67, 54, 0.95)',
          icon: <InfoIcon size={IconSizes.md} color="#FFFFFF" />,
        };
      default:
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.95)',
          icon: <CheckIcon size={IconSizes.md} color="#FFFFFF" />,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: typeStyles.backgroundColor },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.iconContainer}>{typeStyles.icon}</View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
});
