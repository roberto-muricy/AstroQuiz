/**
 * Regressao: toda chave de i18n citada no codigo precisa existir nos quatro
 * idiomas.
 *
 * O i18next nao falha quando a chave nao existe — ele imprime a propria chave
 * na tela. "achievements.firstSteps.name" apareceria como texto para o
 * jogador, e nenhum teste, nenhum tsc e nenhum lint reclamaria.
 *
 * Isto ja aconteceu duas vezes neste projeto:
 *
 *   - as conquistas tinham `name` e `description` fixos em ingles, e o pop-up
 *     saia meio traduzido: titulo em portugues, nome da conquista em ingles
 *   - o plural de `missedBy` usava o sufixo _plural (i18next v3) enquanto a
 *     versao instalada e a 25, que usa _one/_other. A tela mostrava
 *     "3 answer short" ate alguem reparar
 *
 * O teste cobre as chaves de conquista, que sao montadas dinamicamente em
 * progressionSystem.ts e por isso escapam de qualquer busca por texto.
 */

import { achievements } from '../progressionSystem';

const LOCALES = ['pt', 'en', 'es', 'fr'] as const;

const traducoes: Record<string, any> = {
  pt: require('../../i18n/locales/pt.json'),
  en: require('../../i18n/locales/en.json'),
  es: require('../../i18n/locales/es.json'),
  fr: require('../../i18n/locales/fr.json'),
};

/** Resolve "a.b.c" dentro do objeto de traducao. */
const buscar = (obj: any, caminho: string): unknown =>
  caminho.split('.').reduce((acc, parte) => (acc == null ? undefined : acc[parte]), obj);

describe('chaves de i18n das conquistas', () => {
  it('existe pelo menos uma conquista para testar', () => {
    expect(achievements.length).toBeGreaterThan(0);
  });

  for (const loc of LOCALES) {
    it(`${loc}: toda conquista tem nome e descricao`, () => {
      const faltando: string[] = [];

      for (const conquista of achievements) {
        for (const chave of [conquista.nomeChave, conquista.descricaoChave]) {
          const valor = buscar(traducoes[loc], chave);
          if (typeof valor !== 'string' || valor.trim() === '') {
            faltando.push(`${conquista.id} -> ${chave}`);
          }
        }
      }

      expect(faltando).toEqual([]);
    });
  }

  it('o titulo do pop-up existe nos quatro idiomas', () => {
    const faltando = LOCALES.filter(
      (loc) => typeof buscar(traducoes[loc], 'achievements.unlocked') !== 'string'
    );
    expect(faltando).toEqual([]);
  });

  it('o icone de cada conquista e um nome do Lucide, nao um emoji', () => {
    // Um emoji sobreviveu aqui a padronizacao de icones do resto do app e so
    // apareceu quando alguem terminou a fase 1 — ou seja, para todo jogador.
    const comEmoji = achievements.filter((a) => /\p{Extended_Pictographic}/u.test(a.icon));
    expect(comEmoji.map((a) => `${a.id}: ${a.icon}`)).toEqual([]);
  });
});
