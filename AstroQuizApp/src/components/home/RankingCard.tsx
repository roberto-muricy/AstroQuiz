/**
 * RankingCard Component
 * Card de ranking/leaderboard na Home
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, TYPOGRAPHY, COLORS, RADIUS, SIZES } from '@/constants/design-system';

interface RankingPlayer {
  position: number;
  name: string;
  xp: number;
  isCurrentUser?: boolean;
}

interface RankingCardProps {
  title?: string;
  topPlayers: RankingPlayer[];
  currentUserPosition?: number;
  onViewAll: () => void;
}

const POSITION_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export const RankingCard: React.FC<RankingCardProps> = ({
  title = 'Ranking',
  topPlayers,
  currentUserPosition,
  onViewAll,
}) => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      {/* Players list */}
      <View style={styles.playersList}>
        {topPlayers.slice(0, 3).map((player) => (
          <View
            key={player.position}
            style={[
              styles.playerRow,
              player.isCurrentUser && styles.playerRowHighlight,
            ]}
          >
            <View style={styles.positionContainer}>
              {POSITION_MEDALS[player.position] ? (
                <Text style={styles.medal}>{POSITION_MEDALS[player.position]}</Text>
              ) : (
                <Text style={styles.positionText}>{player.position}º</Text>
              )}
            </View>
            <Text
              style={[styles.playerName, player.isCurrentUser && styles.playerNameHighlight]}
              numberOfLines={1}
            >
              {player.name}
            </Text>
            <Text style={styles.playerXP}>{player.xp.toLocaleString()} XP</Text>
          </View>
        ))}
      </View>

      {/* Current user position (if not in top 3) */}
      {currentUserPosition && currentUserPosition > 3 && (
        <View style={styles.currentUserSection}>
          <Text style={styles.dotsText}>···</Text>
          <View style={[styles.playerRow, styles.playerRowHighlight]}>
            <View style={styles.positionContainer}>
              <Text style={styles.positionText}>{currentUserPosition}º</Text>
            </View>
            <Text style={[styles.playerName, styles.playerNameHighlight]} numberOfLines={1}>
              Você
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SIZES.cardPadding,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  viewAllText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
  },
  playersList: {
    gap: SPACING.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  playerRowHighlight: {
    backgroundColor: COLORS.primaryLight,
  },
  positionContainer: {
    width: 32,
    alignItems: 'center',
  },
  medal: {
    fontSize: 20,
  },
  positionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  playerName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  playerNameHighlight: {
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  playerXP: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  currentUserSection: {
    gap: SPACING.xs,
  },
  dotsText: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 16,
    letterSpacing: 4,
  },
});
