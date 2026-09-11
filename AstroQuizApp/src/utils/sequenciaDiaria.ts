/**
 * Dias seguidos de jogo.
 *
 * O selo da Home dizia "10 dias seguidos", mas o app nunca tinha contado dias:
 * o selo mostrava `stats.maxStreak`, o recorde de ACERTOS seguidos. Por ser
 * recorde, nunca caía — quem passava dias sem abrir o app continuava vendo a
 * mesma sequência.
 *
 * Conta um dia quando o jogador TERMINA uma fase, passando ou não. Reprovar e
 * voltar amanhã para tentar de novo é exatamente o hábito que o selo premia.
 *
 * Só funções puras aqui, sem armazenamento, para dar para testar as bordas de
 * calendário. Quem guarda o resultado é o `progressStorage`.
 */

export interface SequenciaDiaria {
  /** Quantos dias corridos, terminando em `ultimoDia`. */
  dias: number;
  /** Último dia em que uma fase foi terminada, como AAAA-MM-DD no fuso do aparelho. */
  ultimoDia: string | null;
}

export const SEQUENCIA_VAZIA: SequenciaDiaria = { dias: 0, ultimoDia: null };

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * O dia do calendário no fuso do aparelho.
 *
 * Não usar `toISOString()`: aquilo é UTC, e às 23h30 no Brasil já seria o dia
 * seguinte — a fase jogada à noite contaria para amanhã, e a de amanhã não
 * somaria nada.
 */
export function diaLocal(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/**
 * Dias de calendário entre dois AAAA-MM-DD.
 *
 * Calculado a partir das datas, via `Date.UTC`, e não subtraindo horários
 * locais: num dia de horário de verão, com 23 ou 25 horas, a subtração daria
 * 0,96 ou 1,04.
 */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/** Progresso salvo por versões antigas não tem o campo; dado corrompido vira vazio. */
const normalizar = (s?: SequenciaDiaria | null): SequenciaDiaria =>
  s && typeof s.dias === 'number' && s.dias > 0 && typeof s.ultimoDia === 'string'
    ? s
    : SEQUENCIA_VAZIA;

/** Registra que o jogador terminou uma fase `agora`. */
export function avancarSequencia(
  atual: SequenciaDiaria | null | undefined,
  agora: Date = new Date()
): SequenciaDiaria {
  const s = normalizar(atual);
  const hoje = diaLocal(agora);
  if (!s.ultimoDia) return { dias: 1, ultimoDia: hoje };

  const passados = diasEntre(s.ultimoDia, hoje);
  if (passados === 0) return s; // já contou hoje
  if (passados === 1) return { dias: s.dias + 1, ultimoDia: hoje };
  if (passados < 0) return s; // relógio atrasado: nem zera nem infla
  return { dias: 1, ultimoDia: hoje }; // pulou pelo menos um dia
}

/**
 * Quantos dias o selo deve mostrar `agora`.
 *
 * Ontem ainda vale: jogar hoje estende a sequência, então ela continua de pé
 * até o fim de hoje. Anteontem já quebrou, e o selo some.
 */
export function diasVisiveis(
  atual: SequenciaDiaria | null | undefined,
  agora: Date = new Date()
): number {
  const s = normalizar(atual);
  if (!s.ultimoDia) return 0;
  const passados = diasEntre(s.ultimoDia, diaLocal(agora));
  if (passados === 0 || passados === 1 || passados < 0) return s.dias;
  return 0;
}
