/**
 * Uma linha do ranking.
 *
 * O nome vem em duas formas: apelido escrito pelo jogador, ou nome gerado em
 * chaves que o app monta no idioma de quem está vendo. Quem não escolheu
 * apelido — a maioria, no começo — cai na segunda.
 *
 * O pódio usa ícone em vez do número, e ícone do Lucide em vez de emoji: emoji
 * muda de desenho em cada plataforma e não acompanha o tamanho da fonte.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Crown, Medal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { EntradaDoRanking } from '@/services/leaderboardService';
import { IdiomaSuportado, nomeDeExibicao } from '@/utils/pseudonimo';
import { formatarPontuacao } from '@/utils/classificacao';

export type MetricaDoRanking = 'pontos' | 'fase';

interface Props {
  entrada: EntradaDoRanking;
  idioma: IdiomaSuportado;
  metrica: MetricaDoRanking;
  /** A linha do próprio jogador, destacada na lista e fixada no rodapé. */
  destacada?: boolean;
  /**
   * Toque longo abre a denúncia do nome. Só existe para quem tem conta e para
   * linhas de outras pessoas — e é toque longo, e não toque, para ninguém
   * denunciar alguém tentando rolar a lista.
   */
  aoDenunciar?: () => void;
}

export const LinhaDoRanking: React.FC<Props> = ({
  entrada,
  idioma,
  metrica,
  destacada,
  aoDenunciar,
}) => {
  const { t } = useTranslation();

  const noPodio = entrada.position >= 1 && entrada.position <= 3;
  const corDoPodio = entrada.position === 1 ? COLORS.premium : COLORS.textSecondary;
  const valor =
    metrica === 'fase'
      ? t('leaderboard.phaseValue', { phase: entrada.highestPhase })
      : formatarPontuacao(entrada.score, idioma);

  return (
    <Pressable
      style={[styles.linha, destacada && styles.linhaDestacada]}
      testID={`linha-${entrada.publicId}`}
      onLongPress={aoDenunciar}
      disabled={!aoDenunciar}
      accessibilityRole={aoDenunciar ? 'button' : 'text'}
      accessibilityHint={aoDenunciar ? t('leaderboard.report.hint') : undefined}
    >
      <View style={styles.posicao} testID="posicao">
        {noPodio ? (
          entrada.position === 1 ? (
            <Crown size={20} color={corDoPodio} testID="icone-primeiro" />
          ) : (
            <Medal size={20} color={corDoPodio} testID="icone-podio" />
          )
        ) : (
          <Text style={styles.numeroDaPosicao}>{entrada.position}</Text>
        )}
      </View>

      <Text style={[styles.nome, destacada && styles.nomeDestacado]} numberOfLines={1}>
        {nomeDeExibicao(entrada.name, idioma)}
      </Text>

      {!!entrada.country && (
        <Text style={styles.pais} testID="pais">
          {entrada.country}
        </Text>
      )}

      <Text style={styles.valor} testID="valor">
        {valor}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  linhaDestacada: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  posicao: {
    width: 28,
    alignItems: 'center',
  },
  numeroDaPosicao: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    // Números alinham em coluna, e não dançam conforme o dígito.
    fontVariant: ['tabular-nums'],
  },
  nome: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  nomeDestacado: {
    fontWeight: '600',
  },
  pais: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  valor: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
