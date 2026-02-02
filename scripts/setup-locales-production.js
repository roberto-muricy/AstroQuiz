#!/usr/bin/env node
/**
 * Setup i18n locales in production database
 * This is required before importing multilingual content
 */

require('dotenv').config();

const PRODUCTION_URL = 'https://astroquiz-production.up.railway.app';
const writeToken = process.env.STRAPI_WRITE_TOKEN;

const locales = [
  { code: 'en', name: 'English (en)', isDefault: true },
  { code: 'pt', name: 'Portuguese (pt)', isDefault: false },
  { code: 'es', name: 'Spanish (es)', isDefault: false },
  { code: 'fr', name: 'French (fr)', isDefault: false },
];

async function setupLocales() {
  console.log('🌍 Configurando locales no Strapi de produção...\n');

  for (const locale of locales) {
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/i18n/locales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${writeToken}`,
        },
        body: JSON.stringify(locale),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✓ ${locale.code}: ${locale.name} criado`);
      } else if (response.status === 400) {
        const error = await response.json();
        if (error.message?.includes('already exists')) {
          console.log(`→ ${locale.code}: já existe`);
        } else {
          console.log(`✗ ${locale.code}: ${error.message}`);
        }
      } else {
        const error = await response.json();
        console.log(`✗ ${locale.code}: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.log(`✗ ${locale.code}: ${error.message}`);
    }
  }

  console.log('\n✅ Configuração concluída!');
}

setupLocales().catch(console.error);
