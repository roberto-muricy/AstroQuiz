'use strict';

/**
 * Gera a tabela de nomes de países usada pelo app.
 *
 * Por que uma tabela embutida em vez de `Intl.DisplayNames`: o Hermes, motor de
 * JavaScript do React Native, não implementa essa API. Em 17/09/2026, rodando a
 * build de release no simulador, o seletor de país mostrava só siglas ("AD",
 * "AE"…) e buscar "Brasil" não achava nada — quem não sabe a sigla do próprio
 * país não conseguia se encontrar. Os testes não pegaram porque rodam no Node,
 * que tem a base de idiomas completa.
 *
 * O Node é justamente quem tem essa base, então a tabela é gerada aqui e
 * versionada. Para atualizar (novo idioma, ou código novo em pais.ts):
 *
 *   node scripts/gerar-nomes-de-paises.js
 *
 * A lista de códigos vem de src/utils/pais.ts, para não existirem duas listas
 * que possam divergir.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'src/utils/pais.ts');
const DESTINO = path.join(RAIZ, 'src/utils/nomes-de-paises.ts');
const IDIOMAS = ['pt', 'en', 'es', 'fr'];

function codigosDoPaisTs() {
  const texto = fs.readFileSync(ORIGEM, 'utf8');
  const bloco = texto.match(/CODIGOS_DE_PAIS[^=]*=\s*\[([\s\S]*?)\]/);
  if (!bloco) throw new Error('não encontrei CODIGOS_DE_PAIS em ' + ORIGEM);
  const codigos = bloco[1]
    .split(',')
    .map((parte) => parte.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter((c) => /^[A-Z]{2}$/.test(c));
  if (codigos.length < 200) throw new Error('lista de códigos parece incompleta: ' + codigos.length);
  return codigos;
}

const codigos = codigosDoPaisTs();
const tabela = {};
const semNome = [];

for (const idioma of IDIOMAS) {
  const tradutor = new Intl.DisplayNames([idioma], { type: 'region' });
  tabela[idioma] = {};
  for (const codigo of codigos) {
    const nome = tradutor.of(codigo);
    // Quando o ICU não conhece o código, ele devolve o próprio código.
    if (!nome || nome === codigo) semNome.push(idioma + ':' + codigo);
    tabela[idioma][codigo] = nome || codigo;
  }
}

const linhas = [];
linhas.push('/**');
linhas.push(' * Nomes de países por idioma — ARQUIVO GERADO, não editar à mão.');
linhas.push(' *');
linhas.push(' * Gerado por scripts/gerar-nomes-de-paises.js a partir da base de idiomas do');
linhas.push(' * Node. O Hermes não implementa Intl.DisplayNames, então sem esta tabela o app');
linhas.push(' * mostra siglas no lugar dos nomes e a busca por nome não acha nada.');
linhas.push(' */');
linhas.push('');
linhas.push("import { IdiomaSuportado } from './pseudonimo';");
linhas.push('');
linhas.push('export const NOMES_DE_PAISES: Record<IdiomaSuportado, Record<string, string>> = {');
for (const idioma of IDIOMAS) {
  linhas.push('  ' + idioma + ': {');
  for (const codigo of codigos) {
    linhas.push("    " + codigo + ": '" + tabela[idioma][codigo].replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "',");
  }
  linhas.push('  },');
}
linhas.push('};');
linhas.push('');

fs.writeFileSync(DESTINO, linhas.join('\n'));

console.log('gerado: ' + path.relative(RAIZ, DESTINO));
console.log('  códigos: ' + codigos.length + ' | idiomas: ' + IDIOMAS.join(', ') + ' | entradas: ' + codigos.length * IDIOMAS.length);
console.log('  tamanho: ' + (fs.statSync(DESTINO).size / 1024).toFixed(1) + ' KB');
console.log('  sem nome no ICU: ' + (semNome.length ? semNome.join(', ') : 'nenhum'));
