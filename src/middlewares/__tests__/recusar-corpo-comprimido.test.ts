/**
 * Corpo comprimido nunca chega ao descompressor do Node (CVE-2026-111497 e
 * afins): o pedido para aqui, com 415, antes do strapi::body.
 */

import recusarCorpoComprimido, { encodingAceito } from '../recusar-corpo-comprimido';

const contexto = (headers: Record<string, string | string[]>) => ({
  request: { headers },
  status: 200,
  body: undefined as unknown,
});

describe('encodingAceito', () => {
  it.each([
    [undefined, true],
    ['identity', true],
    ['IDENTITY', true],
    ['br', false],
    ['BR', false],
    ['gzip', false],
    ['deflate', false],
    ['gzip, br', false],
    ['identity, br', false],
    [' br ', false],
  ])('%p → %p', (valor, esperado) => {
    expect(encodingAceito(valor as string | undefined)).toBe(esperado);
  });

  it('cabeçalho repetido também é conferido inteiro', () => {
    expect(encodingAceito(['identity', 'br'])).toBe(false);
  });
});

describe('middleware', () => {
  it('pedido sem compressão segue adiante', async () => {
    const ctx = contexto({ 'content-type': 'application/json' });
    const next = jest.fn().mockResolvedValue(undefined);
    await recusarCorpoComprimido()(ctx, next);
    expect(next).toHaveBeenCalled();
    expect(ctx.status).toBe(200);
  });

  it('pedido em Brotli para com 415 e mensagem genérica, sem chegar ao leitor do corpo', async () => {
    const ctx = contexto({ 'content-encoding': 'br' });
    const next = jest.fn();
    await recusarCorpoComprimido()(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(415);
    expect(ctx.body).toMatchObject({ success: false, error: { status: 415 } });
  });
});
