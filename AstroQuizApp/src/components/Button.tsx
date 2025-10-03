/**
 * Button Component
 * Botão customizado baseado no design system
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, styles[`text_${size}`]]}>{title}</Text>
        </>
      )}
    </>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.button, styles[`button_${size}`], style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFA726', '#FFB74D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[`button_${size}`],
        styles[`button_${variant}`],
        disabled && styles.button_disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  button_small: {
    height: 40,
    paddingHorizontal: 16,
  },
  button_medium: {
    height: 48,
    paddingHorizontal: 24,
  },
  button_large: {
    height: 56,
    paddingHorizontal: 32,
  },
  button_secondary: {
    backgroundColor: '#0FB57E',
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  button_danger: {
    backgroundColor: '#DE2F24',
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
});


