#!/usr/bin/env node
/**
 * Remove duplicatas - mantém apenas a entrada mais recente de cada baseId+locale
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

async function deduplicate() {
  console.log('🧹 Removendo duplicatas...\n');

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco:', err.message);
      process.exit(1);
    }
  });

  try {
    // Delete duplicates, keeping only the highest ID (most recent) for each baseId+locale
    const result = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM questions 
         WHERE id NOT IN (
           SELECT MAX(id) 
           FROM questions 
           GROUP BY base_id, locale
         )`,
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    console.log(`🗑️  Deletadas ${result} entradas duplicadas\n`);

    // Verificar resultado
    const stats = await new Promise((resolve, reject) => {
      db.all(
        `SELECT locale, COUNT(*) as count 
         FROM questions 
         GROUP BY locale`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log('📊 Perguntas restantes por idioma:');
    stats.forEach(s => console.log(`   ${s.locale}: ${s.count}`));

    const unique = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT base_id) as count FROM questions`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    console.log(`\n✅ Total de perguntas únicas: ${unique}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    db.close();
  }
}

deduplicate();
