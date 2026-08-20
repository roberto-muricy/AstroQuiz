#!/usr/bin/env node
/**
 * Restaura o banco de perguntas a partir de data/questions-snapshot.json.
 *
 * Reconstroi, para cada pergunta, as 8 linhas que o Strapi 5 espera
 * (4 idiomas x rascunho + publicado) e revincula a imagem quando houver.
 * As imagens em si vivem no Cloudinary e nao sao reenviadas: o snapshot
 * guarda a URL, e aqui apenas recriamos o registro em `files` se sumiu.
 *
 * Uso:
 *   node scripts/content-restore.js            # simulacao: mostra o que mudaria
 *   node scripts/content-restore.js --apply    # grava de fato
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const APLICAR = process.argv.includes('--apply');
const url = (fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').match(/^DATABASE_URL=(.+)$/m) || [])[1];
const snap = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/questions-snapshot.json'), 'utf8'));
const LOCALES = ['en', 'es', 'fr', 'pt'];

const novoId = () => {
  const ch = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 24; i++) s += ch[crypto.randomInt(ch.length)];
  return s;
};

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const existentes = new Set((await c.query('SELECT DISTINCT base_id FROM questions')).rows.map((r) => r.base_id));
  const novas = snap.perguntas.filter((p) => !existentes.has(p.base_id));
  const atualizar = snap.perguntas.filter((p) => existentes.has(p.base_id));

  console.log(`snapshot de ${snap.gerado_em}: ${snap.total} perguntas`);
  console.log(`  ja no banco: ${atualizar.length}`);
  console.log(`  a inserir:   ${novas.length}`);
  const sobrando = [...existentes].filter((b) => !snap.perguntas.some((p) => p.base_id === b));
  console.log(`  no banco mas fora do snapshot: ${sobrando.length}${sobrando.length ? ' (' + sobrando.slice(0, 5).join(', ') + '…)' : ''}`);

  if (!APLICAR) {
    console.log('\nsimulacao — nada foi gravado. Use --apply para executar.');
    await c.end();
    return;
  }

  await c.query('BEGIN');
  let inseridas = 0, atualizadas = 0, imagens = 0;
  try {
    for (const p of snap.perguntas) {
      // 1) a imagem, se houver: reaproveita o registro existente ou recria
      let fileId = null;
      if (p.image) {
        const achado = await c.query('SELECT id FROM files WHERE url = $1 LIMIT 1', [p.image.url]);
        if (achado.rows.length) {
          fileId = achado.rows[0].id;
        } else {
          const nome = (p.image.name || '').replace(/\.[^.]+$/, '') || 'imagem';
          const now = new Date();
          const f = await c.query(
            `INSERT INTO files (document_id,name,width,height,hash,ext,mime,url,provider,provider_metadata,folder_path,created_at,updated_at,published_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
            [novoId(), p.image.name, p.image.width, p.image.height, nome, '.jpg', 'image/jpeg', p.image.url,
             'cloudinary', JSON.stringify({ public_id: nome, resource_type: 'image' }), '/1', now, now, now]
          );
          fileId = f.rows[0].id;
          imagens += 1;
        }
      }

      const jaExiste = existentes.has(p.base_id);
      const now = new Date();

      if (jaExiste) {
        for (const loc of LOCALES) {
          const d = p.locales[loc];
          if (!d) continue;
          await c.query(
            `UPDATE questions SET question=$1,option_a=$2,option_b=$3,option_c=$4,option_d=$5,
             explanation=$6,topic=$7,topic_key=$8,level=$9,correct_option=$10,question_type=$11,updated_at=NOW()
             WHERE base_id=$12 AND locale=$13`,
            [d.question, d.options[0], d.options[1], d.options[2], d.options[3], d.explanation,
             d.topic, p.topic_key, p.level, p.correct_option, p.question_type, p.base_id, loc]
          );
        }
        atualizadas += 1;
      } else {
        const docId = p.document_id || novoId();
        for (const loc of LOCALES) {
          const d = p.locales[loc];
          if (!d) continue;
          for (const pub of [null, now]) {
            const r = await c.query(
              `INSERT INTO questions (document_id,question,option_a,option_b,option_c,option_d,topic,base_id,
               explanation,level,correct_option,created_at,updated_at,published_at,locale,question_type,topic_key)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
              [docId, d.question, d.options[0], d.options[1], d.options[2], d.options[3], d.topic, p.base_id,
               d.explanation, p.level, p.correct_option, now, now, pub, loc, p.question_type, p.topic_key]
            );
            if (fileId) {
              await c.query(
                `INSERT INTO files_related_mph (file_id,related_id,related_type,field,"order") VALUES ($1,$2,$3,$4,$5)`,
                [fileId, r.rows[0].id, 'api::question.question', 'image', 1]
              );
            }
          }
        }
        inseridas += 1;
      }

      // 2) garante o vinculo da imagem tambem nas perguntas ja existentes
      if (fileId && jaExiste) {
        const semVinculo = await c.query(
          `SELECT q.id FROM questions q WHERE q.base_id=$1
           AND NOT EXISTS (SELECT 1 FROM files_related_mph m WHERE m.related_id=q.id)`, [p.base_id]);
        for (const r of semVinculo.rows) {
          await c.query(
            `INSERT INTO files_related_mph (file_id,related_id,related_type,field,"order") VALUES ($1,$2,$3,$4,$5)`,
            [fileId, r.id, 'api::question.question', 'image', 1]);
        }
      }
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('ROLLBACK —', e.message);
    await c.end();
    process.exit(1);
  }

  console.log(`\ninseridas: ${inseridas} | atualizadas: ${atualizadas} | registros de imagem recriados: ${imagens}`);
  const t = await c.query("SELECT COUNT(DISTINCT base_id) n FROM questions WHERE published_at IS NOT NULL AND locale='pt'");
  console.log('perguntas no banco agora:', t.rows[0].n);
  await c.end();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
