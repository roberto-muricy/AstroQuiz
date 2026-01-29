/**
 * Generate Railway env file for staging/production.
 *
 * Usage:
 *   node scripts/generate-railway-env.js staging
 *   node scripts/generate-railway-env.js production
 *
 * Output:
 *   railway-<env>.env  (gitignored)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envName = (process.argv[2] || 'staging').toLowerCase();
if (!['staging', 'production'].includes(envName)) {
  console.error(`Invalid env "${envName}". Use "staging" or "production".`);
  process.exit(1);
}

const now = new Date().toISOString();
const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64');
const appKeys = [rand(), rand(), rand(), rand()].join(',');

const lines = [
  `# 🚂 Railway ${envName.toUpperCase()} Environment Variables`,
  `# Generated on ${now}`,
  `# Copy these to Railway Dashboard → Project → Variables`,
  ``,
  `# 🔐 Security Keys (${envName.toUpperCase()} - keep secret!)`,
  `APP_KEYS=${appKeys}`,
  `API_TOKEN_SALT=${rand()}`,
  `ADMIN_JWT_SECRET=${rand()}`,
  `TRANSFER_TOKEN_SALT=${rand()}`,
  `JWT_SECRET=${rand()}`,
  ``,
  `# 🌍 Application`,
  `NODE_ENV=production`,
  `ADMIN_PATH=/admin`,
  `SERVE_ADMIN=true`,
  `STRAPI_TELEMETRY_DISABLED=true`,
  `STRAPI_DISABLE_UPDATE_NOTIFICATION=true`,
  `STRAPI_HIDE_STARTUP_MESSAGE=true`,
  ``,
  `# 🌐 CORS (ajuste conforme seus frontends)`,
  `CORS_ORIGINS=https://your-frontend-domain.com,https://localhost:3000`,
  ``,
  `# 🔤 Translation API (opcional)`,
  `# DEEPL_API_KEY=...`,
  `DEEPL_API_URL=https://api.deepl.com/v2`,
  ``,
  `# 🗄️ Database`,
  `# DATABASE_URL is auto-provided by Railway PostgreSQL service.`,
  `# (Não adicione manualmente se estiver usando o serviço Postgres do Railway)`,
  ``,
  `# 🔎 Notes`,
  `# - Never commit this file.`,
  `# - Rotate secrets if they were exposed.`,
];

// Always write to the Strapi project root (astroquiz-backend),
// regardless of current working directory.
const projectRoot = path.resolve(__dirname, '..');
const outPath = path.join(projectRoot, `railway-${envName}.env`);
fs.writeFileSync(outPath, lines.join('\n') + '\n', { encoding: 'utf8' });

console.log(`✅ Generated: ${outPath}`);
