/**
 * PhaseCountdown - contagem regressiva de 3 segundos ao abrir uma fase.
 *
 * Existe por dois motivos, nesta ordem:
 *
 * 1. Separa o toque do cronômetro. Sem ela a primeira pergunta aparece com o
 *    tempo já correndo, e o jogador perde alguns segundos só entendendo a tela.
 * 2. Cobre a abertura da sessão na rede. A pergunta é buscada em paralelo; se
 *    ela demorar mais que os 3 s, a contagem não some — o anel passa a girar e
 *    "Preparando…" continua. A tela nunca sai antes da pergunta existir.
 *
 * A recíproca também vale: se a pergunta chegar em 200 ms, os 3 s ainda são
 * cumpridos. A contagem é uma promessa ao jogador, não um indicador de carga.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/design-system';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SEGUNDOS = 3;
const RAIO = 64;
const ESPESSURA = 9;
const TAMANHO = (RAIO + ESPESSURA) * 2;
const PERIMETRO = 2 * Math.PI * RAIO;

interface PhaseCountdownProps {
  phaseNumber: number;
  /** Quantas perguntas a fase tem. Vem das regras do servidor. */
  totalQuestions: number;
  /** Segundos por pergunta. Vem das regras do servidor. */
  secondsPerQuestion: number;
  /** A primeira pergunta já chegou da rede? */
  pronto: boolean;
  /** Chamado uma única vez, quando os 3 s terminaram E a pergunta já existe. */
  onFinish: () => void;
}

export const PhaseCountdown: React.FC<PhaseCountdownProps> = ({
  phaseNumber,
  totalQuestions,
  secondsPerQuestion,
  pronto,
  onFinish,
}) => {
  const { t } = useTranslation();
  const [restante, setRestante] = useState(SEGUNDOS);
  const [terminou, setTerminou] = useState(false);

  const progresso = useRef(new Animated.Value(0)).current;
  const giro = useRef(new Animated.Value(0)).current;
  // Sem isto, um re-render depois de terminado chamaria onFinish de novo e a
  // primeira pergunta entraria duas vezes na pilha de navegação.
  const jaAvisouRef = useRef(false);

  // Anel esvaziando ao longo dos 3 s.
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: 1,
      duration: SEGUNDOS * 1000,
      easing: Easing.linear,
      // strokeDashoffset não é uma prop nativa: precisa passar pelo JS.
      useNativeDriver: false,
    }).start();

    const intervalo = setInterval(() => {
      setRestante(v => (v > 1 ? v - 1 : 1));
    }, 1000);

    const fim = setTimeout(() => setTerminou(true), SEGUNDOS * 1000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(fim);
    };
  }, [progresso]);

  // Espera pela rede: o anel gira em vez de ficar parado num círculo vazio.
  useEffect(() => {
    if (!terminou || pronto) return;
    const laco = Animated.loop(
      Animated.timing(giro, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    laco.start();
    return () => laco.stop();
  }, [terminou, pronto, giro]);

  useEffect(() => {
    if (terminou && pronto && !jaAvisouRef.current) {
      jaAvisouRef.current = true;
      onFinish();
    }
  }, [terminou, pronto, onFinish]);

  const offset = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PERIMETRO],
  });

  const rotacao = giro.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const esperandoRede = terminou && !pronto;

  return (
    <View style={styles.container}>
      <Text style={styles.faseRotulo}>{t('quiz.phase')}</Text>
      <Text style={styles.faseNumero}>{phaseNumber}</Text>

      <Animated.View
        style={[
          styles.anel,
          esperandoRede && { transform: [{ rotate: rotacao }] },
        ]}
      >
        <Svg width={TAMANHO} height={TAMANHO}>
          <Circle
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            r={RAIO}
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth={ESPESSURA}
            fill="none"
          />
          <AnimatedCircle
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            r={RAIO}
            stroke={COLORS.primary}
            strokeWidth={ESPESSURA}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={PERIMETRO}
            strokeDashoffset={esperandoRede ? PERIMETRO * 0.75 : offset}
            // Começa no topo, e não à direita.
            transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}
          />
        </Svg>

        {/* O dígito não gira junto com o anel na espera — some. */}
        {!esperandoRede && (
          <View style={styles.anelCentro} pointerEvents="none">
            <Text style={styles.anelNumero}>{restante}</Text>
          </View>
        )}
      </Animated.View>

      <Text style={styles.preparando}>{t('quiz.preparing')}</Text>

      <View style={styles.numeros}>
        <View style={styles.numero}>
          <Text style={styles.numeroValor}>{totalQuestions}</Text>
          <Text style={styles.numeroRotulo}>{t('quiz.questionsWord')}</Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.numero}>
          <Text style={styles.numeroValor}>{secondsPerQuestion}s</Text>
          <Text style={styles.numeroRotulo}>{t('quiz.eachWord')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faseRotulo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-Medium',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  faseNumero: {
    fontSize: 40,
    lineHeight: 46,
    color: COLORS.text,
    fontFamily: 'Poppins-Bold',
  },
  anel: {
    width: TAMANHO,
    height: TAMANHO,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anelCentro: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anelNumero: {
    fontSize: 54,
    lineHeight: 62,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  preparando: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  numeros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.lg,
  },
  numero: {
    alignItems: 'center',
  },
  numeroValor: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontFamily: 'Poppins-Bold',
  },
  numeroRotulo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  separador: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
  },
});
