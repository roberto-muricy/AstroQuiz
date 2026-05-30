/**
 * AchievementsCard - Card de conquistas
 * Usa Card component para consistência visual
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TrophyIcon, TargetIcon, IconSizes, IconColors } from '@/components/Icons';
import { SPACING, TYPOGRAPHY, COLORS } from '@/constants/design-system';

interface AchievementsCardProps {
  unlockedCount: number;
  totalCount: number;
  onStartPress: () => void;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  unlockedCount,
  totalCount,
  onStartPress,
}) => {
  const { t } = useTranslation();
  const hasAchievements = unlockedCount > 0;

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrophyIcon size={IconSizes.md} color={IconColors.gold} />
          <Text style={styles.title}>{t('achievements.title')}</Text>
        </View>
        <Text style={styles.count}>
          {unlockedCount}/{totalCount}
        </Text>
      </View>

      {/* Empty State ou Lista */}
      {!hasAchievements ? (
        <View style={styles.emptyState}>
          <TargetIcon size={IconSizes.xl} color={IconColors.primary} />
          <Text style={styles.emptyText} numberOfLines={2}>
            {t('stats.unlockAchievements')}
          </Text>
          <Button
            title={t('stats.startQuiz')}
            onPress={onStartPress}
            style={styles.button}
          />
        </View>
      ) : (
        <View style={styles.achievementsList}>
          <Text style={styles.placeholder}>
            Lista de conquistas será implementada
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  count: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  button: {
    marginTop: SPACING.sm,
    minWidth: 200,
    paddingHorizontal: SPACING.xl,
  },
  achievementsList: {
    gap: SPACING.sm,
  },
  placeholder: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
