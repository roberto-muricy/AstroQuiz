/**
 * ToggleSwitch
 *
 * Substitui o <Switch> nativo do React Native, que nesta configuração do app
 * (RN 0.81 com a arquitetura legada) renderiza corretamente mas não entrega o
 * evento de mudança ao JS: como o controle é "controlado" pelo estado, ele volta
 * na hora para o valor anterior e parece travado. Toques em TouchableOpacity
 * funcionam normalmente, então construímos o controle com componentes básicos.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Cor do trilho quando ligado/desligado. */
  trackColor?: { true: string; false: string };
  thumbColor?: string;
}

const TRACK_W = 51;
const TRACK_H = 31;
const THUMB = 27;
const PAD = 2;

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor = { true: '#4CAF50', false: '#3A3A3C' },
  thumbColor = '#FFFFFF',
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // interpolamos cor do trilho
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PAD, TRACK_W - THUMB - PAD],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColor.false, trackColor.true],
  });

  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.hitArea}
    >
      <Animated.View style={[styles.track, { backgroundColor, opacity: disabled ? 0.5 : 1 }]}>
        <Animated.View
          style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX }] }]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Área de toque um pouco maior que o trilho, para facilitar o acerto do dedo.
  hitArea: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ToggleSwitch;
