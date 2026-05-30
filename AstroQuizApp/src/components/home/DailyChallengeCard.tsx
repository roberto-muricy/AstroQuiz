/**
 * DailyChallengeCard Component
 * Card de desafio diário na Home
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, TYPOGRAPHY, COLORS, RADIUS, SIZES } from '@/constants/design-system';

interface DailyChallengeCardProps {
  title?: string;
  description?: string;
  reward?: number;
  isCompleted?: boolean;
  timeRemaining?: string;
  onPress: () => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  title = 'Desafio Diário',
  description = 'Complete o desafio de hoje e ganhe recompensas extras!',
  reward = 100,
  isCompleted = false,
  timeRemaining,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isCompleted ? '✅' : '🎯'}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          {!isCompleted && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{reward} XP</Text>
            </View>
          )}
          {timeRemaining && !isCompleted && (
            <Text style={styles.timeText}>{timeRemaining}</Text>
          )}
          {isCompleted && (
            <Text style={styles.completedText}>Concluído!</Text>
          )}
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackgroundDark,
    borderRadius: RADIUS.lg,
    padding: SIZES.cardPaddingSmall,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  iconContainer: {
    width: SIZES.iconBadge,
    height: SIZES.iconBadge,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontSize: 16,
  },
  description: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  rewardBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  rewardText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  completedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  arrowContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
});
