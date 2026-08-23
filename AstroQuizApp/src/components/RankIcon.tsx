/**
 * RankIcon
 *
 * Desenha o ícone da patente do jogador. As patentes guardam apenas o *nome*
 * do ícone (ver progressionSystem.ts); é aqui que ele vira componente.
 *
 * Antes cada patente era um emoji ('👀' para Curious Observer, por exemplo),
 * o que destoava do resto da interface — o app usa Lucide em todos os outros
 * ícones — e dava um ar amador à tela de resultado.
 */

import React from 'react';
import {
  Binoculars,
  Crown,
  Microscope,
  MoonStar,
  Orbit,
  Rocket,
  Sparkle,
  Sparkles,
  Star,
  Telescope,
} from 'lucide-react-native';
import type { RankIconName } from '@/utils/progressionSystem';

const ICONES = {
  Sparkle,
  Binoculars,
  Telescope,
  MoonStar,
  Microscope,
  Rocket,
  Star,
  Sparkles,
  Orbit,
  Crown,
} as const;

interface RankIconProps {
  name: RankIconName;
  size?: number;
  color?: string;
  /** Patentes altas ganham preenchimento, para diferenciar visualmente. */
  filled?: boolean;
}

export const RankIcon: React.FC<RankIconProps> = ({
  name,
  size = 20,
  color = '#FFC107',
  filled = false,
}) => {
  const Icone = ICONES[name] ?? Sparkle;
  return (
    <Icone
      size={size}
      color={color}
      strokeWidth={2}
      fill={filled ? color : 'transparent'}
    />
  );
};

export default RankIcon;
