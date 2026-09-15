/**
 * Rotas de diagnostico de perguntas removidas.
 *
 * - /api/questions/debug-all-methods/:id: publica, devolvia a pergunta completa
 *   pela API de documentos do Strapi, inclusive a alternativa correta e a
 *   explicacao.
 * - /api/questions/diagnose-document-id: publica, devolvia uma amostra de ids
 *   internos das perguntas.
 *
 * As rotas sao registradas a partir desta lista; um caminho que nao esta nela
 * responde 404. Caminhos de um segmento caem em GET /api/questions/:id, que
 * precisa responder 404 para id que nao e numero (antes virava erro do banco).
 */

import { createQuestionRoutes } from '../question-routes';

const REMOVIDAS = ['/api/questions/debug-all-methods/:id', '/api/questions/diagnose-document-id'];

const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

it('as rotas de diagnostico nao sao registradas', () => {
  const caminhos = createQuestionRoutes({ db: { connection: null }, log } as any).map((rota) => rota.path);

  expect(caminhos.length).toBeGreaterThan(0);
  for (const removida of REMOVIDAS) {
    expect(caminhos).not.toContain(removida);
  }
  expect(caminhos.some((caminho) => /debug-all-methods|diagnose-document-id/.test(caminho))).toBe(false);
});

it('GET /api/questions/:id responde 404 para o caminho removido e para id que nao e numero, sem consultar o banco', async () => {
  const strapi: any = {
    db: {
      get connection() {
        throw new Error('nao deveria consultar o banco');
      },
    },
    log,
  };
  const rota = createQuestionRoutes(strapi).find((r) => r.method === 'GET' && r.path === '/api/questions/:id');

  for (const id of ['diagnose-document-id', 'debug-all-methods', '12abc', '1.5', '0', '-3']) {
    const ctx: any = {
      params: { id },
      query: {},
      request: { headers: {} },
      state: {},
      status: 200,
      notFound: jest.fn(() => {
        ctx.status = 404;
      }),
      throw: jest.fn((status: number) => {
        ctx.status = status;
      }),
    };
    await rota.handler(ctx);
    expect(ctx.status).toBe(404);
  }
});
