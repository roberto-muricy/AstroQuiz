/**
 * Toda chave de tradução do ranking precisa existir nos quatro idiomas.
 *
 * O i18next não falha quando a chave não existe: ele imprime a própria chave na
 * tela. "leaderboard.guest.title" apareceria como texto para o jogador, e nem o
 * tsc nem o lint reclamariam — foi assim que o app já mostrou tela meio
 * traduzida duas vezes, como conta chaves-i18n.test.ts.
 *
 * Este teste lê os arquivos do ranking, extrai as chaves usadas e confere nas
 * quatro traduções. As chaves montadas em tempo de execução (os motivos da
 * denúncia) entram na lista à mão, porque nenhuma busca por texto as encontra.
 */

// O app nao tem @types/node — e nao vale acrescentar so por causa de um teste.
// `require` ja e conhecido aqui (os outros testes usam), entao basta declarar o
// que falta e pedir os modulos por ele.
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const LOCALES = ['pt', 'en', 'es', 'fr'] as const;

const traducoes: Record<string, any> = {
  pt: require('../../i18n/locales/pt.json'),
  en: require('../../i18n/locales/en.json'),
  es: require('../../i18n/locales/es.json'),
  fr: require('../../i18n/locales/fr.json'),
};

const raiz = path.join(__dirname, '..', '..');

const ARQUIVOS = [
  path.join(raiz, 'screens', 'LeaderboardScreen.tsx'),
  ...fs
    .readdirSync(path.join(raiz, 'components', 'leaderboard'))
    .filter((nome) => nome.endsWith('.tsx'))
    .map((nome) => path.join(raiz, 'components', 'leaderboard', nome)),
];

/** Montadas em tempo de execução: `t(\`leaderboard.report.reasons.${motivo}\`)`. */
const CHAVES_DINAMICAS = [
  'leaderboard.report.reasons.offensive',
  'leaderboard.report.reasons.impersonation',
  'leaderboard.report.reasons.spam',
];

function chavesUsadas(): string[] {
  const encontradas = new Set<string>(CHAVES_DINAMICAS);

  for (const arquivo of ARQUIVOS) {
    const fonte = fs.readFileSync(arquivo, 'utf8');
    for (const achado of fonte.matchAll(/t\(\s*'(leaderboard\.[^']+)'/g)) {
      encontradas.add(achado[1]);
    }
  }

  return [...encontradas].sort();
}

const buscar = (obj: any, caminho: string): unknown =>
  caminho.split('.').reduce((acc, parte) => (acc == null ? undefined : acc[parte]), obj);

/** i18next 25 usa _one/_other; `players` só existe nessas duas formas. */
const existe = (traducao: any, chave: string): boolean =>
  typeof buscar(traducao, chave) === 'string' ||
  (typeof buscar(traducao, `${chave}_one`) === 'string' &&
    typeof buscar(traducao, `${chave}_other`) === 'string');

describe('chaves de i18n do ranking', () => {
  it('a tela e os componentes usam chaves de traducao', () => {
    expect(chavesUsadas().length).toBeGreaterThan(10);
  });

  for (const idioma of LOCALES) {
    it(`${idioma}: nenhuma chave do ranking esta faltando`, () => {
      const faltando = chavesUsadas().filter((chave) => !existe(traducoes[idioma], chave));
      expect(faltando).toEqual([]);
    });
  }

  it('as quatro traducoes tem exatamente as mesmas chaves', () => {
    const achatar = (obj: any, prefixo = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? achatar(v, `${prefixo}${k}.`) : [`${prefixo}${k}`],
      );

    const porIdioma = LOCALES.map((idioma) => achatar(traducoes[idioma].leaderboard).sort());
    for (const chaves of porIdioma) {
      expect(chaves).toEqual(porIdioma[0]);
    }
  });

  it('nenhuma traducao do ranking usa emoji', () => {
    // O pódio usa ícone do Lucide justamente para não depender de emoji, que
    // muda de desenho em cada plataforma.
    const comEmoji: string[] = [];
    for (const idioma of LOCALES) {
      const texto = JSON.stringify(traducoes[idioma].leaderboard);
      if (/\p{Extended_Pictographic}/u.test(texto)) comEmoji.push(idioma);
    }
    expect(comEmoji).toEqual([]);
  });
});
