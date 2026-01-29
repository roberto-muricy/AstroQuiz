/**
 * Script para migrar perguntas de imagem para o Strapi via API
 * Cria via API (para estrutura correta) e ajusta locale no banco
 */

const fs = require('fs');
const path = require('path');

const STRAPI_URL = 'http://localhost:1337';
const DB_PATH = path.join(__dirname, '../.tmp/data.db');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Iniciando migração de perguntas de imagem...\n');

  // 1. Carregar dados exportados
  const questionsData = JSON.parse(fs.readFileSync('/tmp/image_questions.json', 'utf8'));
  const uniqueBaseIds = new Set(questionsData.map(q => q.baseId));
  console.log(`📊 ${questionsData.length} perguntas para migrar (${uniqueBaseIds.size} únicas em 4 idiomas)\n`);

  // 2. Conectar ao banco
  const sqlite3 = require('better-sqlite3');
  const db = sqlite3(DB_PATH);

  console.log('📝 Criando perguntas via API do Strapi...\n');

  let created = 0;
  let errors = 0;

  for (const q of questionsData) {
    try {
      // Criar via API (vai criar em EN por padrão)
      const response = await fetch(`${STRAPI_URL}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation || '',
            level: q.level,
            topicKey: q.topicKey || null,
            questionType: 'image',
            baseId: q.baseId
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`\n   ❌ ${q.baseId} (${q.locale}): ${errText.substring(0, 100)}`);
        errors++;
        continue;
      }

      const result = await response.json();
      const newId = result.data.id;

      // Atualizar locale no banco (API cria sempre em EN)
      if (q.locale !== 'en') {
        db.prepare(`UPDATE questions SET locale = ? WHERE id = ?`).run(q.locale, newId);
      }

      // Vincular imagem
      if (q.fileId) {
        db.prepare(`
          INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
          VALUES (?, ?, 'api::question.question', 'image', 1)
        `).run(q.fileId, newId);
      }

      created++;
      process.stdout.write(`\r   ✅ Criadas: ${created}/${questionsData.length}`);

      await delay(30);

    } catch (e) {
      console.log(`\n   ❌ ${q.baseId} (${q.locale}): ${e.message}`);
      errors++;
    }
  }

  db.close();

  console.log('\n\n' + '='.repeat(50));
  console.log(`✅ Migração concluída!`);
  console.log(`   - Criadas: ${created} perguntas`);
  console.log(`   - Erros: ${errors}`);
  console.log('\n💡 Verifique o Strapi Admin!');
}

main().catch(console.error);
