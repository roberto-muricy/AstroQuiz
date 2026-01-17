/**
 * Script para importar perguntas traduzidas diretamente no banco SQLite
 * Usa as traduções geradas pelo translate-image-questions.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Caminhos
const DB_PATH = path.resolve(__dirname, '../.tmp/data.db');
const TRANSLATIONS_FILE = path.resolve(__dirname, 'translated-image-questions.json');

function generateDocumentId() {
  return crypto.randomBytes(12).toString('hex');
}

async function main() {
  console.log('📥 Importador de Perguntas Traduzidas\n');

  // Verificar arquivo de traduções
  if (!fs.existsSync(TRANSLATIONS_FILE)) {
    console.error('❌ Arquivo de traduções não encontrado:', TRANSLATIONS_FILE);
    console.log('   Execute primeiro: node scripts/translate-image-questions.js');
    process.exit(1);
  }

  const translations = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf8'));
  const db = new Database(DB_PATH);

  // Buscar imagens existentes para vincular
  const imageFiles = db.prepare(`
    SELECT f.id, f.name, f.url 
    FROM files f 
    WHERE f.name LIKE 'astro_img_%'
  `).all();

  console.log(`📷 ${imageFiles.length} imagens encontradas na Media Library\n`);

  // Mapear base_id para arquivo de imagem
  const imageMap = {};
  for (const img of imageFiles) {
    // Extrair o base_id do nome (ex: astro_img_0001.jpg -> astro_img_0001)
    const match = img.name.match(/(astro_img_\d+)/);
    if (match) {
      imageMap[match[1]] = img;
    }
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  const now = new Date().toISOString();

  for (const [locale, questions] of Object.entries(translations)) {
    console.log(`\n🌍 Processando ${locale.toUpperCase()} (${questions.length} perguntas)...`);

    for (const q of questions) {
      // Verificar se já existe
      const existing = db.prepare(`
        SELECT id FROM questions 
        WHERE base_id = ? AND locale = ?
      `).get(q.baseId, locale);

      if (existing) {
        skipped++;
        continue;
      }

      try {
        const documentId = generateDocumentId();
        
        // Buscar imagem associada
        const image = imageMap[q.baseId];
        const imageUrl = image ? image.url : null;

        // Inserir pergunta
        const result = db.prepare(`
          INSERT INTO questions (
            document_id,
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
            topic,
            topic_key,
            level,
            base_id,
            question_type,
            locale,
            published_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          documentId,
          q.question,
          q.optionA,
          q.optionB,
          q.optionC,
          q.optionD,
          q.correctOption,
          q.explanation,
          q.topic,
          q.topicKey,
          q.level,
          q.baseId,
          'image',
          locale,
          now,
          now,
          now
        );

        // Vincular imagem se existir
        if (image && result.lastInsertRowid) {
          try {
            db.prepare(`
              INSERT INTO files_related_mph (
                file_id, related_id, related_type, field, "order"
              ) VALUES (?, ?, ?, ?, ?)
            `).run(image.id, result.lastInsertRowid, 'api::question.question', 'image', 1);
          } catch (e) {
            // Pode falhar se já existe - ignorar
          }
        }

        created++;
      } catch (error) {
        console.error(`   ❌ Erro ao criar ${q.baseId} (${locale}): ${error.message}`);
        errors++;
      }
    }
  }

  db.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Importação concluída!`);
  console.log(`   Criadas: ${created}`);
  console.log(`   Já existiam: ${skipped}`);
  console.log(`   Erros: ${errors}`);

  if (created > 0) {
    console.log(`\n⚠️  Reinicie o Strapi para ver as perguntas no Content Manager`);
  }
}

main().catch(console.error);
