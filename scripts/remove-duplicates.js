#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

console.log('🗑️  Removendo duplicatas do banco...\n');

const db = new sqlite3.Database(dbPath);

// Para cada base_id duplicado, manter apenas o mais antigo (menor id)
const query = `
  DELETE FROM questions
  WHERE id IN (
    SELECT id 
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY base_id, locale ORDER BY id ASC) as row_num
      FROM questions
      WHERE locale = 'pt' AND published_at IS NOT NULL AND base_id IS NOT NULL
    ) 
    WHERE row_num > 1
  )
`;

db.run(query, [], function(err) {
  if (err) {
    console.error('❌ Erro ao remover duplicatas:', err);
    process.exit(1);
  }
  
  console.log(`✅ Duplicatas removidas: ${this.changes} perguntas\n`);
  
  // Verificar resultado
  db.all(`
    SELECT locale, COUNT(*) as count 
    FROM questions 
    WHERE published_at IS NOT NULL 
    GROUP BY locale 
    ORDER BY count DESC
  `, [], (err2, rows) => {
    if (err2) {
      console.error('Erro:', err2);
    } else {
      console.log('📊 Perguntas por idioma após limpeza:\n');
      rows.forEach(r => {
        const flag = r.locale === 'pt' ? '🇧🇷' : r.locale === 'en' ? '🇺🇸' : r.locale === 'es' ? '🇪🇸' : r.locale === 'fr' ? '🇫🇷' : '🌍';
        console.log(`   ${flag} ${r.locale.toUpperCase()}: ${r.count} perguntas`);
      });
    }
    
    db.close();
  });
});
