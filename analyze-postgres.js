require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();

    console.log('=== ANÁLISE DO POSTGRESQL (PRODUÇÃO) ===\n');

    // 1. Total de perguntas por locale
    console.log('1. PERGUNTAS POR LOCALE:');
    const byLocale = await client.query(`
      SELECT locale, COUNT(*) as count
      FROM questions
      GROUP BY locale
      ORDER BY locale
    `);
    byLocale.rows.forEach(r => console.log(`   ${r.locale}: ${r.count} perguntas`));

    // 2. Total geral
    console.log('\n2. TOTAL GERAL:');
    const total = await client.query('SELECT COUNT(*) as count FROM questions');
    console.log(`   Total: ${total.rows[0].count} rows na tabela questions`);

    // 3. Verificar documentIds únicos
    console.log('\n3. DOCUMENTOS ÚNICOS:');
    const uniqueDocs = await client.query(`
      SELECT COUNT(DISTINCT document_id) as count
      FROM questions
    `);
    console.log(`   DocumentIds únicos: ${uniqueDocs.rows[0].count}`);

    // 4. Verificar se há documentIds com múltiplos locales (i18n correto)
    console.log('\n4. I18N LINKING (documentIds com múltiplos locales):');
    const multiLocale = await client.query(`
      SELECT
        document_id,
        COUNT(DISTINCT locale) as locale_count,
        array_agg(DISTINCT locale ORDER BY locale) as locales,
        COUNT(*) as total_rows
      FROM questions
      GROUP BY document_id
      HAVING COUNT(DISTINCT locale) > 1
      LIMIT 5
    `);
    if (multiLocale.rows.length > 0) {
      console.log(`   ✓ ${multiLocale.rows.length} documentIds com múltiplos locales (amostra):`);
      multiLocale.rows.forEach(r => {
        console.log(`     - ${r.document_id}: ${r.locale_count} locales [${r.locales.join(', ')}]`);
      });
    } else {
      console.log('   ⚠️  Nenhum documentId com múltiplos locales encontrado');
    }

    // 5. Total de docs com múltiplos locales
    const multiCount = await client.query(`
      SELECT COUNT(*) as count FROM (
        SELECT document_id
        FROM questions
        GROUP BY document_id
        HAVING COUNT(DISTINCT locale) > 1
      ) AS multi
    `);
    console.log(`   Total: ${multiCount.rows[0].count} documentIds com múltiplos locales`);

    // 6. Verificar duplicatas (mesmo document_id + locale)
    console.log('\n5. DUPLICATAS (mesmo documentId + locale):');
    const duplicates = await client.query(`
      SELECT
        document_id,
        locale,
        COUNT(*) as count
      FROM questions
      GROUP BY document_id, locale
      HAVING COUNT(*) > 1
      LIMIT 5
    `);
    if (duplicates.rows.length > 0) {
      console.log(`   ⚠️  ${duplicates.rows.length} duplicatas encontradas:`);
      duplicates.rows.forEach(r => {
        console.log(`     - ${r.document_id} (${r.locale}): ${r.count}x`);
      });
    } else {
      console.log('   ✓ Nenhuma duplicata encontrada');
    }

    // 7. Sample: verificar um baseId específico
    console.log('\n6. EXEMPLO (baseId=q0001):');
    const sample = await client.query(`
      SELECT id, document_id, base_id, locale, question
      FROM questions
      WHERE base_id = 'q0001'
      ORDER BY locale
    `);
    if (sample.rows.length > 0) {
      sample.rows.forEach(r => {
        console.log(`   ${r.locale}: id=${r.id}, docId=${r.document_id.substring(0, 12)}..., q="${r.question.substring(0, 35)}..."`);
      });
    } else {
      console.log('   Nenhuma pergunta com baseId=q0001 encontrada');
    }

    // 8. Distribuição de locales por documentId
    console.log('\n7. DISTRIBUIÇÃO DE LOCALES POR DOCUMENTO:');
    const distribution = await client.query(`
      SELECT
        COUNT(DISTINCT locale) as locale_count,
        COUNT(*) as doc_count
      FROM (
        SELECT document_id, COUNT(DISTINCT locale) as locale_count
        FROM questions
        GROUP BY document_id
      ) AS counts
      GROUP BY locale_count
      ORDER BY locale_count
    `);
    distribution.rows.forEach(r => {
      console.log(`   Documentos com ${r.locale_count} locale(s): ${r.doc_count}`);
    });

    await client.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
