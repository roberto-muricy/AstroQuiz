/**
 * O convite para quem está jogando sem conta.
 *
 * Mostra a posição que a pessoa teria com o que já pontuou — número real, vindo
 * do servidor, e não uma promessa vaga. É o único lugar do ranking onde o
 * convidado se vê.
 *
 * Quando o ranking está vazio, o convite fica sem o número: dizer "você seria o
 * 1º" numa lista de zero jogadores seria verdade e mentira ao mesmo tempo.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { IdiomaSuportado } from '@/utils/pseudonimo';
import { ordinal } from '@/utils/classificacao';

interface Props {
  /** Posição que a pontuação guardada no aparelho ocuparia. */
  posicaoHipotetica: number | null;
  totalDeJogadores: number;
  idioma: IdiomaSuportado;
  aoEntrar: () => void;
}

export const CartaoDeConvite: React.FC<Props> = ({
  posicaoHipotetica,
  totalDeJogadores,
  idioma,
  aoEntrar,
}) => {
  const { t } = useTranslation();
  const temPosicao = !!posicaoHipotetica && totalDeJogadores > 0;

  return (
    <View style={styles.cartao} testID="cartao-de-convite">
      <Text style={styles.titulo}>{t('leaderboard.guest.title')}</Text>

      <Text style={styles.texto}>
        {temPosicao
          ? t('leaderboard.guest.hypothetical', {
              position: ordinal(posicaoHipotetica as number, idioma),
            })
          : t('leaderboard.guest.subtitle')}
      </Text>

      <Pressable onPress={aoEntrar} style={styles.botao} accessibilityRole="button">
        <Text style={styles.botaoTexto}>{t('leaderboard.guest.action')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  titulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  texto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  botao: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  botaoTexto: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
});
