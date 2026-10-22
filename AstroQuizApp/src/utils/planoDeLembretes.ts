/**
 * Quando lembrar o jogador de voltar, e com que texto.
 *
 * Dois avisos no máximo, contados a partir do último dia em que uma fase foi
 * terminada, sempre às 19h no fuso do aparelho:
 *
 *   - no dia seguinte: é o último dia que ainda estende a sequência de dias
 *     seguidos (ver `sequenciaDiaria`), então, com sequência, o aviso fala dela;
 *   - três dias depois: um convite para voltar, sem cobrança.
 *
 * Depois disso, silêncio até a pessoa jogar de novo — jogar reagenda tudo.
 * Mais do que isso vira o tipo de notificação que faz desligar todas.
 *
 * Só funções puras aqui, para dar para testar as bordas de calendário. Quem
 * agenda é o `lembreteService`.
 */

import { SequenciaDiaria } from './sequenciaDiaria';

export const HORA_DO_LEMBRETE = 19;

export type IdDoLembrete = 'amanha' | 'em3dias';

export interface ItemDeLembrete {
  id: IdDoLembrete;
  quando: Date;
  titulo: string;
  texto: string;
}

type Traduzir = (chave: string, variaveis?: Record<string, unknown>) => string;

/** `n` dias depois de AAAA-MM-DD, às 19h locais. `new Date(a, m, d)` normaliza a virada de mês. */
function diaDepois(dia: string, n: number): Date {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d + n, HORA_DO_LEMBRETE, 0, 0, 0);
}

export function planejarLembretes(p: {
  sequencia: SequenciaDiaria | null | undefined;
  /** A fase que espera o jogador; null quando já terminou todas. */
  proximaFase: number | null;
  agora: Date;
  t: Traduzir;
}): ItemDeLembrete[] {
  const ultimoDia = p.sequencia?.ultimoDia;
  if (!ultimoDia || !/^\d{4}-\d{2}-\d{2}$/.test(ultimoDia)) return [];

  const dias = p.sequencia?.dias ?? 0;
  const fase = p.proximaFase;

  const amanha: ItemDeLembrete =
    dias >= 2
      ? {
          id: 'amanha',
          quando: diaDepois(ultimoDia, 1),
          titulo: p.t('reminders.streak.title', { count: dias }),
          texto: p.t('reminders.streak.body', { count: dias + 1 }),
        }
      : {
          id: 'amanha',
          quando: diaDepois(ultimoDia, 1),
          titulo: fase ? p.t('reminders.phase.title', { phase: fase }) : p.t('reminders.generic.title'),
          texto: p.t('reminders.phase.body'),
        };

  const em3dias: ItemDeLembrete = {
    id: 'em3dias',
    quando: diaDepois(ultimoDia, 3),
    titulo: p.t('reminders.comeback.title'),
    texto: fase ? p.t('reminders.comeback.body', { phase: fase }) : p.t('reminders.comeback.bodyDone'),
  };

  // Um minuto de folga: agendar algo para "daqui a 2 segundos" só porque o
  // relógio passou das 19h no meio do cálculo é pior que não avisar.
  const limite = p.agora.getTime() + 60_000;
  return [amanha, em3dias].filter((l) => l.quando.getTime() > limite);
}
