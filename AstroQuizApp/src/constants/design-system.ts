/**
 * Design System Global - AstroQuiz
 * Sistema de design unificado baseado em grid de 8px
 *
 * ⚠️ CORES EXATAS DO APP ATUAL - NÃO MODIFICAR
 */

// Grid de espaçamento (base 8px)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

// PALETA DE CORES - CORES EXATAS DO APP
export const COLORS = {
  // Primary (Laranja)
  primary: '#FFA726',
  primaryLight: 'rgba(255, 167, 38, 0.2)',
  primaryDark: '#F57C00',
  primaryGradient: ['#FFA726', '#FFB74D'] as const,

  // Backgrounds
  background: '#1A1A2E',
  backgroundGradient: ['#1A1A2E', '#3D3D6B', '#4A4A7C'] as const,
  backgroundElevated: 'rgba(26, 26, 46, 0.5)',
  backgroundHighlight: 'rgba(255, 255, 255, 0.1)',
  backgroundMuted: 'rgba(255, 255, 255, 0.05)',

  // Cards
  cardBackground: '#3D405B',
  cardBackgroundDark: '#52364C',
  cardBackgroundLight: '#4A4E69',
  cardGradient: ['rgba(94, 74, 139, 0.30)', 'rgba(123, 107, 168, 0.30)'] as const,
  cardChallengeGradient: ['rgba(222, 47, 36, 0.30)', 'rgba(243, 150, 12, 0.30)'] as const,
  cardBorder: 'rgba(255, 255, 255, 0.2)',

  // Special
  streakBadge: '#4A3F35',
  bottomNav: '#1A1B26',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B4B4C8',
  textTertiary: '#8B8B9E',
  textDisabled: '#5A5A6E',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderActive: '#FFA726',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
} as const;

// Sistema tipográfico
export const TYPOGRAPHY = {
  // Headers
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
  },

  // Body
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    fontFamily: 'Poppins-Regular',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    fontFamily: 'Poppins-Regular',
  },

  // UI elements
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
    fontFamily: 'Poppins-SemiBold',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: 'Poppins-Regular',
  },

  // Stats/Display
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700' as const,
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: 'Poppins-Regular',
  },
} as const;

// Border radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 999,
} as const;

// Tamanhos padrão
export const SIZES = {
  // Touch targets (mínimo 44x44px)
  touchTarget: 44,

  // Botões
  buttonHeight: 56,
  buttonHeightSmall: 48,
  buttonPaddingH: 32,
  buttonPaddingV: 16,

  // Cards
  cardPadding: 24,
  cardPaddingSmall: 16,
  cardGap: 12,
  screenPadding: 24,

  // Navigation
  bottomNavHeight: 80,

  // Icons/Avatars
  avatarSmall: 40,
  avatarMedium: 56,
  avatarLarge: 72,
  avatarXLarge: 96,
  iconBadge: 48,
  iconSmall: 32,
  levelBadgeSmall: 24,

  // Progress bar
  progressBarHeight: 8,
  progressBarHeightLarge: 12,

  // Stat items
  statItemMaxWidth: 80,
} as const;

// Sombras
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
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
} as const;
