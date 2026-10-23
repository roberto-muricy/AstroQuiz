/**
 * Recusa corpo de requisição comprimido (Content-Encoding diferente de identity).
 *
 * O `strapi::body` (koa-body → co-body → inflation) descompacta sozinho corpos
 * em gzip, deflate e Brotli usando o zlib do Node. Com isso, qualquer rota
 * pública — /api/quiz/start, por exemplo — entregava ao descompressor do Node
 * bytes escolhidos por quem quer que fosse, sem login. Foi exatamente o caminho
 * da CVE-2026-111497 (escrita fora dos limites no decodificador Brotli, com
 * execução remota de código), corrigida no Node 22.23.4 em 21/10/2026.
 *
 * Nenhum cliente nosso manda corpo comprimido: o app usa axios sem compressão
 * de envio, e navegadores (painel admin) nunca comprimem o corpo do pedido.
 * Então a regra é a mais simples possível — só `identity` ou nada — em vez de
 * barrar só o Brotli: fecha também bombas de descompressão em gzip/deflate e
 * a próxima falha que aparecer em qualquer um dos três.
 *
 * Precisa ficar ANTES de `strapi::body` em config/middlewares.ts.
 */

export const encodingAceito = (cabecalho: string | string[] | undefined): boolean => {
  if (cabecalho === undefined) return true;
  const valores = (Array.isArray(cabecalho) ? cabecalho.join(',') : cabecalho)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return valores.every((v) => v === 'identity');
};

export default () => {
  return async (ctx: any, next: () => Promise<unknown>) => {
    if (!encodingAceito(ctx.request.headers['content-encoding'])) {
      ctx.status = 415;
      ctx.body = {
        success: false,
        data: null,
        error: { status: 415, name: 'UnsupportedMediaType', message: 'Compressed request bodies are not accepted' },
      };
      return;
    }
    await next();
  };
};
