/**
 * O nome gerado do ranking, montado no idioma de quem está vendo.
 *
 * O servidor guarda chaves, não texto: `{ adjective: 'swift', object: 'comet',
 * number: 42 }`. Assim o mesmo jogador é "Cometa Veloz 42" para quem joga em
 * português e "Swift Comet 42" para quem joga em inglês, sem nada gravado em
 * idioma nenhum.
 *
 * Por isso as palavras moram aqui, e não nos arquivos de tradução: são um
 * vocabulário fechado, preso às chaves do servidor
 * (src/services/pseudonym.ts), e o adjetivo precisa concordar em gênero com o
 * objeto — o que exige guardar as duas formas e o gênero de cada palavra.
 *
 * Ordem das palavras: em inglês o adjetivo vem antes ("Swift Comet"); em
 * português, espanhol e francês, depois ("Cometa Veloz", "Comète Rapide").
 */

export type IdiomaSuportado = 'pt' | 'en' | 'es' | 'fr';

export interface NomeGerado {
  adjective: string;
  object: string;
  number: number;
}

type Genero = 'm' | 'f';

interface Objeto {
  en: string;
  pt: { texto: string; genero: Genero };
  es: { texto: string; genero: Genero };
  fr: { texto: string; genero: Genero };
}

interface Adjetivo {
  en: string;
  pt: { m: string; f: string };
  es: { m: string; f: string };
  fr: { m: string; f: string };
}

const o = (
  en: string,
  pt: string,
  ptG: Genero,
  es: string,
  esG: Genero,
  fr: string,
  frG: Genero,
): Objeto => ({
  en,
  pt: { texto: pt, genero: ptG },
  es: { texto: es, genero: esG },
  fr: { texto: fr, genero: frG },
});

const a = (
  en: string,
  ptM: string,
  ptF: string,
  esM: string,
  esF: string,
  frM: string,
  frF: string,
): Adjetivo => ({
  en,
  pt: { m: ptM, f: ptF },
  es: { m: esM, f: esF },
  fr: { m: frM, f: frF },
});

/** As mesmas 24 chaves de OBJETOS_DO_PSEUDONIMO no servidor. */
export const OBJETOS: Record<string, Objeto> = {
  comet: o('Comet', 'Cometa', 'm', 'Cometa', 'm', 'Comète', 'f'),
  nebula: o('Nebula', 'Nebulosa', 'f', 'Nebulosa', 'f', 'Nébuleuse', 'f'),
  pulsar: o('Pulsar', 'Pulsar', 'm', 'Púlsar', 'm', 'Pulsar', 'm'),
  quasar: o('Quasar', 'Quasar', 'm', 'Cuásar', 'm', 'Quasar', 'm'),
  galaxy: o('Galaxy', 'Galáxia', 'f', 'Galaxia', 'f', 'Galaxie', 'f'),
  meteor: o('Meteor', 'Meteoro', 'm', 'Meteoro', 'm', 'Météore', 'm'),
  orbit: o('Orbit', 'Órbita', 'f', 'Órbita', 'f', 'Orbite', 'f'),
  planet: o('Planet', 'Planeta', 'm', 'Planeta', 'm', 'Planète', 'f'),
  star: o('Star', 'Estrela', 'f', 'Estrella', 'f', 'Étoile', 'f'),
  moon: o('Moon', 'Lua', 'f', 'Luna', 'f', 'Lune', 'f'),
  aurora: o('Aurora', 'Aurora', 'f', 'Aurora', 'f', 'Aurore', 'f'),
  eclipse: o('Eclipse', 'Eclipse', 'm', 'Eclipse', 'm', 'Éclipse', 'f'),
  cluster: o('Cluster', 'Aglomerado', 'm', 'Cúmulo', 'm', 'Amas', 'm'),
  nova: o('Nova', 'Nova', 'f', 'Nova', 'f', 'Nova', 'f'),
  rocket: o('Rocket', 'Foguete', 'm', 'Cohete', 'm', 'Fusée', 'f'),
  satellite: o('Satellite', 'Satélite', 'm', 'Satélite', 'm', 'Satellite', 'm'),
  telescope: o('Telescope', 'Telescópio', 'm', 'Telescopio', 'm', 'Télescope', 'm'),
  asteroid: o('Asteroid', 'Asteroide', 'm', 'Asteroide', 'm', 'Astéroïde', 'm'),
  horizon: o('Horizon', 'Horizonte', 'm', 'Horizonte', 'm', 'Horizon', 'm'),
  cosmos: o('Cosmos', 'Cosmos', 'm', 'Cosmos', 'm', 'Cosmos', 'm'),
  zenith: o('Zenith', 'Zênite', 'm', 'Cénit', 'm', 'Zénith', 'm'),
  photon: o('Photon', 'Fóton', 'm', 'Fotón', 'm', 'Photon', 'm'),
  equinox: o('Equinox', 'Equinócio', 'm', 'Equinoccio', 'm', 'Équinoxe', 'm'),
  solstice: o('Solstice', 'Solstício', 'm', 'Solsticio', 'm', 'Solstice', 'm'),
};

