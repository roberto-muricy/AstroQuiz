/**
 * StatDisplay Component
 * Exibe valor + label (ex: "0%" + "No nível")
 *
 * Mantém estilo visual atual da HomeScreen
 * Corrigido: Alinhamento e quebra de linha consistente
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, COLORS, SPACING, SIZES } from '../../constants/design-system';

interface StatDisplayProps {
  value: string;
  label: string;
  maxWidth?: number;
}

export const StatDisplay: React.FC<StatDisplayProps> = ({
  value,
  label,
  maxWidth = SIZES.statItemMaxWidth,
}) => {
  return (
    <View style={[styles.container, { maxWidth }]}>
      <Text
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      <Text
        style={styles.label}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.xs,
  },
  value: {
    ...TYPOGRAPHY.statValue,
    color: COLORS.primary,
    textAlign: 'center',
  },
  label: {
    ...TYPOGRAPHY.statLabel,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
