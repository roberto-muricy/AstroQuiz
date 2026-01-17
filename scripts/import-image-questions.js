#!/usr/bin/env node
/**
 * Importa perguntas com imagens do JSON para o banco
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');
const jsonFile = path.resolve(__dirname, 'image-questions.json');

function generateDocumentId() {
  return crypto.randomBytes(12).toString('base64url');
}

const TOPIC_TO_KEY = {
  'Space Missions': 'Space Missions',
  'Solar System': 'Solar System',
  'Space Observation': 'Space Observation',
  'Stellar Objects': 'Stellar Objects',
  'Galaxies & Cosmology': 'Galaxies & Cosmology',
};

async function importImageQuestions() {
  console.log('📥 Importando perguntas com imagens...\n');

  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Arquivo não encontrado: ${jsonFile}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log(`📊 Encontradas ${questions.length} perguntas no JSON\n`);

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco:', err.message);
      process.exit(1);
    }
  });

  try {
    let imported = 0;
    let errors = 0;

    for (const q of questions) {
      const docId = generateDocumentId();
      const now = Date.now();
      
      // Converter imageFilename para imageUrl
      const imageUrl = `/uploads/${q.imageFilename}`;
      const topicKey = TOPIC_TO_KEY[q.topic] || q.topic;

      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO questions 
            (document_id, question, option_a, option_b, option_c, option_d, correct_option, 
             explanation, topic, level, base_id, locale, topic_key, question_type, image_url,
             created_at, updated_at, published_at, created_by_id, updated_by_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              docId,
              q.question,
              q.optionA,
              q.optionB,
              q.optionC,
              q.optionD,
              q.correctOption,
              q.explanation,
              q.topic,
              q.level,
              q.baseId,
              q.locale,
              topicKey,
              q.questionType,
              imageUrl,
              now,
              now,
              now,
              1, // created_by_id
              1, // updated_by_id
            ],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        imported++;
        console.log(`   ✓ ${q.baseId}: ${q.question.substring(0, 50)}...`);
        
      } catch (error) {
        errors++;
        console.log(`   ✗ ${q.baseId}: ${error.message}`);
      }
    }

    console.log(`\n✅ Importação concluída!`);
    console.log(`   Importadas: ${imported}`);
    console.log(`   Erros: ${errors}`);
    
    console.log(`\n📝 PRÓXIMOS PASSOS:`);
    console.log(`   1. Faça upload das ${questions.length} imagens no Strapi Media Library`);
    console.log(`   2. Certifique-se que os nomes correspondem aos imageFilename do JSON`);
    console.log(`   3. As perguntas foram criadas apenas em EN - crie traduções via painel`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    db.close();
  }
}

importImageQuestions();
