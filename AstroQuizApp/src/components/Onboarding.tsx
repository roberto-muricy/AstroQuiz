/**
 * Onboarding — apresentação na primeira abertura.
 *
 * Três passos: duas telas de explicação e um holofote sobre o botão de começar.
 *
 * O terceiro passo não é uma tela. Uma terceira tela mostraria o *desenho* de
 * um botão, e o jogador teria que fechá-la e depois procurar o botão de
 * verdade. Aqui o fundo escurece, o botão real fica iluminado e um balão aponta
 * para ele — a pessoa termina a apresentação com o dedo no lugar certo.
 *
 * O recorte do holofote é feito com quatro retângulos ao redor do alvo, e não
 * com máscara: o React Native não tem `mask-image`, e quatro Views posicionadas
 * fazem o mesmo trabalho sem dependência nova.
 *
 * Todos os números exibidos vêm das regras do servidor ou do texto traduzido —
 * nenhum está fixo aqui. A maquete original dizia que "nas fases finais a
 * exigência sobe até 85%", o que vinha de um arquivo de regras que nenhuma rota
 * consulta; a exigência é 60% nas 50 fases.
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Star,
  Clock,
  Flame,
  BookOpen,
  Check,
  SkipForward,
  Shield,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SIZES } from '@/constants/design-system';

/** Espessura do contorno luminoso, desenhado para fora do botão. */
const REALCE = 3;

