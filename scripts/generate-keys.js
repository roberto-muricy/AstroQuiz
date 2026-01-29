/**
 * Generate Strapi secrets for local development.
 *
 * This script does NOT write files by default (safe).
 * It prints values you can paste into `.env`.
 *
 * Usage:
 *   node scripts/generate-keys.js
 */

'use strict';

const crypto = require('crypto');

const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64');

const appKeys = [rand(), rand(), rand(), rand()].join(',');

console.log('# 🔐 Generated Strapi keys (DEV)');
console.log(`APP_KEYS=${appKeys}`);
console.log(`API_TOKEN_SALT=${rand()}`);
console.log(`ADMIN_JWT_SECRET=${rand()}`);
console.log(`TRANSFER_TOKEN_SALT=${rand()}`);
console.log(`JWT_SECRET=${rand()}`);

