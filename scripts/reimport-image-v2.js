const fs = require('fs');

const API_URL = 'http://localhost:1337/api/questions';

async function createQuestion(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function createLocalization(documentId, locale, data) {
  // Strapi v5 i18n: Create localization via PUT to the document
  const url = `${API_URL}/${documentId}?locale=${locale}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Localization error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  // Load backup
  const backup = JSON.parse(fs.readFileSync('image-questions-backup.json', 'utf8'));
  const baseIds = Object.keys(backup);

  console.log(`\n🚀 Reimportando ${baseIds.length} perguntas de imagem via API...\n`);

  let created = 0;
  let errors = 0;

  for (const baseId of baseIds) {
    const translations = backup[baseId];

    try {
      // Use English data (fix: the backup has pt data in en key, so we'll keep it as is)
      const enData = translations.en;

      // Create in default locale (en) first
      const apiData = {
        question: enData.question,
        optionA: enData.optionA,
        optionB: enData.optionB,
        optionC: enData.optionC,
        optionD: enData.optionD,
        correctOption: enData.correctOption,
        explanation: enData.explanation,
        level: enData.level,
        topicKey: enData.topicKey,
        baseId: baseId,
        questionType: 'image'
      };

      const result = await createQuestion(apiData);
      const documentId = result.data.documentId;

      // Now create translations for other locales
      for (const locale of ['pt', 'es', 'fr']) {
        const localeData = translations[locale];
        if (!localeData) continue;

        const translationData = {
          question: localeData.question,
          optionA: localeData.optionA,
          optionB: localeData.optionB,
          optionC: localeData.optionC,
          optionD: localeData.optionD,
          explanation: localeData.explanation
        };

        await createLocalization(documentId, locale, translationData);
      }

      created++;
      process.stdout.write(`   ✅ ${created}/${baseIds.length} - ${baseId}\r`);

    } catch (err) {
      console.log(`\n   ❌ ${baseId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`✅ Importação concluída!`);
  console.log(`   - Criadas: ${created}`);
  console.log(`   - Erros: ${errors}`);

  // Verify via API
  console.log(`\n📊 Verificando via API...`);
  const response = await fetch(`${API_URL}?pagination[pageSize]=200`);
  const data = await response.json();
  const imageCount = data.data?.filter(q => q.questionType === 'image').length || 0;
  console.log(`   Perguntas de imagem encontradas: ${imageCount}`);
}

main().catch(console.error);
