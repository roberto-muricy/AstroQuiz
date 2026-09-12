/**
 * AchievementsCard - Card de conquistas
 *
 * O corpo deste cartão era a frase fixa "Lista de conquistas será
 * implementada" — em português, para jogadores de qualquer idioma —, embaixo
 * de um título que saía como `achievements.title` porque a chave nunca
 * existiu em nenhum idioma. E o total era um 6 fixo contra as 5 conquistas
 * que existem de fato: ninguém conseguia fechar 6/6.
 *
 * Agora a lista é real, e o total sai do próprio array.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RankIcon } from '@/components/RankIcon';
import { TrophyIcon, TargetIcon, IconSizes, IconColors } from '@/components/Icons';
import { achievements } from '@/utils/progressionSystem';
import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';

interface AchievementsCardProps {
  /** Ids já desbloqueados — vem de `progress.stats.achievements`. */
  unlockedIds: string[];
  onStartPress: () => void;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  unlockedIds,
  onStartPress,
}) => {
  const { t } = useTranslation();
  const desbloqueadas = new Set(unlockedIds || []);
  const conquistadas = achievements.filter((a) => desbloqueadas.has(a.id)).length;

  // As desbloqueadas primeiro: o cartão abre pelo que a pessoa já ganhou, e as
  // que faltam ficam logo abaixo, que é o motivo de voltar.
  const emOrdem = [...achievements].sort(
    (a, b) => Number(desbloqueadas.has(b.id)) - Number(desbloqueadas.has(a.id))
  );

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrophyIcon size={IconSizes.md} color={IconColors.gold} />
          <Text style={styles.title}>{t('achievements.title')}</Text>
        </View>
        <Text style={styles.count}>
          {conquistadas}/{achievements.length}
        </Text>
      </View>

      {conquistadas === 0 ? (
        <View style={styles.emptyState}>
          <TargetIcon size={IconSizes.xl} color={IconColors.primary} />
          <Text style={styles.emptyText} numberOfLines={2}>
            {t('stats.unlockAchievements')}
          </Text>
          <Button title={t('stats.startQuiz')} onPress={onStartPress} style={styles.button} />
        </View>
      ) : (
        <View style={styles.lista}>
          {emOrdem.map((a) => {
            const ganha = desbloqueadas.has(a.id);
            return (
              <View key={a.id} style={[styles.linha, !ganha && styles.linhaTrancada]}>
                <View style={styles.icone}>
                  <RankIcon
                    name={a.icon}
                    size={IconSizes.md}
                    color={ganha ? IconColors.gold : COLORS.textTertiary}
                    filled={ganha}
                  />
                </View>
                <View style={styles.textos}>
                  <Text style={styles.nome} numberOfLines={1}>
                    {t(a.nomeChave)}
                  </Text>
                  <Text style={styles.descricao} numberOfLines={2}>
                    {t(a.descricaoChave)}
                  </Text>
                </View>
                <Text style={[styles.xp, !ganha && styles.xpTrancado]}>+{a.xpReward}</Text>
              </View>
            );
          })}
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
  lista: {
    gap: SPACING.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  // As que faltam ficam apagadas, nao escondidas: saber o que vem a seguir e
  // metade da graca de uma lista de conquistas.
  linhaTrancada: {
    opacity: 0.45,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundElevated,
  },
  textos: {
    flex: 1,
  },
  nome: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  descricao: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  xp: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  xpTrancado: {
    color: COLORS.textTertiary,
  },
});
