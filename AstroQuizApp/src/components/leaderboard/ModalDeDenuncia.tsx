/**
 * Denúncia de apelido.
 *
 * O motivo é obrigatório no servidor, então ele é a própria escolha: três
 * botões, sem passo extra de confirmação. Confirmar duas vezes só faria a
 * pessoa desistir de denunciar algo que precisa ser visto.
 *
 * Denunciar não esconde nada sozinho — a mensagem final diz isso, para ninguém
 * ficar esperando um efeito que não vem. O apelido só some quando várias contas
 * diferentes denunciam o mesmo nome.
 */

import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import { MotivoDaDenuncia } from '@/services/leaderboardService';

const MOTIVOS: MotivoDaDenuncia[] = ['offensive', 'impersonation', 'spam'];

interface Props {
  visivel: boolean;
  /** O nome sendo denunciado, para não haver dúvida de qual linha é. */
  nome: string;
  enviando: boolean;
  enviada: boolean;
  aoEnviar: (motivo: MotivoDaDenuncia) => void;
  aoFechar: () => void;
}

export const ModalDeDenuncia: React.FC<Props> = ({
  visivel,
  nome,
  enviando,
  enviada,
  aoEnviar,
  aoFechar,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View style={styles.cartao} testID="modal-de-denuncia">
          {enviada ? (
            <>
              <Text style={styles.titulo}>{t('leaderboard.report.sentTitle')}</Text>
              <Text style={styles.texto}>{t('leaderboard.report.sentMessage')}</Text>
              <Pressable onPress={aoFechar} style={styles.botaoPrincipal} accessibilityRole="button">
                <Text style={styles.textoPrincipal}>{t('leaderboard.report.close')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.titulo}>{t('leaderboard.report.title')}</Text>
              <Text style={styles.nome} numberOfLines={1}>
                {nome}
              </Text>
              <Text style={styles.texto}>{t('leaderboard.report.message')}</Text>

              {enviando ? (
                <ActivityIndicator color={COLORS.primary} style={styles.espera} />
              ) : (
                <View style={styles.motivos}>
                  {MOTIVOS.map((motivo) => (
                    <Pressable
                      key={motivo}
                      onPress={() => aoEnviar(motivo)}
                      style={styles.motivo}
                      accessibilityRole="button"
                    >
                      <Text style={styles.motivoTexto}>
                        {t(`leaderboard.report.reasons.${motivo}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable
                onPress={aoFechar}
                disabled={enviando}
                accessibilityRole="button"
                hitSlop={SPACING.sm}
              >
                <Text style={styles.cancelar}>{t('common.cancel')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  cartao: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  titulo: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  nome: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  texto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  motivos: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  motivo: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.backgroundMuted,
  },
  motivoTexto: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  espera: {
    marginVertical: SPACING.md,
  },
  botaoPrincipal: {
    marginTop: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  textoPrincipal: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  cancelar: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
