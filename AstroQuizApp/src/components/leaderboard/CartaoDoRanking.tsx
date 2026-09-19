/**
 * O cartão do ranking na Início.
 *
 * Mostra a posição da semana de quem tem conta, e a posição que o convidado
 * teria — é o mesmo argumento da tela do ranking, só que no caminho de quem não
 * foi até lá.
 *
 * Abre com o que estiver salvo e atualiza em silêncio: é um cartão secundário
 * numa tela que precisa aparecer rápido, e nunca deve segurar a Início por
 * causa de uma requisição.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronRight } from 'lucide-react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import leaderboardService, { PaginaDoRanking } from '@/services/leaderboardService';
import { LeaderboardStorage } from '@/utils/leaderboardStorage';
import { ProgressStorage } from '@/utils/progressStorage';
import { IdiomaSuportado } from '@/utils/pseudonimo';
import { ordinal } from '@/utils/classificacao';

interface Props {
  idioma: IdiomaSuportado;
  aoAbrir: () => void;
}

export const CartaoDoRanking: React.FC<Props> = ({ idioma, aoAbrir }) => {
  const { t } = useTranslation();
  const [pagina, setPagina] = useState<PaginaDoRanking | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      const carregar = async () => {
        const salva = await LeaderboardStorage.ler<PaginaDoRanking>('weekly', null);
        if (vivo && salva) setPagina(salva.pagina);

        try {
          const pontuacaoLocal = await ProgressStorage.pontuacaoTotalDoServidor();
          const nova = await leaderboardService.buscarPagina({
            recorte: 'weekly',
            tamanho: 10,
            pontuacaoLocal,
          });
          if (!vivo) return;
          setPagina(nova);
          await LeaderboardStorage.guardar('weekly', null, nova);
        } catch {
          // Sem rede: fica o que estava salvo, ou o convite genérico.
        }
      };

      carregar();
      return () => {
        vivo = false;
      };
    }, []),
  );

  const eu = pagina?.me ?? null;
  const hipotetica = pagina?.hypotheticalPosition ?? null;
  const temGente = (pagina?.totalPlayers ?? 0) > 0;

  const destaque = eu
    ? ordinal(eu.position, idioma)
    : hipotetica && temGente
      ? ordinal(hipotetica, idioma)
      : null;

  const legenda = eu
    ? // `count` e não `total`: é o nome que o i18next usa para escolher entre
      // singular e plural. Com `total`, um jogador virava "de 1 jogadores".
      t('leaderboard.home.yours', { count: pagina?.totalPlayers ?? 0 })
    : hipotetica && temGente
      ? t('leaderboard.home.guest')
      : temGente
        ? // Tem gente na semana, mas quem abre ainda não tem pontos: o app só
          // manda a pontuação ao servidor quando ela passa de zero, então não
          // há posição para mostrar. Antes caía em "Ninguém pontuou nesta
          // semana ainda" — falso, e era a primeira coisa que todo usuário
          // novo lia na Início.
          t('leaderboard.home.guestNoScore', { count: pagina?.totalPlayers ?? 0 })
        : t('leaderboard.home.empty');

  return (
    <Pressable
      onPress={aoAbrir}
      style={styles.cartao}
      accessibilityRole="button"
      accessibilityLabel={t('leaderboard.home.title')}
      testID="cartao-do-ranking"
    >
      <View style={styles.selo}>
        {destaque ? (
          <Text style={styles.posicao} numberOfLines={1}>
            {destaque}
          </Text>
        ) : (
          <Trophy size={20} color={COLORS.background} />
        )}
      </View>

      <View style={styles.conteudo}>
        <Text style={styles.titulo}>{t('leaderboard.home.title')}</Text>
        <Text style={styles.legenda} numberOfLines={2}>
          {legenda}
        </Text>
      </View>

      <ChevronRight size={20} color={COLORS.textTertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selo: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: SPACING.sm,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicao: {
    ...TYPOGRAPHY.h3,
    color: COLORS.background,
    fontVariant: ['tabular-nums'],
  },
  conteudo: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '700',
  },
  legenda: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
});
