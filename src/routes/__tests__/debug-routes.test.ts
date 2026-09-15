/**
 * Rotas de debug nunca podem existir em producao.
 *
 * De 02/02 a 12/04/2026 elas ficaram publicas em producao: o index.js
 * compilado que estava versionado no git registrava as rotas de debug sem
 * condicao, e o modulo ainda nao tinha trava propria. Hoje ha duas travas, e
 * este teste prende as duas.
 */

import fs from 'fs';
import path from 'path';
import { createDebugRoutes } from '../debug-routes';

it('em producao o modulo de debug nao devolve nenhuma rota', () => {
  const antes = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    expect(createDebugRoutes({})).toEqual([]);
  } finally {
    process.env.NODE_ENV = antes;
  }
});

it('o index.ts so registra as rotas de debug fora de producao', () => {
  const fonte = fs.readFileSync(path.join(__dirname, '..', '..', 'index.ts'), 'utf8');
  const chamadas = fonte.match(/createDebugRoutes\(strapi\)/g) ?? [];

  expect(chamadas).toHaveLength(1);
  expect(fonte).toContain("process.env.NODE_ENV !== 'production' ? createDebugRoutes(strapi) : []");
});
