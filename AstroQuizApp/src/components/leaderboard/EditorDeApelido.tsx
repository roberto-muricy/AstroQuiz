/**
 * Edição do apelido.
 *
 * A conferência de formato acontece enquanto a pessoa digita — tamanho,
 * caracteres, quantidade de letras —, mas quem decide é o servidor: o filtro de
 * palavras e os nomes reservados só existem lá. Por isso as mensagens de erro
 * daqui e as de lá usam os mesmos nomes de motivo: a tela tem uma frase por
 * motivo, venha de onde vier.
 *
 * Limpar o apelido devolve o nome gerado, e não deixa o jogador sem nome.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { SPACING, TYPOGRAPHY, COLORS, RADIUS } from '@/constants/design-system';
import {
  validarApelidoLocalmente,
  caracteresRestantes,
  TAMANHO_MAXIMO,
} from '@/utils/apelido';

interface Props {
  visivel: boolean;
  /** O apelido atual, ou null para quem usa o nome gerado. */
  apelidoAtual: string | null;
  /** Quando a próxima troca fica liberada, vindo do servidor. */
  proximaTrocaEm: string | null;
  salvando: boolean;
  /** Motivo devolvido pelo servidor na última tentativa. */
  erroDoServidor: string | null;
  idioma: string;
  aoSalvar: (apelido: string) => void;
  aoLimpar: () => void;
  aoFechar: () => void;
}

export const EditorDeApelido: React.FC<Props> = ({
  visivel,
  apelidoAtual,
  proximaTrocaEm,
  salvando,
  erroDoServidor,
  idioma,
  aoSalvar,
  aoLimpar,
  aoFechar,
}) => {
  const { t } = useTranslation();
  const [texto, setTexto] = useState(apelidoAtual ?? '');
  /**
   * O erro de formato só aparece depois de a pessoa digitar.
   *
   * Sem isso, quem não tem apelido abre o editor e recebe de cara "Curto
   * demais: use pelo menos 3 caracteres." num campo vazio — como se já tivesse
   * errado antes de escrever.
   */
  const [mexeu, setMexeu] = useState(false);

  // Reabrir o editor recomeça do apelido atual, e não do que foi digitado antes.
  useEffect(() => {
    if (visivel) {
      setTexto(apelidoAtual ?? '');
      setMexeu(false);
    }
  }, [visivel, apelidoAtual]);

  const local = validarApelidoLocalmente(texto);
  const mudou = (local.apelido ?? '') !== (apelidoAtual ?? '');
  const podeSalvar = local.ok && mudou && !salvando;

  // Erro do servidor só enquanto o texto não muda: depois de editar, a pessoa
  // está tentando outra coisa e a mensagem antiga só atrapalha.
  const motivo = local.ok ? erroDoServidor : mexeu ? local.motivo : null;
  const restantes = caracteresRestantes(texto);

  const bloqueadoAte =
    proximaTrocaEm && new Date(proximaTrocaEm) > new Date()
      ? new Date(proximaTrocaEm).toLocaleDateString(idioma, {
          day: 'numeric',
          month: 'long',
        })
      : null;

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View style={styles.cartao}>
          <Text style={styles.titulo}>{t('leaderboard.profile.nickname.title')}</Text>
          <Text style={styles.explicacao}>{t('leaderboard.profile.nickname.explanation')}</Text>

          <TextInput
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              setMexeu(true);
            }}
            placeholder={t('leaderboard.profile.nickname.placeholder')}
            placeholderTextColor={COLORS.textTertiary}
            style={[styles.entrada, !!motivo && styles.entradaComErro]}
            maxLength={TAMANHO_MAXIMO + 10}
            autoCorrect={false}
            autoFocus
            accessibilityLabel={t('leaderboard.profile.nickname.title')}
          />

          <View style={styles.rodapeDoCampo}>
            <Text style={[styles.mensagem, !!motivo && styles.mensagemDeErro]} numberOfLines={2}>
              {motivo
                ? t(`leaderboard.profile.nickname.errors.${motivo}`)
                : bloqueadoAte
                  ? t('leaderboard.profile.nickname.nextChange', { date: bloqueadoAte })
                  : ''}
            </Text>
            <Text style={[styles.contador, restantes < 0 && styles.mensagemDeErro]}>
              {restantes}
            </Text>
          </View>

          <View style={styles.acoes}>
            {!!apelidoAtual && (
              <Pressable
                onPress={aoLimpar}
                disabled={salvando}
                style={styles.botaoSecundario}
                accessibilityRole="button"
              >
                <Text style={styles.textoSecundario}>{t('leaderboard.profile.nickname.clear')}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => local.apelido && aoSalvar(local.apelido)}
              disabled={!podeSalvar}
              style={[styles.botaoPrincipal, !podeSalvar && styles.desabilitado]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !podeSalvar }}
            >
              {salvando ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.textoPrincipal}>{t('common.save')}</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={aoFechar} disabled={salvando} accessibilityRole="button">
            <Text style={styles.cancelar}>{t('common.cancel')}</Text>
          </Pressable>
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
  explicacao: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  entrada: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.backgroundMuted,
  },
  entradaComErro: {
    borderColor: COLORS.danger,
  },
  rodapeDoCampo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    minHeight: 20,
  },
  mensagem: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    flex: 1,
  },
  mensagemDeErro: {
    color: COLORS.danger,
  },
  contador: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  acoes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  botaoSecundario: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  textoSecundario: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
  botaoPrincipal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  desabilitado: {
    opacity: 0.4,
  },
  textoPrincipal: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  cancelar: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
