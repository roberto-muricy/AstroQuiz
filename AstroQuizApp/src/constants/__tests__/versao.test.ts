/**
 * A versão que o app mostra precisa ser a versão que o app é.
 *
 * O Perfil exibia "1.0.0" escrito à mão enquanto a loja tinha 1.2.1, então
 * quem mandava print de um problema informava uma versão que não existia. E o
 * mesmo tipo de duplicação já tinha feito um arquivamento da 1.3.0 sair como
 * 1.2.1, porque o número estava também no Info.plist.
 *
 * `versao.ts` é gerado por `scripts/gerar-versao.js` a partir da configuração
 * de build. Esquecer de rodar o gerador depois de mudar a versão é o erro
 * natural — e é ele que este teste pega, comparando o arquivo gerado com as
 * duas fontes.
 */

// O app nao tem @types/node — e nao vale acrescentar so por causa de um teste.
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

import { VERSOES, versaoParaExibir } from '../versao';

const raiz = path.join(__dirname, '..', '..', '..');
const pbxproj = fs.readFileSync(
  path.join(raiz, 'ios/AstroQuizApp.xcodeproj/project.pbxproj'),
  'utf8',
);
const gradle = fs.readFileSync(path.join(raiz, 'android/app/build.gradle'), 'utf8');

/** Todos os valores da chave no pbxproj, para conferir que as configuracoes concordam. */
function doPbxproj(chave: string): string[] {
  const achados: string[] = [];
  const busca = new RegExp(chave + ' = ([^;]+);', 'g');
  let m: RegExpExecArray | null;
  while ((m = busca.exec(pbxproj)) !== null) achados.push(m[1].trim());
  return achados;
}

describe('versao.ts acompanha a configuração de build', () => {
  it('iOS: a versão e a build são as do project.pbxproj', () => {
    const versoes = doPbxproj('MARKETING_VERSION');
    const builds = doPbxproj('CURRENT_PROJECT_VERSION');

    expect(versoes.length).toBeGreaterThan(0);
    expect(builds.length).toBeGreaterThan(0);
    // Debug e Release com números diferentes fariam o teste passar por sorte.
    expect([...new Set(versoes)]).toHaveLength(1);
    expect([...new Set(builds)]).toHaveLength(1);

    expect(VERSOES.ios.versao).toBe(versoes[0]);
    expect(VERSOES.ios.build).toBe(builds[0]);
  });

  it('Android: a versão e a build são as do build.gradle', () => {
    const versao = gradle.match(/^\s*versionName\s+"([^"]+)"\s*$/m);
    const build = gradle.match(/^\s*versionCode\s+(\d+)\s*$/m);

    expect(versao).not.toBeNull();
    expect(build).not.toBeNull();

    expect(VERSOES.android.versao).toBe(versao![1]);
    expect(VERSOES.android.build).toBe(build![1]);
  });

  it('mostra versão e build juntas, porque é a build que identifica o envio', () => {
    expect(versaoParaExibir('ios')).toBe(`${VERSOES.ios.versao} (${VERSOES.ios.build})`);
    expect(versaoParaExibir('android')).toBe(`${VERSOES.android.versao} (${VERSOES.android.build})`);
  });

  it('plataforma desconhecida cai no iOS em vez de quebrar a tela', () => {
    // Platform.OS tambem pode ser 'web'/'windows'. O Perfil chama isso direto no
    // render: um undefined aqui derrubaria a tela inteira.
    expect(versaoParaExibir('web')).toBe(versaoParaExibir('ios'));
  });
});
