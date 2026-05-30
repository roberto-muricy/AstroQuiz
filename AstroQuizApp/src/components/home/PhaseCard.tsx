import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY, COLORS, RADIUS, SIZES } from '@/constants/design-system';

interface PhaseCardProps {
  phaseNumber: number;
  isLocked: boolean;
  progress?: { completed: number; total: number };
  onPress?: () => void;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({
  phaseNumber,
  isLocked,
  progress,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, !isLocked && styles.cardActive]}
      onPress={onPress}
      disabled={isLocked}
    >
      {/* Number Badge */}
      <View style={styles.phaseNumber}>
        <Text style={styles.phaseNumberText}>{phaseNumber}</Text>
      </View>

      {/* Título */}
      <Text style={styles.phaseTitle}>Fase {phaseNumber}</Text>

      {/* Status */}
      <Text style={styles.phaseStatus}>
        {isLocked ? 'Bloqueado' : 'Disponível'}
      </Text>

      {!isLocked && progress && (
        <>
          {/* Progress text */}
          <Text style={styles.progress}>
            {progress.completed}/{progress.total}
          </Text>

          {/* XP badge */}
          <Text style={styles.xp}>0xp</Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(progress.completed / progress.total) * 100}%` }
              ]}
            />
          </View>

          {/* Stars */}
          <View style={styles.starsContainer}>
            {[0, 1, 2].map((i) => (
              <Text key={i} style={styles.star}>
                {progress.completed > i * 3 ? '⭐' : '☆'}
              </Text>
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonIcon}>▶</Text>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}

      {isLocked && (
        <>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText} numberOfLines={2}>
            Bloqueado
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
    alignItems: 'center',
    opacity: 0.5,
  },
  cardActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  phaseNumber: {
    width: SIZES.avatarMedium,
    height: SIZES.avatarMedium,
    borderRadius: SIZES.avatarMedium / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  phaseNumberText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  phaseTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontSize: 16,
  },
  phaseStatus: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  progress: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  xp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 11,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginVertical: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  star: {
    fontSize: 18,
  },
  button: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    width: '100%',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  buttonIcon: {
    fontSize: 12,
    color: COLORS.text,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    fontSize: 13,
  },
  lockIcon: {
    fontSize: 32,
    marginVertical: SPACING.md,
  },
  lockedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontSize: 11,
  },
});
