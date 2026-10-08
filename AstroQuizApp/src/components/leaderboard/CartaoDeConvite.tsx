/**
 * O convite para quem está jogando sem conta.
 *
 * Mostra a posição que a pessoa teria com o que já pontuou — número real, vindo
 * do servidor, e não uma promessa vaga. É o único lugar do ranking onde o
 * convidado se vê.
 *
 * Quando o ranking está vazio, o convite fica sem o número: dizer "você seria o
 * 1º" numa lista de zero jogadores seria verdade e mentira ao mesmo tempo.
 *
 * Quem joga sem login já entra no ranking com um nome sorteado (login anônimo).
 * Para essa pessoa o convite não diz "entre para aparecer" — ela já aparece,
 * às vezes em 1º — e sim com que nome, e que entrar é o que deixa escolher o
 * apelido. Até 07/10/2026 o cartão dizia o contrário do que a lista mostrava.
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
  /** Nome com que a pessoa já aparece na lista, quando aparece. */
  nomeNoRanking: string | null;
  idioma: IdiomaSuportado;
  aoEntrar: () => void;
}

export const CartaoDeConvite: React.FC<Props> = ({
  posicaoHipotetica,
  totalDeJogadores,
  nomeNoRanking,
  idioma,
  aoEntrar,
}) => {
  const { t } = useTranslation();
  const temPosicao = !!posicaoHipotetica && totalDeJogadores > 0;

  return (
    <View style={styles.cartao} testID="cartao-de-convite">
      <Text style={styles.titulo}>
        {nomeNoRanking
          ? t('leaderboard.guest.inBoardTitle', { name: nomeNoRanking })
          : t('leaderboard.guest.title')}
      </Text>

      <Text style={styles.texto}>
        {nomeNoRanking
          ? t('leaderboard.guest.inBoardText')
          : temPosicao
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
