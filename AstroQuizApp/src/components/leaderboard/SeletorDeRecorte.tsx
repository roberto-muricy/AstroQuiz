/**
 * Seletor de recorte do ranking — Semana | Geral, Mundo | País, Pontos | Fase.
 *
 * Um componente só para os três: são a mesma pergunta ("qual destes?") e ficam
 * empilhados na mesma tela, então precisam ter exatamente a mesma aparência e o
 * mesmo comportamento. Três componentes parecidos divergiriam na primeira
 * mudança de espaçamento.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS, SIZES } from '@/constants/design-system';

export interface OpcaoDeRecorte<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  opcoes: OpcaoDeRecorte<T>[];
  valor: T;
  aoTrocar: (valor: T) => void;
  /** Lido por leitor de tela antes das opções, ex.: "Período". */
  rotuloDoGrupo?: string;
}

export function SeletorDeRecorte<T extends string>({
  opcoes,
  valor,
  aoTrocar,
  rotuloDoGrupo,
}: Props<T>) {
  return (
    <View style={styles.grupo} accessibilityRole="tablist" accessibilityLabel={rotuloDoGrupo}>
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoTrocar(opcao.valor)}
            style={[styles.opcao, ativa && styles.opcaoAtiva]}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={opcao.rotulo}
            // Toda a área da opção responde ao toque, e não só o texto.
            hitSlop={SPACING.xs}
          >
            <Text style={[styles.rotulo, ativa && styles.rotuloAtivo]} numberOfLines={1}>
              {opcao.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: RADIUS.round,
    padding: SPACING.xs / 2,
    gap: SPACING.xs / 2,
  },
  opcao: {
    flex: 1,
    minHeight: SIZES.touchTarget - SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  opcaoAtiva: {
    backgroundColor: COLORS.primary,
  },
  rotulo: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rotuloAtivo: {
    color: COLORS.background,
  },
});
