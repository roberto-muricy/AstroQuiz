/**
 * GET /api/questions e aberto de proposito, mas devolvia `correctOption` e
 * `explanation` para qualquer um: `?locale=pt&limit=1000` entregava a chave de
 * respostas das 705 perguntas, nos quatro idiomas, sem autenticacao.
 *
 * Estes testes cobrem as duas metades do risco:
 *   - vazar de novo (alguem devolve o objeto cru);
 *   - deixar de funcionar (o filtro passa a valer para quem TEM token, e as
 *     ferramentas de conteudo quebram sem aviso).
 */

import { temTokenDeEscritaValido, semGabarito } from '../question-service';

const TOKEN = 'a'.repeat(44);

const contexto = (autorizacao?: string) => ({
  request: { headers: autorizacao ? { authorization: autorizacao } : {} },
});

const PERGUNTA = {
  id: 22930,
  question: 'Qual é a diferença entre astronomia e astrologia?',
  optionA: 'Nenhuma: são dois nomes para a mesma ciência',
  optionB: 'A astronomia estuda planetas; a astrologia estuda estrelas',
  optionC: 'A astrologia é mais antiga, por isso é mais precisa',
  optionD: 'A astronomia é ciência; a astrologia não é',
  correctOption: 'D',
  explanation: 'A astronomia é ciência: observa, mede e testa suas previsões.',
  topic: 'Curiosidades gerais',
  level: 1,
  locale: 'pt',
};

describe('semGabarito', () => {
  it('remove a resposta certa', () => {
    expect(semGabarito(PERGUNTA)).not.toHaveProperty('correctOption');
  });

  it('remove a explicacao', () => {
    // 239 das 705 explicacoes em pt (34%) contem literalmente o texto da
    // alternativa correta. Deixar a explicacao seria manter o gabarito em prosa.
    expect(semGabarito(PERGUNTA)).not.toHaveProperty('explanation');
  });

  it('preserva tudo que a tela de revisao precisa', () => {
    const saida: any = semGabarito(PERGUNTA);
    expect(saida.id).toBe(PERGUNTA.id);
    expect(saida.question).toBe(PERGUNTA.question);
    expect(saida.optionA).toBe(PERGUNTA.optionA);
    expect(saida.optionD).toBe(PERGUNTA.optionD);
    expect(saida.topic).toBe(PERGUNTA.topic);
    expect(saida.level).toBe(PERGUNTA.level);
    expect(saida.locale).toBe(PERGUNTA.locale);
  });

  it('nao altera a pergunta recebida', () => {
    const copia = { ...PERGUNTA };
    semGabarito(PERGUNTA);
    expect(PERGUNTA).toEqual(copia);
  });

  it('nenhum campo restante revela a resposta', () => {
    // Rede de seguranca para quando alguem acrescentar uma coluna nova ao
    // SELECT: se o valor bater com o texto da alternativa correta, o teste cai.
    const saida: any = semGabarito(PERGUNTA);
    const textoCorreto = PERGUNTA.optionD;
    const vazamentos = Object.entries(saida).filter(
      ([chave, valor]) =>
        !chave.startsWith('option') && typeof valor === 'string' && valor.includes(textoCorreto)
    );
    expect(vazamentos).toEqual([]);
  });
});

describe('temTokenDeEscritaValido', () => {
  const original = process.env.STRAPI_WRITE_TOKEN;
  beforeEach(() => {
    process.env.STRAPI_WRITE_TOKEN = TOKEN;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.STRAPI_WRITE_TOKEN;
    else process.env.STRAPI_WRITE_TOKEN = original;
  });

  it('aceita o token correto', () => {
    expect(temTokenDeEscritaValido(contexto(`Bearer ${TOKEN}`))).toBe(true);
  });

  it('recusa token errado do mesmo tamanho', () => {
    expect(temTokenDeEscritaValido(contexto(`Bearer ${'b'.repeat(44)}`))).toBe(false);
  });

  it('recusa prefixo do token correto', () => {
    expect(temTokenDeEscritaValido(contexto(`Bearer ${TOKEN.slice(0, 20)}`))).toBe(false);
  });

  it('recusa quem nao manda nada', () => {
    expect(temTokenDeEscritaValido(contexto())).toBe(false);
    expect(temTokenDeEscritaValido(contexto('Bearer '))).toBe(false);
    expect(temTokenDeEscritaValido(contexto(TOKEN))).toBe(false); // sem "Bearer "
  });

  it('falha fechado quando a variavel nao esta configurada', () => {
    // Uma variavel esquecida tem que virar ausencia de gabarito, nunca
    // liberacao geral. requireWriteTokenIfConfigured() faz o contrario em dev
    // (segue adiante), e por isso esta funcao e separada dela.
    delete process.env.STRAPI_WRITE_TOKEN;
    expect(temTokenDeEscritaValido(contexto(`Bearer ${TOKEN}`))).toBe(false);
    expect(temTokenDeEscritaValido(contexto('Bearer qualquer'))).toBe(false);
  });

  it('nao quebra com contexto malformado', () => {
    expect(temTokenDeEscritaValido({})).toBe(false);
    expect(temTokenDeEscritaValido({ request: {} })).toBe(false);
    expect(temTokenDeEscritaValido(null)).toBe(false);
  });
});
