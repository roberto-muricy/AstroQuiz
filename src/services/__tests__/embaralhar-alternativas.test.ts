/**
 * O risco desta funcao nao e embaralhar errado — e embaralhar o texto e
 * esquecer o gabarito. Se isso acontecer, todo mundo erra todas as perguntas
 * e so descobrimos em producao, porque nenhuma outra camada confere.
 *
 * Por isso o teste central nao olha a ordem: ele confere que o texto sob a
 * letra correta continua sendo o mesmo texto de antes, sempre.
 */

import { embaralharAlternativas, letraOriginal, letraEmbaralhada, LETRAS } from '../quiz-logic';

const PERGUNTA = {
  id: 22930,
  question: 'Qual é a diferença entre astronomia e astrologia?',
  optionA: 'Nenhuma: são dois nomes para a mesma ciência',
  optionB: 'A astronomia estuda planetas; a astrologia estuda estrelas',
  optionC: 'A astrologia é mais antiga, por isso é mais precisa',
  optionD: 'A astronomia é ciência; a astrologia não é',
  correctOption: 'D',
  level: 1,
};

const textoCorreto = (q: any) => q[`option${q.correctOption}`];
const conjuntoDeTextos = (q: any) => LETRAS.map((l) => q[`option${l}`]).sort();

describe('embaralharAlternativas', () => {
  it('o gabarito continua apontando para o mesmo texto', () => {
    for (let i = 0; i < 500; i += 1) {
      const saida = embaralharAlternativas(PERGUNTA);
      expect(textoCorreto(saida)).toBe(textoCorreto(PERGUNTA));
    }
  });

  it('nao perde, nao duplica e nao inventa alternativa', () => {
    for (let i = 0; i < 200; i += 1) {
      const saida = embaralharAlternativas(PERGUNTA);
      expect(conjuntoDeTextos(saida)).toEqual(conjuntoDeTextos(PERGUNTA));
    }
  });

  it('preserva os demais campos da pergunta', () => {
    const saida = embaralharAlternativas(PERGUNTA);
    expect(saida.id).toBe(PERGUNTA.id);
    expect(saida.question).toBe(PERGUNTA.question);
    expect(saida.level).toBe(PERGUNTA.level);
  });

  it('nao altera a pergunta recebida', () => {
    const copia = { ...PERGUNTA };
    embaralharAlternativas(PERGUNTA);
    expect(PERGUNTA).toEqual(copia);
  });

  it('espalha a correta pelas quatro posicoes', () => {
    // Sem embaralhamento, B respondia 39% do acervo e D so 9%. Com 400
    // sorteios, cada letra deve aparecer perto de 100 vezes; a faixa e larga
    // de proposito para o teste nao piscar.
    const contagem: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (let i = 0; i < 400; i += 1) {
      contagem[embaralharAlternativas(PERGUNTA).correctOption] += 1;
    }
    for (const letra of LETRAS) {
      expect(contagem[letra]).toBeGreaterThan(50);
      expect(contagem[letra]).toBeLessThan(160);
    }
  });

  it('alternativas com texto repetido nao confundem o gabarito', () => {
    // O embaralhamento move indices, nao textos. Se movesse textos, um
    // indexOf encontraria a primeira ocorrencia e o gabarito escorregaria.
    const comRepetida = { ...PERGUNTA, optionA: 'mesma coisa', optionC: 'mesma coisa', correctOption: 'C' };
    for (let i = 0; i < 200; i += 1) {
      const saida = embaralharAlternativas(comRepetida);
      expect(saida[`option${saida.correctOption}`]).toBe('mesma coisa');
      expect(conjuntoDeTextos(saida)).toEqual(conjuntoDeTextos(comRepetida));
    }
  });

  it('pergunta com alternativa vazia passa intacta', () => {
    const semD = { ...PERGUNTA, optionD: '' };
    expect(embaralharAlternativas(semD)).toEqual(semD);
  });

  it('sem gabarito na entrada, embaralha mesmo assim', () => {
    // Este e o caso real: normalizeQuestion() descarta correctOption antes de
    // a pergunta chegar na sessao. Uma versao anterior exigia o gabarito e
    // devolvia a pergunta intacta — nada era embaralhado em producao.
    const { correctOption, ...semGabarito } = PERGUNTA;
    const saida: any = embaralharAlternativas(semGabarito);
    expect(conjuntoDeTextos(saida)).toEqual(conjuntoDeTextos(PERGUNTA));
    expect(saida.ordemAlternativas).toHaveLength(4);
    expect(saida.correctOption).toBeUndefined();
  });

  it('nao guarda o gabarito junto da permutacao', () => {
    // GET /api/quiz/session/:id devolve a sessao inteira sem autenticacao.
    const { correctOption, ...semGabarito } = PERGUNTA;
    const saida: any = embaralharAlternativas(semGabarito);
    expect(Object.keys(saida)).not.toContain('correctOption');
  });
});

describe('traducao entre a ordem da tela e a do banco', () => {
  it('ida e volta devolve a mesma letra', () => {
    for (let i = 0; i < 300; i += 1) {
      const saida: any = embaralharAlternativas(PERGUNTA);
      for (const letra of LETRAS) {
        expect(letraEmbaralhada(letraOriginal(letra, saida.ordemAlternativas), saida.ordemAlternativas)).toBe(letra);
      }
    }
  });

  it('a letra traduzida aponta para o mesmo texto', () => {
    for (let i = 0; i < 300; i += 1) {
      const saida: any = embaralharAlternativas(PERGUNTA);
      for (const naTela of LETRAS) {
        const noBanco = letraOriginal(naTela, saida.ordemAlternativas);
        expect(saida[`option${naTela}`]).toBe(PERGUNTA[`option${noBanco}` as keyof typeof PERGUNTA]);
      }
    }
  });

  it('o gabarito do banco vira a posicao certa na tela', () => {
    for (let i = 0; i < 300; i += 1) {
      const saida: any = embaralharAlternativas(PERGUNTA);
      const naTela = letraEmbaralhada(PERGUNTA.correctOption, saida.ordemAlternativas);
      expect(saida[`option${naTela}`]).toBe(PERGUNTA.optionD);
    }
  });

  it('sem permutacao as duas funcoes sao identidade', () => {
    // Caminho de sessao ausente: precisa se comportar como antes do embaralhamento.
    for (const letra of LETRAS) {
      expect(letraOriginal(letra, undefined)).toBe(letra);
      expect(letraOriginal(letra, null)).toBe(letra);
      expect(letraEmbaralhada(letra, undefined)).toBe(letra);
      expect(letraOriginal(letra, [0, 1] as any)).toBe(letra);
    }
  });
});
