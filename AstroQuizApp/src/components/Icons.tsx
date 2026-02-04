/**
 * Icons - Ícones centralizados do AstroQuiz usando react-native-vector-icons
 * Usando MaterialCommunityIcons que tem ícones espaciais
 */

import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Cores do tema
export const IconColors = {
  primary: '#0FB57E',    // Verde/Teal - sucesso
  secondary: '#FFA726',  // Laranja - destaque, streak
  error: '#DE2F24',      // Vermelho - erro
  white: '#FFFFFF',
  muted: '#9E9E9E',      // Cinza - inativo
  gold: '#FFD700',       // Dourado - conquistas
  purple: '#9C27B0',     // Roxo - especial
};

// Tamanhos padrão
export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

interface IconProps {
  size?: number;
  color?: string;
}

// ============================================
// ÍCONES DO APP
// ============================================

/** 🚀 Foguete - Avatar, Logo, Progresso */
export const RocketIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="rocket-launch" size={size} color={color} />
);

/** 🔥 Fogo - Streak, sequência de acertos */
export const FireIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="fire" size={size} color={color} />
);

/** ⭐ Estrela cheia - Avaliação conquistada */
export const StarFilledIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Icon name="star" size={size} color={color} />
);

/** ☆ Estrela vazia - Avaliação não conquistada */
export const StarEmptyIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <Icon name="star-outline" size={size} color={color} />
);

/** 🎉 Confete - Sucesso, resposta correta, level up */
export const ConfettiIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="check-decagram" size={size} color={color} />
);

/** 🏆 Troféu - Conquistas, resultado perfeito */
export const TrophyIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Icon name="trophy" size={size} color={color} />
);

/** 🌟 Brilho - Resultado ótimo */
export const SparkleIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Icon name="shimmer" size={size} color={color} />
);

/** 👍 Joinha - Resultado bom */
export const ThumbsUpIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Icon name="thumb-up" size={size} color={color} />
);

/** 💪 Força - Incentivo, continuar tentando */
export const StrengthIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="arm-flex" size={size} color={color} />
);

/** ❌ X vermelho - Erros, respostas incorretas */
export const ErrorIcon = ({ size = IconSizes.md, color = IconColors.error }: IconProps) => (
  <Icon name="close-circle" size={size} color={color} />
);

/** ✓ Check verde - Correto, aprovado */
export const CheckIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Icon name="check-circle" size={size} color={color} />
);

/** ✕ X fechar - Botão de fechar/sair */
export const CloseIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Icon name="close" size={size} color={color} />
);

/** 🎯 Alvo - Quiz, começar fase */
export const TargetIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="target" size={size} color={color} />
);

/** 🌙 Lua - Nível iniciante */
export const MoonIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Icon name="moon-waning-crescent" size={size} color={color} />
);

/** 💫 Estrela cadente - Nível mestre */
export const ShootingStarIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Icon name="star-shooting" size={size} color={color} />
);

/** 🔒 Cadeado - Fase bloqueada */
export const LockIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <Icon name="lock" size={size} color={color} />
);

/** 💡 Lâmpada - Explicação, dica */
export const LightbulbIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="lightbulb-on" size={size} color={color} />
);

/** ▶ Play - Continuar, começar */
export const PlayIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Icon name="play" size={size} color={color} />
);

/** 🏅 Medalha - Conquista */
export const MedalIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Icon name="medal" size={size} color={color} />
);

/** ⚡ Raio - Velocidade, bônus */
export const LightningIcon = ({ size = IconSizes.md, color = IconColors.secondary }: IconProps) => (
  <Icon name="lightning-bolt" size={size} color={color} />
);

/** ⏱ Timer - Tempo */
export const TimerIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Icon name="timer-outline" size={size} color={color} />
);

// ============================================
// COMPONENTE DE ESTRELAS (Rating)
// ============================================

interface StarsRatingProps {
  stars: number;
  maxStars?: number;
  size?: number;
}

export const StarsRating = ({ stars, maxStars = 3, size = IconSizes.md }: StarsRatingProps) => (
  <View style={{ flexDirection: 'row' }}>
    {Array.from({ length: maxStars }, (_, i) => (
      i < stars
        ? <StarFilledIcon key={i} size={size} />
        : <StarEmptyIcon key={i} size={size} />
    ))}
  </View>
);
