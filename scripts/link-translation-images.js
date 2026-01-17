#!/usr/bin/env node
/**
 * Link translated image questions to the same image as their EN counterpart.
 * 
 * This fixes translations that have question_type='image' but no files_related_mph entry.
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

function main() {
  console.log('🔗 Linking translation images to EN source images\n');
  
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Find EN image questions with their file_id
  const enImageQuestions = db.prepare(`
    SELECT q.id, q.base_id, frm.file_id
    FROM questions q
    JOIN files_related_mph frm 
      ON frm.related_id = q.id 
      AND frm.related_type = 'api::question.question' 
      AND frm.field = 'image'
    WHERE q.locale = 'en'
  `).all();

  // Build lookup: base_id -> file_id
  const baseIdToFileId = {};
  for (const q of enImageQuestions) {
    if (q.base_id && q.file_id) {
      baseIdToFileId[q.base_id] = q.file_id;
    }
  }

  console.log(`📊 Found ${Object.keys(baseIdToFileId).length} unique EN base_ids with images\n`);

  // Find translations that have question_type='image' but no image link
  const translationsWithoutImage = db.prepare(`
    SELECT q.id, q.base_id, q.locale
    FROM questions q
    WHERE q.locale IN ('pt', 'es', 'fr')
      AND q.question_type = 'image'
      AND NOT EXISTS (
        SELECT 1 FROM files_related_mph frm 
        WHERE frm.related_id = q.id 
          AND frm.related_type = 'api::question.question' 
          AND frm.field = 'image'
      )
  `).all();

  console.log(`🔍 Found ${translationsWithoutImage.length} translations without image link\n`);

  const insertRelation = db.prepare(`
    INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
    VALUES (?, ?, 'api::question.question', 'image', 1)
  `);

  let linked = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    for (const t of translationsWithoutImage) {
      const fileId = baseIdToFileId[t.base_id];
      if (fileId) {
        insertRelation.run(fileId, t.id);
        linked++;
        console.log(`   ✅ ${t.base_id} (${t.locale}) -> file_id=${fileId}`);
      } else {
        skipped++;
        console.log(`   ⚠️  ${t.base_id} (${t.locale}): no EN image found`);
      }
    }
  });

  tx();
  db.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Done!`);
  console.log(`   Linked: ${linked}`);
  console.log(`   Skipped (no EN image): ${skipped}`);
  console.log(`\n📝 Restart Strapi to reflect changes.`);
}

main();
