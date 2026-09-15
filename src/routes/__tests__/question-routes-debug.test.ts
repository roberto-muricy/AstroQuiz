/**
 * /api/questions/debug-all-methods/:id foi removida.
 *
 * Era publica e devolvia a pergunta completa pela API de documentos do Strapi,
 * inclusive a alternativa correta e a explicacao. As rotas sao registradas
 * a partir desta lista; um caminho que nao esta nela responde 404.
 */

import { createQuestionRoutes } from '../question-routes';

it('a rota debug-all-methods nao e registrada, entao responde 404', () => {
  const strapi: any = { db: { connection: null }, log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } };
  const rotas = createQuestionRoutes(strapi);

  expect(rotas.length).toBeGreaterThan(0);
  expect(rotas.some((rota) => String(rota.path).includes('debug-all-methods'))).toBe(false);
});
