/**
 * Aviso para quem desligou "aparecer no ranking".
 *
 * Sem ele, a pessoa abre a lista, não se encontra e conclui que o ranking está
 * quebrado — a causa é uma escolha dela, feita talvez semanas antes. Mostra
 * também a posição que ela teria, que é o argumento honesto para voltar.
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { IdiomaSuportado } from '@/utils/pseudonimo';
import { ordinal } from '@/utils/classificacao';

interface Props {
  /** Posição que teria se voltasse a aparecer. Null quando ainda não pontuou. */
  posicao: number | null;
  idioma: IdiomaSuportado;
  salvando: boolean;
  aoVoltarAAparecer: () => void;
}

export const AvisoDeOculto: React.FC<Props> = ({
  posicao,
  idioma,
  salvando,
  aoVoltarAAparecer,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.cartao} testID="aviso-de-oculto">
      <View style={styles.cabecalho}>
        <EyeOff size={18} color={COLORS.textSecondary} />
        <Text style={styles.titulo}>{t('leaderboard.hidden.title')}</Text>
      </View>

      <Text style={styles.texto}>
        {posicao
          ? t('leaderboard.hidden.withPosition', { position: ordinal(posicao, idioma) })
          : t('leaderboard.hidden.subtitle')}
      </Text>

      <Pressable
        onPress={aoVoltarAAparecer}
        disabled={salvando}
        style={[styles.botao, salvando && styles.botaoOcupado]}
        accessibilityRole="button"
        accessibilityState={{ disabled: salvando }}
      >
        {salvando ? (
          <ActivityIndicator color={COLORS.text} size="small" />
        ) : (
          <Text style={styles.botaoTexto}>{t('leaderboard.hidden.action')}</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: COLORS.backgroundMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  titulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    flex: 1,
  },
  texto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  botao: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  botaoOcupado: {
    opacity: 0.6,
  },
  botaoTexto: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
});
