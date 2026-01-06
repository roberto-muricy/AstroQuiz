#!/usr/bin/env node
/**
 * Duplica perguntas EN para outros locales (pt, es, fr)
 * Mantém o baseId, mas gera novo document_id para cada locale
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');
const TARGET_LOCALES = ['pt', 'es', 'fr'];

function generateDocumentId() {
  return crypto.randomBytes(12).toString('base64url');
}

async function duplicateToLocales() {
  console.log('📥 Duplicando perguntas EN para pt/es/fr...\n');

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ Erro ao abrir banco:', err.message);
      process.exit(1);
    }
  });

  try {
    // 1. Get all EN questions with astro_ baseId
    const enQuestions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM questions WHERE base_id LIKE 'astro_%' AND locale = 'en'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log(`📊 Encontradas ${enQuestions.length} perguntas em EN para duplicar\n`);

    let totalCreated = 0;
    let errors = 0;

    for (const locale of TARGET_LOCALES) {
      console.log(`\n🌐 Criando perguntas em ${locale.toUpperCase()}...`);
      let created = 0;

      for (const enQ of enQuestions) {
        const newDocId = generateDocumentId();
        
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO questions 
              (document_id, question, option_a, option_b, option_c, option_d, correct_option, 
               explanation, topic, level, base_id, locale, created_at, updated_at, published_at, 
               created_by_id, updated_by_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newDocId,
                enQ.question, // mantém texto em inglês (tradução manual depois via painel)
                enQ.option_a,
                enQ.option_b,
                enQ.option_c,
                enQ.option_d,
                enQ.correct_option,
                enQ.explanation,
                enQ.topic,
                enQ.level,
                enQ.base_id, // MESMO baseId para vincular as traduções
                locale,      // locale diferente
                enQ.created_at,
                enQ.updated_at,
                enQ.published_at,
                enQ.created_by_id,
                enQ.updated_by_id,
              ],
              function (err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          created++;
          totalCreated++;
          if (created % 50 === 0) {
            process.stdout.write(`\r   Progresso: ${created}/${enQuestions.length}`);
          }
        } catch (error) {
          errors++;
          console.log(`\n   ✗ Erro ao duplicar ${enQ.base_id} para ${locale}:`, error.message);
        }
      }
      console.log(`\r   ✓ ${locale.toUpperCase()}: ${created} perguntas criadas`);
    }

    console.log(`\n✅ Concluído!`);
    console.log(`   Total criado: ${totalCreated}`);
    console.log(`   Erros: ${errors}`);
    console.log(`\n📝 IMPORTANTE: As perguntas em pt/es/fr foram criadas com texto em inglês.`);
    console.log(`   Você precisa traduzir manualmente via painel do Strapi ou usar um script de tradução.`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    db.close();
  }
}

duplicateToLocales();
