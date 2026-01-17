#!/usr/bin/env node
/**
 * Fixes legacy/bad metadata for image questions in SQLite:
 * - If a question has an `image` relation (files_related_mph field='image'),
 *   force question_type='image'
 * - Optionally publish drafts by setting published_at if null/empty
 *
 * Usage:
 *   node scripts/fix-image-questions-metadata.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

function main() {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Strapi stores datetime fields as ISO strings in SQLite.
  const nowIso = new Date().toISOString();

  const toIso = (maybeMs) => {
    const ms = Number(maybeMs);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms).toISOString();
  };

  const countWithImage = db.prepare(`
    SELECT COUNT(DISTINCT q.id) AS cnt
    FROM questions q
    JOIN files_related_mph r
      ON r.related_id = q.id
    WHERE r.related_type = 'api::question.question'
      AND r.field = 'image'
  `).get().cnt;

  const countDraftWithImage = db.prepare(`
    SELECT COUNT(DISTINCT q.id) AS cnt
    FROM questions q
    JOIN files_related_mph r
      ON r.related_id = q.id
    WHERE r.related_type = 'api::question.question'
      AND r.field = 'image'
      AND (q.published_at IS NULL OR q.published_at = '')
  `).get().cnt;

  const sampleBefore = db.prepare(`
    SELECT q.id, q.base_id, q.locale, q.question_type, q.published_at
    FROM questions q
    JOIN files_related_mph r
      ON r.related_id = q.id
    WHERE r.related_type = 'api::question.question'
      AND r.field = 'image'
    ORDER BY q.id DESC
    LIMIT 5
  `).all();

  const tx = db.transaction(() => {
    // Force question_type='image' for anything that has an image relation
    const typeRes = db.prepare(`
      UPDATE questions
      SET question_type = 'image',
          updated_at = ?
      WHERE id IN (
        SELECT related_id
        FROM files_related_mph
        WHERE related_type = 'api::question.question'
          AND field = 'image'
      )
        AND (question_type IS NULL OR question_type != 'image')
    `).run(nowIso);

    // Publish drafts (only those with image)
    const pubRes = db.prepare(`
      UPDATE questions
      SET published_at = ?,
          updated_at = ?
      WHERE id IN (
        SELECT related_id
        FROM files_related_mph
        WHERE related_type = 'api::question.question'
          AND field = 'image'
      )
        AND (published_at IS NULL OR published_at = '')
    `).run(nowIso, nowIso);

    // Normalize legacy numeric timestamps (Strapi expects ISO strings).
    // Only touch questions that have an image relation.
    const rows = db.prepare(`
      SELECT q.id, q.created_at, q.updated_at, q.published_at
      FROM questions q
      JOIN files_related_mph r
        ON r.related_id = q.id
      WHERE r.related_type = 'api::question.question'
        AND r.field = 'image'
    `).all();

    let normalized = 0;
    const updateTimestamps = db.prepare(`
      UPDATE questions
      SET created_at = ?,
          updated_at = ?,
          published_at = ?
      WHERE id = ?
    `);

    for (const row of rows) {
      // Heuristic: if the value doesn't contain '-' and is all digits, it's likely ms epoch.
      const needs = (v) => typeof v === 'string'
        ? (!v.includes('-') && /^[0-9]+$/.test(v))
        : (typeof v === 'number');

      const createdNeeds = needs(row.created_at);
      const updatedNeeds = needs(row.updated_at);
      const publishedNeeds = needs(row.published_at);

      if (!createdNeeds && !updatedNeeds && !publishedNeeds) continue;

      const createdIso = createdNeeds ? (toIso(row.created_at) || nowIso) : row.created_at;
      const updatedIso = updatedNeeds ? (toIso(row.updated_at) || nowIso) : row.updated_at;
      const publishedIso = publishedNeeds ? (toIso(row.published_at) || nowIso) : row.published_at;

      updateTimestamps.run(createdIso, updatedIso, publishedIso, row.id);
      normalized++;
    }

    return { updatedType: typeRes.changes, published: pubRes.changes, normalized };
  });

  const result = tx();

  const sampleAfter = db.prepare(`
    SELECT q.id, q.base_id, q.locale, q.question_type, q.published_at
    FROM questions q
    JOIN files_related_mph r
      ON r.related_id = q.id
    WHERE r.related_type = 'api::question.question'
      AND r.field = 'image'
    ORDER BY q.id DESC
    LIMIT 5
  `).all();

  db.close();

  console.log('🛠️  Fix image questions metadata');
  console.log(`- DB: ${dbPath}`);
  console.log(`- Questions with image relation: ${countWithImage}`);
  console.log(`- Draft image questions (before): ${countDraftWithImage}`);
  console.log(`- Updated question_type -> 'image': ${result.updatedType}`);
  console.log(`- Published (set published_at): ${result.published}`);
  console.log(`- Normalized legacy timestamps -> ISO: ${result.normalized}`);
  console.log('\nSample BEFORE:');
  console.table(sampleBefore);
  console.log('Sample AFTER:');
  console.table(sampleAfter);
  console.log('\n✅ Done. Restart Strapi to reflect changes in API/Admin.');
}

main();

