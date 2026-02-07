/**
 * RankBadge Component
 * Exibe o badge/ícone do rank do jogador
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, TYPOGRAPHY, COLORS, SIZES, RADIUS } from '@/constants/design-system';
import { RankData } from '@/constants/ranks';
import {
  Sparkles,
  Rocket,
  BookOpen,
  Medal,
  Telescope,
  Swords,
  Compass,
  Target,
  Shield,
  Crown,
} from 'lucide-react-native';

// Mapeamento de ícone string para componente Lucide
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  sparkles: Sparkles,
  rocket: Rocket,
  'book-open': BookOpen,
  medal: Medal,
  telescope: Telescope,
  swords: Swords,
  compass: Compass,
  target: Target,
  shield: Shield,
  crown: Crown,
};

interface RankBadgeProps {
  rank: RankData;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showLabel?: boolean;
  showLevel?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP = {
  small: SIZES.avatarSmall,
  medium: SIZES.avatarMedium,
  large: SIZES.avatarLarge,
  xlarge: SIZES.avatarXLarge,
};

const ICON_SIZE_MAP = {
  small: 20,
  medium: 28,
  large: 36,
  xlarge: 48,
};

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 'medium',
  showLabel = false,
  showLevel = false,
  style,
}) => {
  const badgeSize = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];

  // Obter o componente do ícone
  const IconComponent = ICON_MAP[rank.icon] || Sparkles;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: `${rank.color}20`,
            borderColor: rank.color,
          },
        ]}
      >
        <IconComponent size={iconSize} color={rank.color} />
      </View>

      {showLevel && (
        <View style={[styles.levelBadge, { backgroundColor: rank.color }]}>
          <Text style={styles.levelText}>{rank.level}</Text>
        </View>
      )}

      {showLabel && (
        <Text style={styles.label} numberOfLines={1}>
          {rank.displayName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  levelText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
