#!/usr/bin/env node
/**
 * Corrige o topico "Geral" que sobrou sem traducao nas perguntas em en/es/fr.
 *
 * O problema: 68 perguntas em ingles, 74 em espanhol e 59 em frances exibem
 * "Geral" — palavra portuguesa — no cabecalho da tela do jogo. Aparece para o
 * jogador em ~10% das perguntas, e caiu inclusive numa captura da App Store.
 *
 * O script separa dois casos e so aplica os seguros:
 *
 *   TRADUCAO  a mesma pergunta esta "Geral" nos quatro idiomas. Nao ha o que
 *             deduzir: e so traduzir a palavra. Zero inferencia.
 *
 *   HERANCA   a pergunta tem topico bom em outro idioma (ex.: en="Space
 *             Observation", es="Geral"). Herda o topico do irmao, traduzido
 *             pela tabela deduzida dos proprios dados.
 *
 * O que ele NAO faz, de proposito: os topicos divergem entre idiomas em alguns
 * casos, e nem toda divergencia e ortografica. Medido em producao:
 *
 *   EN "Sun" (29 perguntas) -> pt "Lua"x23 / "Sol"x6
 *                              fr "Systeme solaire"x23 / "Soleil"x6
 *   EN "Stars"              -> pt "Estrelas"x7 / "Objetos estelares"x6
 *   EN "Astronomy"          -> pt "Astronomia"x15 / "Pequenos corpos..."x5
 *
 * Nesses casos nao da para saber qual lado esta certo sem ler as perguntas, e
 * herdar propagaria o erro. O script os PULA e lista no fim para decisao humana.
 *
 * Uso:
 *   node scripts/corrigir-topicos-geral.js            # simula, nao escreve
 *   STRAPI_WRITE_TOKEN=... node scripts/corrigir-topicos-geral.js --aplicar
 *
 * O token NAO fica no script nem e impresso. Use a variavel de ambiente com o
 * valor de producao (o mesmo configurado no Railway).
 */

const BASE = process.env.ASTROQUIZ_API || 'https://astroquiz-production.up.railway.app/api';
const LOCS = ['pt', 'en', 'es', 'fr'];
const APLICAR = process.argv.includes('--aplicar');

/** Palavra para "geral" quando nenhum idioma tem topico melhor. */
const GERAL = { pt: 'Geral', en: 'General', es: 'General', fr: 'Général' };

const buscarLocale = async (loc) => {
  const todas = [];
  for (let start = 0; start < 2000; start += 100) {
    const r = await fetch(`${BASE}/questions?locale=${loc}&limit=100&start=${start}`);
    if (!r.ok) throw new Error(`GET questions ${loc} -> ${r.status}`);
    const j = await r.json();
    const arr = j.data || j;
    if (!Array.isArray(arr) || arr.length === 0) break;
    todas.push(...arr);
  }
  return todas;
};

/**
 * Pergunta o token pelo terminal, sem eco e sem passar pela linha de comando.
 *
 * Existe porque a forma anterior — `STRAPI_WRITE_TOKEN=... node script.js` ou
 * `read -rs "?prompt" VAR` — colocava o segredo na linha de comando, e um token
 * base64 tem `+` e `=`, que o zsh recusa como nome de variavel. O resultado
 * pratico foi o token acabar no historico do shell.
 *
 * Aqui ele nunca toca no shell: e lido direto do terminal, com o eco desligado,
 * e vive apenas na memoria deste processo.
 */
