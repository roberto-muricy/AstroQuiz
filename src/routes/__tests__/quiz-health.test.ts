/**
 * Health check.
 *
 * Ate 16/09/2026 ele devolvia 200 mesmo com o banco fora, e uma instancia que
 * so sabia responder 500 passava por saudavel — foi assim que uma queda de
 * producao durou horas sem ninguem ser avisado. O que importa aqui e o codigo
 * HTTP: o Railway e o app tratam 2xx como saudavel.
 */

jest.mock('../../services/firebase-auth', () => ({
  isFirebaseConfigured: () => false,
  extractBearerToken: () => null,
  verifyFirebaseToken: async () => null,
}));

import { createQuizRoutes, TEMPO_LIMITE_DO_HEALTH_MS } from '../quiz-routes';

const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function chamarSaude(raw: () => Promise<any>) {
  const strapi: any = { db: { connection: { raw } }, log };
  const rota = createQuizRoutes(strapi).find(
    (r: any) => r.method === 'GET' && r.path === '/api/quiz/health'
  );
  const handler = Array.isArray(rota.handler) ? rota.handler[rota.handler.length - 1] : rota.handler;
  const ctx: any = { status: 200, body: undefined };
  return handler(ctx).then(() => ctx);
}

beforeEach(() => {
  log.error.mockClear();
});

it('banco respondendo: 200 e status ok', async () => {
  const ctx = await chamarSaude(async () => [{ '?column?': 1 }]);

  expect(ctx.status).toBe(200);
  expect(ctx.body.success).toBe(true);
  expect(ctx.body.data).toEqual(expect.objectContaining({ status: 'ok', database: 'up' }));
  expect(log.error).not.toHaveBeenCalled();
});

it('banco fora: 503, status degradado e erro no log', async () => {
  const ctx = await chamarSaude(async () => {
    throw new Error('password authentication failed for user "postgres"');
  });

  expect(ctx.status).toBe(503);
  expect(ctx.body.success).toBe(false);
  expect(ctx.body.data).toEqual(expect.objectContaining({ status: 'degraded', database: 'down' }));
  expect(log.error).toHaveBeenCalled();
  // A mensagem do banco nao vai para o cliente.
  expect(JSON.stringify(ctx.body)).not.toContain('password');
});

it(
  'banco pendurado: nao espera alem do limite e responde 503',
  async () => {
    const comecou = Date.now();
    const ctx = await chamarSaude(() => new Promise(() => {}));
    const levou = Date.now() - comecou;

    expect(ctx.status).toBe(503);
    expect(levou).toBeGreaterThanOrEqual(TEMPO_LIMITE_DO_HEALTH_MS - 100);
    expect(levou).toBeLessThan(TEMPO_LIMITE_DO_HEALTH_MS + 2000);
  },
  TEMPO_LIMITE_DO_HEALTH_MS + 8000
);

it('nao conta linhas: a consulta e minima', async () => {
  const consultas: string[] = [];
  await chamarSaude(async (sql?: any) => {
    consultas.push(String(sql));
    return [];
  });

  expect(consultas).toEqual(['select 1']);
});
