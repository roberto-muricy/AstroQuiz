#!/usr/bin/env node
/**
 * Traduz perguntas com imagem de EN para PT, ES, FR usando DeepL
 * Cria as versões traduzidas no Strapi via API
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../.tmp/data.db');

// Configuração
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2';
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const TARGET_LANGS = {
  'PT-BR': 'pt',
  'ES': 'es',
  'FR': 'fr'
};

async function translateTexts(texts, targetLang) {
  try {
    const response = await axios.post(`${DEEPL_API_URL}/translate`, {
      text: texts.filter(t => t), // Remove empty strings
      source_lang: 'EN',
      target_lang: targetLang
    }, {
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.translations.map(t => t.text);
  } catch (error) {
    console.error(`❌ DeepL error (${targetLang}):`, error.response?.data || error.message);
    throw error;
  }
}

async function getImageQuestionsEN() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    db.all(`
      SELECT id, document_id, base_id, question, option_a, option_b, option_c, option_d, 
             correct_option, explanation, topic, level, question_type, topic_key
      FROM questions 
      WHERE question_type = 'image' 
        AND locale = 'en' 
        AND published_at IS NOT NULL
      ORDER BY base_id
    `, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function checkExistingTranslation(baseId, locale) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    db.get(`
      SELECT id FROM questions 
      WHERE base_id = ? AND locale = ? AND published_at IS NOT NULL
    `, [baseId, locale], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(!!row);
    });
  });
}

async function fetchEnQuestionByBaseId(baseId) {
  const response = await axios.get(`${STRAPI_URL}/api/questions`, {
    params: {
      locale: 'en',
      baseId,
      limit: 1,
      published: 'true',
      withImage: 'true',
    },
  });

  const items = response?.data?.data || [];
  return items.length > 0 ? items[0] : null;
}

async function createQuestionInStrapi(questionData, locale) {
  try {
    const response = await axios.post(`${STRAPI_URL}/api/questions`, {
      data: {
        question: questionData.question,
        optionA: questionData.optionA,
        optionB: questionData.optionB,
        optionC: questionData.optionC,
        optionD: questionData.optionD,
        correctOption: questionData.correctOption,
        explanation: questionData.explanation,
        topic: questionData.topic,
        topicKey: questionData.topicKey,
        level: questionData.level,
        baseId: questionData.baseId,
        questionType: 'image',
        locale: locale,
        // Important: media is non-localized, but translations still need to carry it
        image: questionData.imageId || null,
        // Publish immediately so quiz selection can pick it (publishedAt != null)
        publishedAt: new Date().toISOString(),
      }
    }, {
      headers: {
        // Optional (recommended if STRAPI_WRITE_TOKEN is enabled)
        ...(STRAPI_TOKEN ? { 'Authorization': `Bearer ${STRAPI_TOKEN}` } : {}),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Strapi error:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🌍 Tradutor de Perguntas com Imagem (DeepL)\n');

  // Verificar configuração
  if (!DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY não configurada no .env');
    process.exit(1);
  }

  // Buscar perguntas EN
  const questionsEN = await getImageQuestionsEN();
  console.log(`📊 Encontradas ${questionsEN.length} perguntas com imagem em EN\n`);

  let translated = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const q of questionsEN) {
    console.log(`\n🔄 ${q.base_id}: ${q.question.substring(0, 50)}...`);

    // Fetch EN question (to reuse media image.id)
    const enQuestion = await fetchEnQuestionByBaseId(q.base_id);
    const imageId = enQuestion?.image?.id || null;
    if (!imageId) {
      console.log(`   ⚠️  EN: não encontrei image.id para baseId=${q.base_id} (pulando traduções)`);
      errors += Object.keys(TARGET_LANGS).length;
      continue;
    }

    for (const [deeplLang, strapiLocale] of Object.entries(TARGET_LANGS)) {
      // Verificar se já existe
      const exists = await checkExistingTranslation(q.base_id, strapiLocale);
      if (exists) {
        console.log(`   ⏭️  ${strapiLocale.toUpperCase()}: já existe`);
        skipped++;
        continue;
      }

      try {
        // Traduzir campos
        const textsToTranslate = [
          q.question,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.explanation || '',
          q.topic || ''
        ];

        const translatedTexts = await translateTexts(textsToTranslate, deeplLang);

        const translatedQuestion = {
          question: translatedTexts[0],
          optionA: translatedTexts[1],
          optionB: translatedTexts[2],
          optionC: translatedTexts[3],
          optionD: translatedTexts[4],
          explanation: translatedTexts[5] || null,
          topic: translatedTexts[6] || q.topic,
          topicKey: q.topic_key,
          level: q.level,
          baseId: q.base_id,
          correctOption: q.correct_option,
          questionType: 'image',
          locale: strapiLocale,
          imageId,
        };

        translated++;

        // Criar via API
        try {
          await createQuestionInStrapi(translatedQuestion, strapiLocale);
          console.log(`   ✅ ${strapiLocale.toUpperCase()}: criada (com imagem)`);
          created++;
        } catch (apiError) {
          console.log(`   ⚠️  ${strapiLocale.toUpperCase()}: traduzida mas não criada - ${apiError.message}`);
        }

        // Pausa para não exceder rate limit do DeepL
        await new Promise(r => setTimeout(r, 300));

      } catch (error) {
        console.log(`   ❌ ${strapiLocale.toUpperCase()}: erro - ${error.message}`);
        errors++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Concluído!`);
  console.log(`   Traduzidas: ${translated}`);
  console.log(`   Criadas via API: ${created}`);
  console.log(`   Já existiam: ${skipped}`);
  console.log(`   Erros: ${errors}`);
}

main().catch(console.error);
