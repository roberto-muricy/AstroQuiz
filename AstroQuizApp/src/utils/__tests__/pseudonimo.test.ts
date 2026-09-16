/**
 * O nome gerado é a identidade de quem não escolheu apelido — a maioria, no
 * começo. Ele precisa sair certo nos quatro idiomas, e o adjetivo precisa
 * concordar com o objeto: "Nebulosa Curiosa", não "Nebulosa Curioso".
 *
 * O gênero muda entre idiomas para a MESMA palavra: planeta é masculino em
 * português e feminino em francês. Por isso o gênero é guardado por idioma, e
 * não uma vez só.
 *
 * O último teste compara o vocabulário do app com as chaves do servidor: se
 * alguém acrescentar uma palavra lá e esquecer aqui, o jogador veria a chave
 * crua no lugar do nome.
 */

import { montarNomeGerado, OBJETOS, ADJETIVOS, IdiomaSuportado } from '../pseudonimo';

// As listas de verdade, direto do servidor (mesmo repositório).
const servidor = require('../../../../src/services/pseudonym');

describe('montarNomeGerado', () => {
  const nome = { adjective: 'swift', object: 'comet', number: 42 };

  it('monta nos quatro idiomas, com a ordem de cada um', () => {
    expect(montarNomeGerado(nome, 'pt')).toBe('Cometa Veloz 42');
    expect(montarNomeGerado(nome, 'es')).toBe('Cometa Veloz 42');
    expect(montarNomeGerado(nome, 'fr')).toBe('Comète Rapide 42');
    // Em inglês o adjetivo vem antes.
    expect(montarNomeGerado(nome, 'en')).toBe('Swift Comet 42');
  });

  it('o adjetivo concorda com o genero do objeto', () => {
    const curiosa = { adjective: 'curious', object: 'nebula', number: 7 };
    expect(montarNomeGerado(curiosa, 'pt')).toBe('Nebulosa Curiosa 7');
    expect(montarNomeGerado(curiosa, 'es')).toBe('Nebulosa Curiosa 7');
    expect(montarNomeGerado(curiosa, 'fr')).toBe('Nébuleuse Curieuse 7');

    const curioso = { adjective: 'curious', object: 'meteor', number: 7 };
    expect(montarNomeGerado(curioso, 'pt')).toBe('Meteoro Curioso 7');
  });

  it('o mesmo objeto pode ter generos diferentes em idiomas diferentes', () => {
    const planeta = { adjective: 'golden', object: 'planet', number: 3 };
    // Masculino em portugues e espanhol, feminino em frances.
    expect(montarNomeGerado(planeta, 'pt')).toBe('Planeta Dourado 3');
    expect(montarNomeGerado(planeta, 'es')).toBe('Planeta Dorado 3');
    expect(montarNomeGerado(planeta, 'fr')).toBe('Planète Dorée 3');
  });

  it('chave que o app ainda nao conhece vira palavra legivel', () => {
    const futuro = { adjective: 'swift', object: 'wormhole', number: 9 };
    expect(montarNomeGerado(futuro, 'pt')).toBe('Swift Wormhole 9');

    const nenhum = { adjective: 'desconhecido', object: 'tambem_desconhecido', number: 1 };
    expect(montarNomeGerado(nenhum, 'pt')).toBe('Desconhecido Tambem desconhecido 1');
  });

  it('sem nome, devolve vazio em vez de quebrar a tela', () => {
    expect(montarNomeGerado(null, 'pt')).toBe('');
    expect(montarNomeGerado(undefined, 'en')).toBe('');
  });

  it('numero estranho nao aparece', () => {
    expect(montarNomeGerado({ adjective: 'swift', object: 'comet', number: NaN }, 'pt')).toBe(
      'Cometa Veloz',
    );
  });
});

describe('vocabulario', () => {
  const idiomas: IdiomaSuportado[] = ['pt', 'en', 'es', 'fr'];

  it('cobre exatamente as chaves do servidor', () => {
    expect(Object.keys(ADJETIVOS).sort()).toEqual([...servidor.ADJETIVOS_DO_PSEUDONIMO].sort());
    expect(Object.keys(OBJETOS).sort()).toEqual([...servidor.OBJETOS_DO_PSEUDONIMO].sort());
  });

  it('toda palavra esta preenchida nos quatro idiomas', () => {
    const vazias: string[] = [];

    for (const [chave, objeto] of Object.entries(OBJETOS)) {
      if (!objeto.en) vazias.push(`objeto ${chave} en`);
      for (const idioma of ['pt', 'es', 'fr'] as const) {
        if (!objeto[idioma].texto) vazias.push(`objeto ${chave} ${idioma}`);
        if (!['m', 'f'].includes(objeto[idioma].genero)) vazias.push(`genero ${chave} ${idioma}`);
      }
    }
    for (const [chave, adjetivo] of Object.entries(ADJETIVOS)) {
      if (!adjetivo.en) vazias.push(`adjetivo ${chave} en`);
      for (const idioma of ['pt', 'es', 'fr'] as const) {
        if (!adjetivo[idioma].m || !adjetivo[idioma].f) vazias.push(`adjetivo ${chave} ${idioma}`);
      }
    }

    expect(vazias).toEqual([]);
  });

  it('nao ha duas palavras iguais no mesmo idioma: dois jogadores ficariam com o mesmo nome', () => {
    for (const idioma of idiomas) {
      const objetos = Object.values(OBJETOS).map((o) => (idioma === 'en' ? o.en : o[idioma].texto));
      expect(new Set(objetos).size).toBe(objetos.length);

      const adjetivos = Object.values(ADJETIVOS).map((a) =>
        idioma === 'en' ? a.en : a[idioma].m,
      );
      expect(new Set(adjetivos).size).toBe(adjetivos.length);
    }
  });

  it('todas as combinacoes montam um nome completo, sem sobra de espaco', () => {
    for (const idioma of idiomas) {
      for (const adjective of Object.keys(ADJETIVOS)) {
        for (const object of Object.keys(OBJETOS)) {
          const montado = montarNomeGerado({ adjective, object, number: 10 }, idioma);
          expect(montado).toMatch(/^\S+( \S+)+ 10$/);
        }
      }
    }
  });
});