function perguntarToken() {
  return new Promise((resolve) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      console.error('\nERRO: sem terminal interativo. Rode o script direto, sem pipe.');
      return resolve(null);
    }
    process.stdout.write('\nCole o STRAPI_WRITE_TOKEN (nada aparece na tela) e tecle Enter:\n> ');
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding('utf8');

    let buffer = '';
    const aoTeclar = (ch) => {
      if (ch === '\r' || ch === '\n') {
        entrada.setRawMode(false);
        entrada.pause();
        entrada.removeListener('data', aoTeclar);
        process.stdout.write('\n');
        // Espaco ou quebra colados junto derrubariam a comparacao de tamanho.
        return resolve(buffer.trim());
      }
      if (ch === '') { process.stdout.write('\n'); process.exit(130); }   // Ctrl-C
      if (ch === '') { buffer = buffer.slice(0, -1); return; }            // backspace
      buffer += ch;
    };
    entrada.on('data', aoTeclar);
  });
}

/** Duas variantes que so diferem em maiuscula/acento/espaco sao a mesma coisa. */
const normalizar = (s) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

(async () => {
  console.log(APLICAR ? 'MODO APLICAR — vai escrever no servidor.\n' : 'MODO SIMULACAO — nada sera escrito.\n');

  const dados = {};
  for (const l of LOCS) dados[l] = await buscarLocale(l);
  console.log(`perguntas lidas: ${LOCS.map((l) => `${l}=${dados[l].length}`).join('  ')}`);

  const porBase = {};
  for (const l of LOCS) {
    for (const q of dados[l]) {
      (porBase[q.baseId] ??= {})[l] = { id: q.id, topic: q.topic };
    }
  }

  // Tabela EN -> {pt,es,fr}, deduzida das perguntas em que os 4 idiomas tem
  // topico. Uma traducao so entra na tabela se for INEQUIVOCA: descontadas as
  // ocorrencias de "Geral", tem de sobrar uma unica variante (ignorando
  // maiusculas e acentos). "Sun" cai fora justamente por isto.
  const bruto = {};
  for (const p of Object.values(porBase)) {
    if (!p.en || p.en.topic === 'Geral') continue;
    const alvo = (bruto[p.en.topic] ??= { pt: {}, es: {}, fr: {} });
    for (const l of ['pt', 'es', 'fr']) {
      const v = p[l]?.topic;
      if (!v || v === 'Geral') continue;
      alvo[l][normalizar(v)] = { texto: v, n: (alvo[l][normalizar(v)]?.n || 0) + 1 };
    }
  }

  const traducao = {};
  const ambiguos = [];
  for (const [en, m] of Object.entries(bruto)) {
    const escolha = {};
    let ok = true;
    for (const l of ['pt', 'es', 'fr']) {
      const variantes = Object.values(m[l]);
      if (variantes.length === 1) escolha[l] = variantes[0].texto;
      else if (variantes.length === 0) escolha[l] = null;
      else { ok = false; ambiguos.push({ en, loc: l, variantes: variantes.map((v) => `"${v.texto}"×${v.n}`) }); }
    }
    if (ok) traducao[en] = escolha;
  }
  console.log(`tabela de topicos inequivocos: ${Object.keys(traducao).length}`);
  console.log(`topicos ambiguos, deixados de fora: ${new Set(ambiguos.map((a) => a.en)).size}`);

  // Plano
  const plano = [];
  const pulados = [];
  for (const [base, p] of Object.entries(porBase)) {
    const comGeral = LOCS.filter((l) => p[l]?.topic === 'Geral');
    if (comGeral.length === 0) continue;

    const todosGeral = LOCS.every((l) => !p[l] || p[l].topic === 'Geral');

    if (todosGeral) {
      for (const l of comGeral) {
        if (GERAL[l] === p[l].topic) continue; // pt ja esta certo
        plano.push({ id: p[l].id, loc: l, base, para: GERAL[l], origem: 'traducao' });
      }
      continue;
    }

    // Chave EN do irmao com topico bom.
    let chaveEn = p.en && p.en.topic !== 'Geral' ? p.en.topic : null;
    if (!chaveEn) {
      chaveEn = Object.entries(traducao).find(([, t]) =>
        ['pt', 'es', 'fr'].some((l) => p[l] && p[l].topic !== 'Geral' && t[l] && normalizar(t[l]) === normalizar(p[l].topic)),
      )?.[0] || null;
    }

    for (const l of comGeral) {
      const alvo = l === 'en' ? chaveEn : (chaveEn ? traducao[chaveEn]?.[l] : null);
      if (!alvo) {
        pulados.push({ id: p[l].id, loc: l, base, motivo: chaveEn ? `topico "${chaveEn}" e ambiguo em ${l}` : 'nao achei irmao confiavel' });
        continue;
      }
      plano.push({ id: p[l].id, loc: l, base, para: alvo, origem: 'heranca' });
    }
  }

  const porIdioma = {};
  plano.forEach((x) => (porIdioma[x.loc] = (porIdioma[x.loc] || 0) + 1));
  console.log(`\nPLANO: ${plano.length} linhas`);
  console.log(`  por idioma: ${JSON.stringify(porIdioma)}`);
  console.log(`  traducao: ${plano.filter((x) => x.origem === 'traducao').length}  |  heranca: ${plano.filter((x) => x.origem === 'heranca').length}`);
  console.log('\n  amostra:');
  plano.slice(0, 8).forEach((x) => console.log(`    [${x.loc}] id ${x.id}: "Geral" -> "${x.para}"  (${x.origem})`));

  if (pulados.length) {
    console.log(`\nPULADOS (${pulados.length}) — precisam de decisao humana:`);
    const porMotivo = {};
    pulados.forEach((x) => (porMotivo[x.motivo] = (porMotivo[x.motivo] || 0) + 1));
    Object.entries(porMotivo).forEach(([m, n]) => console.log(`    ${n}x  ${m}`));
  }

  if (!APLICAR) {
    console.log('\nSimulacao. Para escrever:  STRAPI_WRITE_TOKEN=... node scripts/corrigir-topicos-geral.js --aplicar');
    return;
  }

  const token = process.env.STRAPI_WRITE_TOKEN || (await perguntarToken());
  if (!token) {
    console.error('\nERRO: sem token, nada a fazer.');
    process.exit(1);
  }

  // Comprimento, nunca o valor. Um token colado duas vezes aparece aqui como o
  // dobro do tamanho — foi assim que 186 requisicoes falharam em silencio.
  console.log(`\ntoken recebido: ${token.length} caracteres`);

  // Prova de fogo numa linha so. Sem isto, um token errado gera 186 requisicoes
  // 401 antes de o script admitir que nao ia funcionar.
  const teste = plano[0];
  const rt = await fetch(`${BASE}/questions/${teste.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topic: teste.para, topicKey: teste.para }),
  });
  if (rt.status === 401) {
    console.error('\nTOKEN RECUSADO (401). Nada foi escrito.');
    console.error('  E o valor de STRAPI_WRITE_TOKEN nas Variables do Railway,');
    console.error('  nao um token gerado no painel do Strapi.');
    console.error('  Se o comprimento acima for o dobro do esperado, foi colagem dupla.');
    process.exit(1);
  }
  if (!rt.ok) {
    console.error(`\nfalha inesperada na primeira escrita: ${rt.status}. Nada mais foi tentado.`);
    process.exit(1);
  }
  console.log('token aceito — aplicando o resto.\n');

  let ok = 1;
  const falhas = [];
  for (const item of plano.slice(1)) {
    const r = await fetch(`${BASE}/questions/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic: item.para, topicKey: item.para }),
    });
    if (r.ok) ok += 1;
    else falhas.push({ id: item.id, status: r.status });
    await new Promise((res) => setTimeout(res, 60)); // respeita o rate limit
  }
  console.log(`\naplicado: ${ok}/${plano.length}`);
  if (falhas.length) {
    console.log('falhas:', falhas.slice(0, 10).map((f) => `${f.id}(${f.status})`).join(' '));
    process.exit(1);
  }
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
