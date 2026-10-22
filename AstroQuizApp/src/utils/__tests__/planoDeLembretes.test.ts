/**
 * Os lembretes saem do último dia jogado, às 19h locais: no dia seguinte (o
 * último que ainda estende a sequência) e três dias depois. Nunca no passado.
 */

import { planejarLembretes } from '@/utils/planoDeLembretes';

const t = (chave: string, v?: Record<string, unknown>) => (v ? `${chave} ${JSON.stringify(v)}` : chave);
const as = (a: number, m: number, d: number, h = 0, min = 0) => new Date(a, m - 1, d, h, min);

describe('planejarLembretes', () => {
  it('sem nenhuma fase terminada, não lembra de nada', () => {
    expect(planejarLembretes({ sequencia: null, proximaFase: 1, agora: as(2026, 10, 22, 10), t })).toEqual([]);
  });

  it('agenda amanhã e daqui a três dias, às 19h', () => {
    const l = planejarLembretes({
      sequencia: { dias: 1, ultimoDia: '2026-10-22' },
      proximaFase: 4,
      agora: as(2026, 10, 22, 21),
      t,
    });
    expect(l.map((x) => [x.id, x.quando])).toEqual([
      ['amanha', as(2026, 10, 23, 19)],
      ['em3dias', as(2026, 10, 25, 19)],
    ]);
  });

  it('com sequência de 2 ou mais dias, o aviso de amanhã fala dela', () => {
    const [amanha] = planejarLembretes({
      sequencia: { dias: 5, ultimoDia: '2026-10-22' },
      proximaFase: 9,
      agora: as(2026, 10, 22, 21),
      t,
    });
    expect(amanha.titulo).toBe('reminders.streak.title {"count":5}');
    expect(amanha.texto).toBe('reminders.streak.body {"count":6}');
  });

  it('sem sequência, o aviso de amanhã fala da próxima fase', () => {
    const [amanha] = planejarLembretes({
      sequencia: { dias: 1, ultimoDia: '2026-10-22' },
      proximaFase: 4,
      agora: as(2026, 10, 22, 21),
      t,
    });
    expect(amanha.titulo).toBe('reminders.phase.title {"phase":4}');
  });

  it('quem terminou todas as fases recebe o texto sem número de fase', () => {
    const l = planejarLembretes({
      sequencia: { dias: 1, ultimoDia: '2026-10-22' },
      proximaFase: null,
      agora: as(2026, 10, 22, 21),
      t,
    });
    expect(l[0].titulo).toBe('reminders.generic.title');
    expect(l[1].texto).toBe('reminders.comeback.bodyDone');
  });

  it('o que já passou fica de fora: abrir o app dois dias depois só deixa o de três dias', () => {
    const l = planejarLembretes({
      sequencia: { dias: 3, ultimoDia: '2026-10-22' },
      proximaFase: 7,
      agora: as(2026, 10, 24, 9),
      t,
    });
    expect(l.map((x) => x.id)).toEqual(['em3dias']);
  });

  it('não agenda para daqui a segundos quando o cálculo cai em cima das 19h', () => {
    const l = planejarLembretes({
      sequencia: { dias: 1, ultimoDia: '2026-10-22' },
      proximaFase: 2,
      agora: as(2026, 10, 23, 18, 59),
      t,
    });
    // 18:59 + 1 min de folga = 19:00, que não é estritamente depois: fica de fora.
    expect(l.map((x) => x.id)).toEqual(['em3dias']);
  });

  it('vira o mês sem erro', () => {
    const l = planejarLembretes({
      sequencia: { dias: 1, ultimoDia: '2026-10-30' },
      proximaFase: 2,
      agora: as(2026, 10, 30, 22),
      t,
    });
    expect(l.map((x) => x.quando)).toEqual([as(2026, 10, 31, 19), as(2026, 11, 2, 19)]);
  });
});