/** As mesmas 24 chaves de ADJETIVOS_DO_PSEUDONIMO no servidor. */
export const ADJETIVOS: Record<string, Adjetivo> = {
  swift: a('Swift', 'Veloz', 'Veloz', 'Veloz', 'Veloz', 'Rapide', 'Rapide'),
  bright: a('Bright', 'Brilhante', 'Brilhante', 'Brillante', 'Brillante', 'Brillant', 'Brillante'),
  curious: a('Curious', 'Curioso', 'Curiosa', 'Curioso', 'Curiosa', 'Curieux', 'Curieuse'),
  silent: a('Silent', 'Silencioso', 'Silenciosa', 'Silencioso', 'Silenciosa', 'Silencieux', 'Silencieuse'),
  distant: a('Distant', 'Distante', 'Distante', 'Distante', 'Distante', 'Lointain', 'Lointaine'),
  radiant: a('Radiant', 'Radiante', 'Radiante', 'Radiante', 'Radiante', 'Radieux', 'Radieuse'),
  brave: a('Brave', 'Valente', 'Valente', 'Valiente', 'Valiente', 'Brave', 'Brave'),
  calm: a('Calm', 'Calmo', 'Calma', 'Tranquilo', 'Tranquila', 'Calme', 'Calme'),
  clever: a('Clever', 'Esperto', 'Esperta', 'Astuto', 'Astuta', 'Malin', 'Maligne'),
  cosmic: a('Cosmic', 'Cósmico', 'Cósmica', 'Cósmico', 'Cósmica', 'Cosmique', 'Cosmique'),
  golden: a('Golden', 'Dourado', 'Dourada', 'Dorado', 'Dorada', 'Doré', 'Dorée'),
  silver: a('Silver', 'Prateado', 'Prateada', 'Plateado', 'Plateada', 'Argenté', 'Argentée'),
  steady: a('Steady', 'Firme', 'Firme', 'Firme', 'Firme', 'Stable', 'Stable'),
  wandering: a('Wandering', 'Errante', 'Errante', 'Errante', 'Errante', 'Errant', 'Errante'),
  shining: a('Shining', 'Reluzente', 'Reluzente', 'Reluciente', 'Reluciente', 'Éclatant', 'Éclatante'),
  bold: a('Bold', 'Ousado', 'Ousada', 'Audaz', 'Audaz', 'Audacieux', 'Audacieuse'),
  gentle: a('Gentle', 'Gentil', 'Gentil', 'Gentil', 'Gentil', 'Doux', 'Douce'),
  keen: a('Keen', 'Atento', 'Atenta', 'Atento', 'Atenta', 'Vif', 'Vive'),
  lucky: a('Lucky', 'Sortudo', 'Sortuda', 'Afortunado', 'Afortunada', 'Chanceux', 'Chanceuse'),
  noble: a('Noble', 'Nobre', 'Nobre', 'Noble', 'Noble', 'Noble', 'Noble'),
  quick: a('Quick', 'Rápido', 'Rápida', 'Rápido', 'Rápida', 'Prompt', 'Prompte'),
  serene: a('Serene', 'Sereno', 'Serena', 'Sereno', 'Serena', 'Serein', 'Sereine'),
  vivid: a('Vivid', 'Vívido', 'Vívida', 'Vívido', 'Vívida', 'Vivace', 'Vivace'),
  patient: a('Patient', 'Paciente', 'Paciente', 'Paciente', 'Paciente', 'Patient', 'Patiente'),
};

/** Chave desconhecida vira palavra legível, para a tela nunca ficar em branco. */
const daChave = (chave: string): string => {
  const limpa = String(chave || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!limpa) return '';
  return limpa.charAt(0).toUpperCase() + limpa.slice(1);
};

/**
 * Monta o nome gerado no idioma pedido.
 *
 * Chave que o app não conhece — porque o servidor ganhou uma palavra nova antes
 * de o app ser atualizado — vira a própria chave, legível. É melhor mostrar
 * "Swift Comet 42" do que um espaço vazio onde deveria estar um nome.
 */
export function montarNomeGerado(
  nome: NomeGerado | null | undefined,
  idioma: IdiomaSuportado,
): string {
  if (!nome) return '';

  const objeto = OBJETOS[nome.object];
  const adjetivo = ADJETIVOS[nome.adjective];
  const numero = Number.isFinite(nome.number) ? String(Math.floor(nome.number)) : '';

  if (idioma === 'en' || !objeto || !adjetivo) {
    const palavraObjeto = objeto ? objeto.en : daChave(nome.object);
    const palavraAdjetivo = adjetivo ? adjetivo.en : daChave(nome.adjective);
    return [palavraAdjetivo, palavraObjeto, numero].filter(Boolean).join(' ');
  }

  const { texto, genero } = objeto[idioma];
  return [texto, adjetivo[idioma][genero], numero].filter(Boolean).join(' ');
}

/** O nome como o servidor manda: apelido escrito, ou nome gerado em chaves. */
export interface NomeDoServidor {
  type?: string;
  text?: string;
  adjective?: string;
  object?: string;
  number?: number;
}

/**
 * O que a lista mostra: o apelido de quem escolheu um, e o nome gerado para
 * todo o resto.
 *
 * Mora aqui, e não na linha da lista, para poder ser testado — o app não tem
 * configuração de jest para componentes de React Native, e esta é justamente a
 * decisão que erraria calado, deixando a linha em branco.
 */
export function nomeDeExibicao(
  nome: NomeDoServidor | null | undefined,
  idioma: IdiomaSuportado,
): string {
  if (!nome) return '';
  if (nome.type === 'nickname') return nome.text || '';

  return montarNomeGerado(
    {
      adjective: nome.adjective || '',
      object: nome.object || '',
      number: Number(nome.number),
    },
    idioma,
  );
}
