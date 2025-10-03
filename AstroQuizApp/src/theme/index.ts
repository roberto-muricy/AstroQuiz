/**
 * Theme - Design System
 * Cores, tipografia e espaçamentos baseados no Figma
 */

// ===== COLORS =====
export const colors = {
  // Primárias
  purple: '#5E4A8B',
  purpleLight: '#7B6BA8',
  purpleDark: '#2C1B47',
  orange: '#FFA726',
  orangeLight: '#FFB849',
  red: '#DE2F24',
  redLight: '#F3960C',
  
  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Neutras
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  grayLight: '#E0E0E0',
  grayDark: '#424242',
  
  // Background
  background: '#1A0F2E',
  backgroundLight: '#2C1B47',
  backgroundCard: 'rgba(94, 74, 139, 0.30)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// ===== GRADIENTS =====
export const gradients = {
  background: ['#2C1B47', '#1A0F2E'],
  card: ['rgba(94, 74, 139, 0.30)', 'rgba(123, 107, 168, 0.30)'],
  dailyChallenge: ['rgba(222, 47, 36, 0.30)', 'rgba(243, 150, 12, 0.30)'],
  weeklyRanking: ['rgba(94, 74, 139, 0.30)', 'rgba(123, 107, 168, 0.30)'],
  button: ['#5E4A8B', '#7B6BA8'],
  success: ['#4CAF50', '#66BB6A'],
  error: ['#F44336', '#EF5350'],
};

// ===== TYPOGRAPHY =====
export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ===== SPACING =====
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// ===== BORDER RADIUS =====
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// ===== SHADOWS =====
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ===== ANIMATIONS =====
export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ===== EXPORT DEFAULT =====
export default {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
};


