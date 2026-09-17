'use strict';

/**
 * Gera src/constants/versao.ts a partir da configuração de build.
 *
 * O Perfil mostrava "1.0.0" escrito à mão, enquanto o app publicado era outro —
 * quem mandasse print de um problema informaria a versão errada. E em 17/09/2026
 * o mesmo tipo de duplicação já tinha causado um arquivamento da 1.3.0 saindo
 * como 1.2.1, porque o Info.plist tinha o número fixo.
 *
 * Por isso a versão tem um lugar só: o `project.pbxproj` no iOS e o
 * `build.gradle` no Android. Este gerador copia de lá.
 *
 *   node scripts/gerar-versao.js
 *
 * Esquecer de rodar não passa em silêncio: `versao.test.ts` compara o arquivo
 * gerado com as duas configurações e falha quando divergem.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PBXPROJ = path.join(RAIZ, 'ios/AstroQuizApp.xcodeproj/project.pbxproj');
const GRADLE = path.join(RAIZ, 'android/app/build.gradle');
const DESTINO = path.join(RAIZ, 'src/constants/versao.ts');

/** Todas as configurações (Debug e Release) precisam concordar. */
function doPbxproj(chave) {
  const texto = fs.readFileSync(PBXPROJ, 'utf8');
  const achados = [...texto.matchAll(new RegExp(chave + ' = ([^;]+);', 'g'))].map((m) => m[1].trim());
  if (!achados.length) throw new Error('não encontrei ' + chave + ' no pbxproj');
  const distintos = [...new Set(achados)];
  if (distintos.length > 1) {
    throw new Error(chave + ' tem valores diferentes entre configurações: ' + distintos.join(', '));
  }
  return distintos[0];
}

function doGradle(chave, formato) {
  const texto = fs.readFileSync(GRADLE, 'utf8');
  const achado = texto.match(new RegExp('^\\s*' + chave + '\\s+' + formato + '\\s*$', 'm'));
  if (!achado) throw new Error('não encontrei ' + chave + ' no build.gradle');
  return achado[1];
}

const versoes = {
  ios: { versao: doPbxproj('MARKETING_VERSION'), build: doPbxproj('CURRENT_PROJECT_VERSION') },
  android: { versao: doGradle('versionName', '"([^"]+)"'), build: doGradle('versionCode', '(\\d+)') },
};

const conteudo = `/**
 * Versão do app — ARQUIVO GERADO, não editar à mão.
 *
 * Gerado por scripts/gerar-versao.js a partir do project.pbxproj (iOS) e do
 * build.gradle (Android). Para atualizar, mude a versão na configuração de
 * build e rode o gerador; \`versao.test.ts\` falha se este arquivo ficar atrás.
 *
 * Sem dependência de react-native de propósito: assim os testes leem este
 * arquivo sem precisar do ambiente do React Native.
 */

export interface VersaoDaPlataforma {
  /** O que o público vê: 1.3.0. */
  versao: string;
  /** O número do envio, que sobe a cada build enviada. */
  build: string;
}

export const VERSOES: Record<'ios' | 'android', VersaoDaPlataforma> = {
  ios: { versao: '${versoes.ios.versao}', build: '${versoes.ios.build}' },
  android: { versao: '${versoes.android.versao}', build: '${versoes.android.build}' },
};

/** "1.3.0 (48)" — a build entra porque é ela que identifica o envio num relato de erro. */
export function versaoParaExibir(plataforma: string): string {
  const { versao, build } = VERSOES[plataforma === 'android' ? 'android' : 'ios'];
  return versao + ' (' + build + ')';
}
`;

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, conteudo);

console.log('gerado: ' + path.relative(RAIZ, DESTINO));
console.log('  iOS:     ' + versoes.ios.versao + ' (' + versoes.ios.build + ')');
console.log('  Android: ' + versoes.android.versao + ' (' + versoes.android.build + ')');
