/**
 * keyPrefix: todos os limitadores dividem o mesmo store, chaveado por ip e
 * caminho. Um limitador mais rigido numa rota que o global tambem cobre
 * contaria cada requisicao duas vezes.
 *
 * Diferente de rate-limit.test.ts, estes testes executam o middleware de
 * verdade.
 */

import { createRateLimitMiddleware } from '../rate-limit';

const ctxFalso = (ip: string, path = '/api/leaderboard') => ({
  request: { path, ip, headers: {} },
  status: 200,
  body: null as any,
  set: jest.fn(),
});

describe('createRateLimitMiddleware — keyPrefix', () => {
  it('limitadores com prefixos diferentes na mesma rota nao dividem o contador', async () => {
    const global = createRateLimitMiddleware({ maxRequests: 2, skipPaths: [] });
    const daRota = createRateLimitMiddleware({ maxRequests: 2, skipPaths: [], keyPrefix: 'rota:' });
    const chegouNaRota = jest.fn(async () => {});

    for (let i = 0; i < 2; i++) {
      const ctx = ctxFalso('10.9.9.1');
      await global(ctx, () => daRota(ctx, chegouNaRota));
      expect(ctx.status).toBe(200);
    }
    expect(chegouNaRota).toHaveBeenCalledTimes(2);

    const terceira = ctxFalso('10.9.9.1');
    await global(terceira, () => daRota(terceira, chegouNaRota));
    expect(terceira.status).toBe(429);
  });

  it('sem prefixo, dois limitadores contam a mesma requisicao duas vezes', async () => {
    const primeiro = createRateLimitMiddleware({ maxRequests: 2, skipPaths: [] });
    const segundo = createRateLimitMiddleware({ maxRequests: 2, skipPaths: [] });
    const chegouNaRota = jest.fn(async () => {});

    const ctxA = ctxFalso('10.9.9.2');
    await primeiro(ctxA, () => segundo(ctxA, chegouNaRota));
    const ctxB = ctxFalso('10.9.9.2');
    await primeiro(ctxB, () => segundo(ctxB, chegouNaRota));

    // Duas requisicoes com limite 2 ja bloqueiam: e o motivo do prefixo.
    expect(ctxB.status).toBe(429);
    expect(chegouNaRota).toHaveBeenCalledTimes(1);
  });
});
