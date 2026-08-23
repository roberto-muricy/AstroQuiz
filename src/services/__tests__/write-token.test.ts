/**
 * Regressão: o token de escrita precisa INTERROMPER a requisição.
 *
 * O bug: requireWriteTokenIfConfigured usava ctx.unauthorized(), que apenas
 * marca a resposta sem lançar. Como o middleware que a chama faz
 *
 *     requireWriteTokenIfConfigured(ctx);
 *     await next();
 *
 * a execução seguia para o handler mesmo sem token — deixando os endpoints de
 * importar e apagar perguntas abertos a qualquer um na internet.
 *
 * Estes testes fixam o contrato: sem token válido, a função lança.
 */
import { requireWriteTokenIfConfigured } from '../question-service';

/** ctx mínimo, no formato do Koa/Strapi. */
const criarCtx = (authorization?: string) => ({
  request: { headers: authorization ? { authorization } : {} },
  throw: (status: number, mensagem: string) => {
    const erro: any = new Error(mensagem);
    erro.status = status;
    throw erro;
  },
  unauthorized: (mensagem: string) => {
    // Se a implementação voltar a usar isto, o teste falha: marcar a resposta
    // não interrompe o middleware.
    return mensagem;
  },
});

const TOKEN = 'token-de-escrita-para-teste';
const envOriginal = { ...process.env };

afterEach(() => { process.env = { ...envOriginal }; });

describe('requireWriteTokenIfConfigured', () => {
  it('lança quando não há cabeçalho Authorization', () => {
    process.env.STRAPI_WRITE_TOKEN = TOKEN;
    expect(() => requireWriteTokenIfConfigured(criarCtx())).toThrow(/write token/i);
  });

  it('lança quando o token está errado', () => {
    process.env.STRAPI_WRITE_TOKEN = TOKEN;
    expect(() => requireWriteTokenIfConfigured(criarCtx('Bearer token-errado')))
      .toThrow(/write token/i);
  });

  it('lança quando o token tem o tamanho certo mas conteúdo diferente', () => {
    process.env.STRAPI_WRITE_TOKEN = TOKEN;
    const mesmoTamanho = 'X'.repeat(TOKEN.length);
    expect(() => requireWriteTokenIfConfigured(criarCtx(`Bearer ${mesmoTamanho}`)))
      .toThrow(/write token/i);
  });

  it('deixa passar com o token correto', () => {
    process.env.STRAPI_WRITE_TOKEN = TOKEN;
    expect(() => requireWriteTokenIfConfigured(criarCtx(`Bearer ${TOKEN}`))).not.toThrow();
  });

  it('em produção sem token configurado, recusa em vez de liberar', () => {
    delete process.env.STRAPI_WRITE_TOKEN;
    process.env.NODE_ENV = 'production';
    expect(() => requireWriteTokenIfConfigured(criarCtx())).toThrow(/misconfiguration/i);
  });
});
