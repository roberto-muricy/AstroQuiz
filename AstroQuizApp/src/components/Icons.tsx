/**
 * Icons - Ícones profissionais do AstroQuiz usando Lucide
 * Biblioteca instalada: lucide-react-native
 */

import React from 'react';
import { View } from 'react-native';
import {
  Rocket,
  Flame,
  Star,
  Trophy,
  Sparkles,
  ThumbsUp,
  Dumbbell,
  XCircle,
  CheckCircle,
  X,
  Target,
  Moon,
  Zap,
  Lock,
  Lightbulb,
  Play,
  Medal,
  Timer,
  Volume2,
  VolumeX,
  Vibrate,
  Music,
  Bell,
  BellOff,
  ChevronRight,
  Home,
  BarChart3,
  User,
  Settings,
  LogOut,
  Award,
  Clock,
  Percent,
  HelpCircle,
  Info,
} from 'lucide-react-native';

// Cores do tema
export const IconColors = {
  primary: '#FFA726',      // Laranja - cor principal
  success: '#4CAF50',      // Verde - sucesso
  error: '#DE2F24',        // Vermelho - erro
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.4)',  // Cinza - inativo
  gold: '#FFD700',         // Dourado - conquistas
  purple: '#9C27B0',       // Roxo - especial
};

// Tamanhos padrão
export const IconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 40,
};

interface IconProps {
  size?: number;
  color?: string;
}

// ============================================
// ÍCONES PRINCIPAIS
// ============================================

/** Foguete - Avatar, Logo, Progresso */
export const RocketIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Rocket size={size} color={color} strokeWidth={2} />
);

/** Fogo - Streak, sequência de acertos */
export const FireIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Flame size={size} color={color} strokeWidth={2} />
);

/** Estrela cheia - Avaliação conquistada */
export const StarFilledIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Star size={size} color={color} fill={color} strokeWidth={0} />
);

/** Estrela vazia - Avaliação não conquistada */
export const StarEmptyIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <Star size={size} color={color} strokeWidth={2} />
);

/** Troféu - Conquistas, resultado perfeito */
export const TrophyIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Trophy size={size} color={color} strokeWidth={2} />
);

/** Brilho - Resultado ótimo */
export const SparkleIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Sparkles size={size} color={color} strokeWidth={2} />
);

/** Joinha - Resultado bom */
export const ThumbsUpIcon = ({ size = IconSizes.md, color = IconColors.success }: IconProps) => (
  <ThumbsUp size={size} color={color} strokeWidth={2} />
);

/** Força - Incentivo, continuar tentando */
export const StrengthIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Dumbbell size={size} color={color} strokeWidth={2} />
);

/** X vermelho - Erros, respostas incorretas */
export const ErrorIcon = ({ size = IconSizes.md, color = IconColors.error }: IconProps) => (
  <XCircle size={size} color={color} strokeWidth={2} />
);

/** Check verde - Correto, aprovado */
export const CheckIcon = ({ size = IconSizes.md, color = IconColors.success }: IconProps) => (
  <CheckCircle size={size} color={color} strokeWidth={2} />
);

/** X fechar - Botão de fechar/sair */
export const CloseIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <X size={size} color={color} strokeWidth={2} />
);

/** Alvo - Quiz, começar fase */
export const TargetIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Target size={size} color={color} strokeWidth={2} />
);

/** Lua - Nível iniciante */
export const MoonIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Moon size={size} color={color} strokeWidth={2} />
);

/** Raio - Velocidade, bônus */
export const LightningIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Zap size={size} color={color} strokeWidth={2} />
);

/** Cadeado - Fase bloqueada */
export const LockIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <Lock size={size} color={color} strokeWidth={2} />
);

/** Lâmpada - Explicação, dica */
export const LightbulbIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Lightbulb size={size} color={color} strokeWidth={2} />
);

/** Play - Continuar, começar */
export const PlayIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Play size={size} color={color} fill={color} strokeWidth={0} />
);

/** Medalha - Conquista */
export const MedalIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Medal size={size} color={color} strokeWidth={2} />
);

/** Timer - Tempo */
export const TimerIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Timer size={size} color={color} strokeWidth={2} />
);

/** Relógio - Tempo médio */
export const ClockIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Clock size={size} color={color} strokeWidth={2} />
);

/** Porcentagem - Accuracy */
export const PercentIcon = ({ size = IconSizes.md, color = IconColors.primary }: IconProps) => (
  <Percent size={size} color={color} strokeWidth={2} />
);

/** Award - Prêmio */
export const AwardIcon = ({ size = IconSizes.md, color = IconColors.gold }: IconProps) => (
  <Award size={size} color={color} strokeWidth={2} />
);

// ============================================
// ÍCONES DE CONFIGURAÇÕES
// ============================================

export const SoundOnIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Volume2 size={size} color={color} strokeWidth={2} />
);

export const SoundOffIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <VolumeX size={size} color={color} strokeWidth={2} />
);

export const VibrateIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Vibrate size={size} color={color} strokeWidth={2} />
);

export const MusicIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Music size={size} color={color} strokeWidth={2} />
);

export const BellOnIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Bell size={size} color={color} strokeWidth={2} />
);

export const BellOffIcon = ({ size = IconSizes.md, color = IconColors.muted }: IconProps) => (
  <BellOff size={size} color={color} strokeWidth={2} />
);

export const SettingsIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Settings size={size} color={color} strokeWidth={2} />
);

export const LogOutIcon = ({ size = IconSizes.md, color = IconColors.error }: IconProps) => (
  <LogOut size={size} color={color} strokeWidth={2} />
);

export const InfoIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Info size={size} color={color} strokeWidth={2} />
);

export const HelpIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <HelpCircle size={size} color={color} strokeWidth={2} />
);

// ============================================
// ÍCONES DE NAVEGAÇÃO
// ============================================

export const HomeIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <Home size={size} color={color} strokeWidth={2} />
);

export const StatsIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <BarChart3 size={size} color={color} strokeWidth={2} />
);

export const ProfileIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <User size={size} color={color} strokeWidth={2} />
);

export const ChevronRightIcon = ({ size = IconSizes.md, color = IconColors.white }: IconProps) => (
  <ChevronRight size={size} color={color} strokeWidth={2} />
);

// ============================================
// COMPONENTE DE ESTRELAS (Rating)
// ============================================

interface StarsRatingProps {
  stars: number;
  maxStars?: number;
  size?: number;
  gap?: number;
}

export const StarsRating = ({ stars, maxStars = 3, size = IconSizes.md, gap = 4 }: StarsRatingProps) => (
  <View style={{ flexDirection: 'row', gap }}>
    {Array.from({ length: maxStars }, (_, i) => (
      i < stars
        ? <StarFilledIcon key={i} size={size} />
        : <StarEmptyIcon key={i} size={size} />
    ))}
  </View>
);
