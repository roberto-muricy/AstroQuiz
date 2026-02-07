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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SIZES } from '@/constants/design-system';

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
  const baseContainerStyle = [styles.button, styles[`button_${size}`], style];
  const flattened = StyleSheet.flatten(baseContainerStyle) as ViewStyle | undefined;
  const borderRadius =
    typeof flattened?.borderRadius === 'number' ? flattened.borderRadius : styles.button.borderRadius;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.text, styles[`text_${size}`]]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={baseContainerStyle}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={COLORS.primaryGradient as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius }]}
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
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button_small: {
    height: SIZES.buttonHeightSmall - 8,
    paddingHorizontal: SIZES.buttonPaddingH - 12,
    minWidth: 80,
  },
  button_medium: {
    height: SIZES.buttonHeightSmall,
    paddingHorizontal: SIZES.buttonPaddingH - 4,
    minWidth: 100,
  },
  button_large: {
    height: SIZES.buttonHeight,
    paddingHorizontal: SIZES.buttonPaddingH + 4,
    minWidth: 120,
  },
  button_secondary: {
    backgroundColor: COLORS.success,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  button_danger: {
    backgroundColor: COLORS.danger,
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
    flexShrink: 1,
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


