#!/usr/bin/env node
/**
 * Exporta TODO o banco de perguntas para um arquivo versionável.
 *
 * Diferente do antigo export-questions-to-csv.js, este:
 *   - le do PostgreSQL de producao (DATABASE_URL), nao do SQLite de dev
 *   - inclui todas as perguntas, nao apenas as com base_id 'astro_%'
 *   - agrupa os 4 idiomas sob o mesmo base_id, em vez de uma linha por idioma
 *   - registra a imagem vinculada (question_type = 'image')
 *
 * Uso:  node scripts/content-export.js
 * Saida: data/questions-snapshot.json
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const url = (fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').match(/^DATABASE_URL=(.+)$/m) || [])[1];
if (!url) {
  console.error('DATABASE_URL nao encontrada no .env');
  process.exit(1);
}

const DESTINO = path.resolve(__dirname, '../data/questions-snapshot.json');
const LOCALES = ['pt', 'en', 'es', 'fr'];

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Uma linha por (base_id, locale), sempre a versao publicada.
  const { rows } = await c.query(`
    SELECT q.base_id, q.document_id, q.locale, q.level, q.topic, q.topic_key,
           q.question_type, q.correct_option, q.question,
           q.option_a, q.option_b, q.option_c, q.option_d, q.explanation,
           f.url AS image_url, f.name AS image_name, f.width AS image_width, f.height AS image_height
    FROM questions q
    LEFT JOIN files_related_mph m ON m.related_id = q.id AND m.related_type = 'api::question.question'
    LEFT JOIN files f ON f.id = m.file_id
    WHERE q.published_at IS NOT NULL
    ORDER BY q.base_id, q.locale
  `);

  const porBase = new Map();
  for (const r of rows) {
    if (!porBase.has(r.base_id)) {
      porBase.set(r.base_id, {
        base_id: r.base_id,
        document_id: r.document_id,
        level: r.level,
        topic_key: r.topic_key,
        question_type: r.question_type,
        correct_option: r.correct_option,
        image: r.image_url ? { url: r.image_url, name: r.image_name, width: r.image_width, height: r.image_height } : null,
        locales: {},
      });
    }
    porBase.get(r.base_id).locales[r.locale] = {
      question: r.question,
      options: [r.option_a, r.option_b, r.option_c, r.option_d],
      explanation: r.explanation,
      topic: r.topic,
    };
  }

  const perguntas = [...porBase.values()].sort((a, b) => a.base_id.localeCompare(b.base_id));

  // Avisos: qualquer coisa que impediria uma restauracao fiel.
  const avisos = [];
  perguntas.forEach((p) => {
    const faltando = LOCALES.filter((l) => !p.locales[l]);
    if (faltando.length) avisos.push(`${p.base_id}: sem ${faltando.join(',')}`);
    if (p.question_type === 'image' && !p.image) avisos.push(`${p.base_id}: tipo imagem sem arquivo`);
  });

  const porNivel = {};
  perguntas.forEach((p) => { porNivel[p.level] = (porNivel[p.level] || 0) + 1; });

  const saida = {
    gerado_em: new Date().toISOString(),
    total: perguntas.length,
    por_nivel: porNivel,
    com_imagem: perguntas.filter((p) => p.image).length,
    idiomas: LOCALES,
    perguntas,
  };

  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.writeFileSync(DESTINO, JSON.stringify(saida, null, 1));

  const kb = (fs.statSync(DESTINO).size / 1024).toFixed(0);
  console.log(`exportadas ${perguntas.length} perguntas (${kb} KB) -> ${path.relative(process.cwd(), DESTINO)}`);
  console.log('por nivel:', Object.entries(porNivel).map(([k, v]) => `${k}:${v}`).join('  '));
  console.log('com imagem:', saida.com_imagem);
  console.log(avisos.length ? `\nAVISOS (${avisos.length}):\n  ` + avisos.slice(0, 15).join('\n  ') : '\nsem avisos: todas as perguntas tem os 4 idiomas');

  await c.end();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
