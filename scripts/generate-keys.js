#!/usr/bin/env node

/**
 * 🔑 Secure Keys Generator for AstroQuiz
 * Generates cryptographically secure keys for Strapi configuration
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🔑 ${msg}${colors.reset}`)
};

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} Base64 encoded random string
 */
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate APP_KEYS (4 comma-separated keys)
 * @returns {string} Four keys separated by commas
 */
function generateAppKeys() {
  const keys = [];
  for (let i = 0; i < 4; i++) {
    keys.push(generateSecureKey(32));
  }
  return keys.join(',');
}

/**
 * Generate all required Strapi keys
 * @returns {Object} Object containing all generated keys
 */
function generateAllKeys() {
  return {
    APP_KEYS: generateAppKeys(),
    API_TOKEN_SALT: generateSecureKey(32),
    ADMIN_JWT_SECRET: generateSecureKey(32),
    TRANSFER_TOKEN_SALT: generateSecureKey(32),
    JWT_SECRET: generateSecureKey(32)
  };
}

/**
 * Create .env file with generated keys
 * @param {Object} keys - Generated keys object
 * @param {string} deeplApiKey - DeepL API key (optional)
 */
function createEnvFile(keys, deeplApiKey = '') {
  const envContent = `# 🌍 AstroQuiz Local Development Environment
# Generated on ${new Date().toISOString()}
# ⚠️  DO NOT COMMIT THIS FILE TO GIT

# 🏗️ Application Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=development

# 🔐 Strapi Security Keys (Auto-generated)
APP_KEYS=${keys.APP_KEYS}
API_TOKEN_SALT=${keys.API_TOKEN_SALT}
ADMIN_JWT_SECRET=${keys.ADMIN_JWT_SECRET}
TRANSFER_TOKEN_SALT=${keys.TRANSFER_TOKEN_SALT}
JWT_SECRET=${keys.JWT_SECRET}

# 🗄️ Database Configuration (Development - SQLite)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# 🌐 Admin Configuration
ADMIN_PATH=/admin
STRAPI_ADMIN_BACKEND_URL=http://localhost:1337

# 🔤 Translation API
DEEPL_API_KEY=${deeplApiKey}
DEEPL_API_URL=https://api.deepl.com/v2

# 📊 Analytics & Monitoring
STRAPI_TELEMETRY_DISABLED=true

# 🚀 Production Notes:
# - Railway will provide DATABASE_URL automatically
# - Set NODE_ENV=production in Railway dashboard
# - Generate new keys for production deployment
`;

  const envPath = path.join(process.cwd(), '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    return true;
  } catch (error) {
    log.error(`Failed to create .env file: ${error.message}`);
    return false;
  }
}

/**
 * Update .env.example template
 */
function updateEnvExample() {
  const exampleContent = `# 🌍 AstroQuiz Environment Variables Template
# Copy this file to .env and run 'npm run generate-keys' to populate

# 🏗️ Application Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=development

# 🔐 Strapi Security Keys (Generate with: npm run generate-keys)
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

# 🗄️ Database Configuration
# Development (SQLite)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Production (Railway PostgreSQL - automatically provided)
# DATABASE_URL=postgresql://user:password@host:port/database

# 🌐 Admin Configuration
ADMIN_PATH=/admin
STRAPI_ADMIN_BACKEND_URL=http://localhost:1337

# 🔤 Translation API
DEEPL_API_KEY=your-deepl-api-key-here
DEEPL_API_URL=https://api.deepl.com/v2

# 📊 Analytics & Monitoring
STRAPI_TELEMETRY_DISABLED=true

# 🚀 Railway Production Variables (Set in Railway Dashboard):
# - NODE_ENV=production
# - APP_KEYS=generate-new-production-keys
# - API_TOKEN_SALT=generate-new-salt
# - ADMIN_JWT_SECRET=generate-new-jwt
# - TRANSFER_TOKEN_SALT=generate-new-salt
# - JWT_SECRET=generate-new-jwt
# - DEEPL_API_KEY=your-production-deepl-key
# - DATABASE_URL=automatically-provided-by-railway
`;

  const examplePath = path.join(process.cwd(), '.env.example');
  
  try {
    fs.writeFileSync(examplePath, exampleContent);
    return true;
  } catch (error) {
    log.error(`Failed to update .env.example: ${error.message}`);
    return false;
  }
}

/**
 * Display generated keys (for manual setup)
 * @param {Object} keys - Generated keys object
 */
function displayKeys(keys) {
  log.header('Generated Security Keys');
  console.log('Copy these to your Railway environment variables:\n');
  
  Object.entries(keys).forEach(([key, value]) => {
    console.log(`${colors.blue}${key}${colors.reset}=${colors.green}${value}${colors.reset}`);
  });
  
  console.log('\n');
  log.warning('These keys are for DEVELOPMENT only!');
  log.warning('Generate NEW keys for production deployment!');
}

/**
 * Check if .env already exists
 * @returns {boolean} True if .env exists
 */
function envExists() {
  const envPath = path.join(process.cwd(), '.env');
  return fs.existsSync(envPath);
}

/**
 * Main execution function
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            🔑 AstroQuiz Secure Keys Generator            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  // Check if .env already exists
  if (envExists()) {
    log.warning('.env file already exists!');
    
    // Ask user if they want to overwrite (in a real scenario)
    // For now, we'll create a backup
    const backupPath = path.join(process.cwd(), '.env.backup');
    try {
      fs.copyFileSync('.env', backupPath);
      log.info(`Backup created: .env.backup`);
    } catch (error) {
      log.error(`Failed to create backup: ${error.message}`);
    }
  }
  
  // Generate keys
  log.info('Generating cryptographically secure keys...');
  const keys = generateAllKeys();
  
  // Get DeepL API key from command line or use existing
  const deeplApiKey = process.argv[2] || process.env.DEEPL_API_KEY || '9f331073-436a-407d-b9d8-d4076fc4415c:fx';
  
  // Create .env file
  log.info('Creating .env file...');
  if (createEnvFile(keys, deeplApiKey)) {
    log.success('.env file created successfully!');
  } else {
    process.exit(1);
  }
  
  // Update .env.example
  log.info('Updating .env.example template...');
  if (updateEnvExample()) {
    log.success('.env.example updated successfully!');
  }
  
  // Display keys for manual setup
  displayKeys(keys);
  
  // Final instructions
  console.log(`${colors.bold}${colors.green}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 Setup Complete!                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  log.success('Local development environment is ready!');
  log.info('Next steps:');
  console.log('  1. Start development server: npm run develop');
  console.log('  2. Open admin panel: http://localhost:1337/admin');
  console.log('  3. Test API health: http://localhost:1337/api/quiz/health');
  console.log('');
  log.info('For Railway deployment:');
  console.log('  1. Copy the keys above to Railway environment variables');
  console.log('  2. Set NODE_ENV=production in Railway dashboard');
  console.log('  3. Railway will provide DATABASE_URL automatically');
  console.log('');
  log.warning('Remember: NEVER commit .env to Git!');
}

// Handle errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Key generation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { generateAllKeys, createEnvFile, updateEnvExample };
