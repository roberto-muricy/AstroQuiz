/**
 * Nenhum arquivo .js de rotas em src/api.
 *
 * O projeto e TypeScript e o build (tsc) ignora .js: rotas declaradas em .js
 * dentro de src/api nao chegam a producao, mas ficam no repositorio, e bastaria
 * mudar a compilacao para passarem a valer. As que existiam declaravam rotas
 * sem login: listar, ler e criar perguntas (com o gabarito), e o motor de quiz
 * antigo. As rotas de verdade ficam em src/routes/*.ts.
 */

import fs from 'fs';
import path from 'path';

function listarArquivos(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
  });
}

it('nao ha arquivos .js de rotas em src/api', () => {
  const raiz = path.join(__dirname, '..', '..', 'api');
  expect(fs.existsSync(raiz)).toBe(true);

  const encontrados = listarArquivos(raiz)
    .filter((arquivo) => arquivo.split(path.sep).includes('routes') && /\.(c|m)?js$/.test(arquivo))
    .map((arquivo) => path.relative(raiz, arquivo));

  expect(encontrados).toEqual([]);
});
