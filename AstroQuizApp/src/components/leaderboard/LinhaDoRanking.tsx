/**
 * Uma linha do ranking.
 *
 * O nome vem em duas formas: apelido escrito pelo jogador, ou nome gerado em
 * chaves que o app monta no idioma de quem está vendo. Quem não escolheu
 * apelido — a maioria, no começo — cai na segunda.
 *
 * A coluna da esquerda mostra a colocação em TODAS as linhas. Antes ela trocava
 * de significado no meio da lista — ícone nas três primeiras, número da quarta
 * em diante — e quem olhava de relance não sabia se o pódio estava em primeiro,
 * segundo ou terceiro. Agora o número fica sempre, e o pódio é o disco colorido
 * em volta dele: distingue sem esconder.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { EntradaDoRanking } from '@/services/leaderboardService';
import { IdiomaSuportado, nomeDeExibicao } from '@/utils/pseudonimo';
import { formatarPontuacao } from '@/utils/classificacao';
import { bandeira, nomeDoPais } from '@/utils/pais';

/** Ouro, prata e bronze. Índice = colocação. */
const CORES_DO_PODIO: Record<number, { texto: string; fundo: string }> = {
  1: { texto: COLORS.podiumFirst, fundo: COLORS.podiumFirstSurface },
  2: { texto: COLORS.podiumSecond, fundo: COLORS.podiumSecondSurface },
  3: { texto: COLORS.podiumThird, fundo: COLORS.podiumThirdSurface },
};

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

  const podio = CORES_DO_PODIO[entrada.position];
  // Sem bandeira (código inválido ou fonte sem o glifo) a sigla continua valendo.
  const simboloDoPais = entrada.country ? bandeira(entrada.country) : '';
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
      <View
        style={[styles.posicao, !!podio && { backgroundColor: podio.fundo }]}
        testID="posicao"
      >
        <Text style={[styles.numeroDaPosicao, !!podio && { color: podio.texto }]}>
          {entrada.position}
        </Text>
      </View>

      <Text style={[styles.nome, destacada && styles.nomeDestacado]} numberOfLines={1}>
        {nomeDeExibicao(entrada.name, idioma)}
      </Text>

      {!!entrada.country && (
        <Text
          style={simboloDoPais ? styles.bandeira : styles.pais}
          testID="pais"
          // A bandeira sozinha é lida como "bandeira do Brasil" ou pior; o nome
          // do país é o que a pessoa precisa ouvir.
          accessibilityLabel={nomeDoPais(entrada.country, idioma)}
        >
          {simboloDoPais || entrada.country}
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
    height: 28,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroDaPosicao: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
    // Números alinham em coluna, e não dançam conforme o dígito.
    fontVariant: ['tabular-nums'],
  },
  bandeira: {
    // A bandeira é emoji: o tamanho vem da fonte, e não de um ícone vetorial.
    fontSize: 18,
    lineHeight: 22,
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
