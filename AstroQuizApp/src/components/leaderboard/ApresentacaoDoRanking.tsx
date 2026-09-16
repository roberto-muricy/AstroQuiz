/**
 * A primeira visita de quem tem conta.
 *
 * O jogador entra no ranking com um nome sorteado, e precisa saber disso antes
 * de aparecer para os outros — inclusive que pode não aparecer. Aparecer é o
 * padrão, então a saída tem que estar aqui, na mesma tela, e não escondida no
 * perfil.
 *
 * Escolher apelido fica no perfil, com o teclado e a validação; aqui só o que
 * dá para resolver com um toque.
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dices } from 'lucide-react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { ConfiguracoesDoJogador } from '@/services/leaderboardService';
import { IdiomaSuportado, nomeDeExibicao } from '@/utils/pseudonimo';

interface Props {
  configuracoes: ConfiguracoesDoJogador;
  idioma: IdiomaSuportado;
  sorteando: boolean;
  aoSortearOutro: () => void;
  aoContinuar: () => void;
  aoNaoQuererAparecer: () => void;
}

export const ApresentacaoDoRanking: React.FC<Props> = ({
  configuracoes,
  idioma,
  sorteando,
  aoSortearOutro,
  aoContinuar,
  aoNaoQuererAparecer,
}) => {
  const { t } = useTranslation();

  const nome = nomeDeExibicao(configuracoes.name, idioma);
  const comoApareco = configuracoes.country
    ? `${nome} · ${configuracoes.country}`
    : nome;

  return (
    <View style={styles.cartao} testID="apresentacao-do-ranking">
      <Text style={styles.titulo}>{t('leaderboard.intro.title')}</Text>

      <Text style={styles.nome} numberOfLines={2}>
        {comoApareco}
      </Text>
      <Text style={styles.explicacao}>{t('leaderboard.intro.explanation')}</Text>

      <View style={styles.acoes}>
        <Pressable
          onPress={aoSortearOutro}
          disabled={sorteando}
          style={[styles.botaoSecundario, sorteando && styles.ocupado]}
          accessibilityRole="button"
        >
          {sorteando ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              <Dices size={16} color={COLORS.primary} />
              <Text style={styles.textoSecundario}>{t('leaderboard.intro.draw')}</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={aoContinuar} style={styles.botaoPrincipal} accessibilityRole="button">
          <Text style={styles.textoPrincipal}>{t('leaderboard.intro.continue')}</Text>
        </Pressable>
      </View>

      <Pressable onPress={aoNaoQuererAparecer} accessibilityRole="button" hitSlop={SPACING.sm}>
        <Text style={styles.saida}>{t('leaderboard.intro.optOut')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  titulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  nome: {
    ...TYPOGRAPHY.statValue,
    color: COLORS.primary,
  },
  explicacao: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  acoes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  ocupado: {
    opacity: 0.6,
  },
  textoSecundario: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
  botaoPrincipal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  textoPrincipal: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  saida: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
});