/** Retângulo do botão a destacar, em coordenadas de tela. */
export interface AreaDestaque {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OnboardingProps {
  visivel: boolean;
  /** Onde o botão "Iniciar a viagem" está. Sem isto, o holofote não aparece. */
  areaDoBotao: AreaDestaque | null;
  /** Segundos por pergunta, vindo das regras do servidor. */
  segundosPorPergunta: number;
  /** Quantas perguntas tem uma fase, vindo das regras do servidor. */
  perguntasPorFase: number;
  /** Quantos acertos são necessários para passar. */
  acertosParaPassar: number;
  onFechar: () => void;
}

const CorIcone = COLORS.primary;

export const Onboarding: React.FC<OnboardingProps> = ({
  visivel,
  areaDoBotao,
  segundosPorPergunta,
  perguntasPorFase,
  acertosParaPassar,
  onFechar,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [passo, setPasso] = useState(0);

  const avancar = () => {
    // Sem a área do botão medida, o holofote não teria onde pousar — melhor
    // encerrar na segunda tela do que desenhar um recorte no lugar errado.
    if (passo === 1 && !areaDoBotao) return onFechar();
    if (passo >= 2) return onFechar();
    setPasso(passo + 1);
  };

  const Regra = ({
    Icone,
    titulo,
    texto,
  }: {
    Icone: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
    titulo: string;
    texto: string;
  }) => (
    <View style={styles.regra}>
      <View style={styles.regraIcone}>
        <Icone size={19} color={CorIcone} strokeWidth={2} />
      </View>
      <View style={styles.regraTexto}>
        <Text style={styles.regraTitulo}>{titulo}</Text>
        <Text style={styles.regraCorpo}>{texto}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visivel} animationType="fade" transparent onRequestClose={onFechar}>
      {passo < 2 ? (
        <View style={[styles.tela, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + SPACING.lg }]}>
          <Pressable style={styles.pular} onPress={onFechar} hitSlop={12}>
            <Text style={styles.pularTexto}>{t('onboarding.skip')}</Text>
          </Pressable>

          <View style={styles.passos}>
            <View style={[styles.passo, styles.passoAtivo]} />
            <View style={[styles.passo, passo >= 1 && styles.passoAtivo]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.corpo}>
            {passo === 0 ? (
              <>
                <Text style={styles.titulo}>{t('onboarding.score.title')}</Text>
                <Text style={styles.subtitulo}>{t('onboarding.score.subtitle')}</Text>

                <Regra Icone={Star} titulo={t('onboarding.score.base.title')} texto={t('onboarding.score.base.body')} />
                <Regra Icone={Clock} titulo={t('onboarding.score.speed.title')} texto={t('onboarding.score.speed.body')} />
                <Regra Icone={Flame} titulo={t('onboarding.score.streak.title')} texto={t('onboarding.score.streak.body')} />

                {/* A conta escrita na mesma linguagem do banner de acerto do
                    jogo: "20 base × 2 rapidez + 20 sequência". */}
                <View style={styles.exemplo}>
                  <Text style={styles.exemploRotulo}>{t('onboarding.score.exampleLabel')}</Text>
                  <Text style={styles.exemploTexto}>{t('onboarding.score.exampleBody')}</Text>
                  <Text style={styles.exemploConta}>{t('onboarding.score.exampleMath')}</Text>
                  <Text style={styles.exemploTotal}>{t('onboarding.score.exampleTotal')}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.titulo}>{t('onboarding.phase.title')}</Text>
                <Text style={styles.subtitulo}>{t('onboarding.phase.subtitle')}</Text>

                <Regra
                  Icone={BookOpen}
                  titulo={t('onboarding.phase.questions.title', { count: perguntasPorFase, seconds: segundosPorPergunta })}
                  texto={t('onboarding.phase.questions.body')}
                />
                <Regra
                  Icone={Check}
                  titulo={t('onboarding.phase.pass.title', { count: acertosParaPassar, total: perguntasPorFase })}
                  texto={t('onboarding.phase.pass.body')}
                />
                <Regra Icone={SkipForward} titulo={t('onboarding.phase.skip.title')} texto={t('onboarding.phase.skip.body')} />
                <Regra Icone={Shield} titulo={t('onboarding.phase.noPenalty.title')} texto={t('onboarding.phase.noPenalty.body')} />
              </>
            )}
          </ScrollView>

          <Pressable style={styles.botao} onPress={avancar}>
            <Text style={styles.botaoTexto}>
              {passo === 0 ? t('common.continue') : t('onboarding.gotIt')}
            </Text>
          </Pressable>
        </View>
      ) : (
        /* Passo 3: holofote. Quatro retangulos escuros ao redor do botao real
           deixam so ele iluminado; um toque em qualquer lugar encerra. */
        areaDoBotao && (
          <Pressable style={styles.holofoteRaiz} onPress={onFechar}>
            {/* As sombras encostam EXATAMENTE nas bordas do botao. Com folga, o
                cartao por tras aparecia sem escurecer nas laterais e virava dois
                blocos azulados ao lado do botao. */}
            <View style={[styles.sombra, { top: 0, left: 0, right: 0, height: areaDoBotao.y }]} />
            <View style={[styles.sombra, { top: areaDoBotao.y + areaDoBotao.height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.sombra, { top: areaDoBotao.y, left: 0, width: areaDoBotao.x, height: areaDoBotao.height }]} />
            <View style={[styles.sombra, { top: areaDoBotao.y, left: areaDoBotao.x + areaDoBotao.width, right: 0, height: areaDoBotao.height }]} />

            {/* Contorno luminoso por fora do botao. Fica sobre a area escurecida,
                nao sobre o cartao, entao nao reabre a folga clara. */}
            <View
              style={[
                styles.realce,
                {
                  top: areaDoBotao.y - REALCE,
                  left: areaDoBotao.x - REALCE,
                  width: areaDoBotao.width + REALCE * 2,
                  height: areaDoBotao.height + REALCE * 2,
                },
              ]}
              pointerEvents="none"
            />

            <View style={[styles.balao, { top: areaDoBotao.y + areaDoBotao.height + 20 }]} pointerEvents="none">
              <View style={styles.balaoBico} />
              <Text style={styles.balaoTitulo}>{t('onboarding.spotlight.title')}</Text>
              <Text style={styles.balaoTexto}>{t('onboarding.spotlight.body')}</Text>
            </View>
          </Pressable>
        )
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.screenPadding,
  },
  pular: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
  },
  pularTexto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    fontFamily: 'Poppins-Medium',
  },
  passos: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  passo: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  passoAtivo: {
    backgroundColor: COLORS.primary,
  },
  corpo: {
    paddingBottom: SPACING.lg,
  },
  titulo: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitulo: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  regra: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  regraIcone: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.34)',
  },
  regraTexto: {
    flex: 1,
  },
  regraTitulo: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  regraCorpo: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  exemplo: {
    padding: SIZES.screenPadding,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
    marginTop: SPACING.xs,
  },
  exemploRotulo: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: COLORS.success,
    fontFamily: 'Poppins-Medium',
  },
  exemploTexto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  exemploConta: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 2,
  },
  exemploTotal: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
    marginTop: SPACING.sm,
  },
  botao: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  botaoTexto: {
    ...TYPOGRAPHY.body,
    // Escuro sobre o laranja: branco sobre #FFA726 fica em 2,1:1, abaixo do
    // minimo de 4,5:1 da WCAG.
    color: '#1A1A2E',
    fontFamily: 'Poppins-Bold',
  },
  holofoteRaiz: {
    flex: 1,
  },
  sombra: {
    position: 'absolute',
    backgroundColor: 'rgba(10, 8, 24, 0.86)',
  },
  realce: {
    position: 'absolute',
    borderRadius: RADIUS.md + REALCE,
    borderWidth: REALCE,
    borderColor: COLORS.primary,
  },
  balao: {
    position: 'absolute',
    left: SIZES.screenPadding,
    right: SIZES.screenPadding,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.40)',
    padding: SIZES.screenPadding,
  },
  balaoBico: {
    position: 'absolute',
    top: -7,
    left: 42,
    width: 12,
    height: 12,
    backgroundColor: COLORS.cardBackgroundLight,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.40)',
    transform: [{ rotate: '45deg' }],
  },
  balaoTitulo: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 3,
  },
  balaoTexto: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
});
