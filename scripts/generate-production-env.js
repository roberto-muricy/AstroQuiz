#!/usr/bin/env node

/**
 * 🚂 Production Environment Variables Generator for Railway
 * Generates secure keys specifically for production deployment
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  underline: '\x1b[4m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🚂 ${msg}${colors.reset}`),
  section: (msg) => console.log(`${colors.bold}${colors.cyan}\n📋 ${msg}${colors.reset}`),
  variable: (key, value) => console.log(`${colors.magenta}${key}${colors.reset}=${colors.green}${value}${colors.reset}`)
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
 * Generate all production environment variables
 * @returns {Object} Object containing all production variables
 */
function generateProductionEnv() {
  return {
    // Security Keys (Different from development!)
    APP_KEYS: generateAppKeys(),
    API_TOKEN_SALT: generateSecureKey(32),
    ADMIN_JWT_SECRET: generateSecureKey(32),
    TRANSFER_TOKEN_SALT: generateSecureKey(32),
    JWT_SECRET: generateSecureKey(32),
    
    // Application Configuration
    NODE_ENV: 'production',
    
    // DeepL Configuration
    DEEPL_API_KEY: process.env.DEEPL_API_KEY || '9f331073-436a-407d-b9d8-d4076fc4415c:fx',
    DEEPL_API_URL: 'https://api.deepl.com/v2',
    
    // Analytics & Monitoring
    STRAPI_TELEMETRY_DISABLED: 'true',
    
    // Database (Railway provides DATABASE_URL automatically)
    DATABASE_SSL: 'true',
    DATABASE_SSL_SELF: 'false',
    DATABASE_POOL_MIN: '2',
    DATABASE_POOL_MAX: '10',
    
    // CORS Configuration
    CORS_ORIGINS: 'https://your-frontend-domain.com,https://localhost:3000',
    
    // Admin Configuration
    ADMIN_PATH: '/admin',
    SERVE_ADMIN: 'true',
    
    // Performance
    CRON_ENABLED: 'false',
    WEBHOOKS_POPULATE_RELATIONS: 'false'
  };
}

/**
 * Create Railway environment variables file
 * @param {Object} vars - Environment variables object
 */
function createRailwayEnvFile(vars) {
  const envContent = `# 🚂 Railway Production Environment Variables
# Generated on ${new Date().toISOString()}
# Copy these to Railway Dashboard → Project → Variables

# 🔐 Security Keys (PRODUCTION - Different from development!)
APP_KEYS=${vars.APP_KEYS}
API_TOKEN_SALT=${vars.API_TOKEN_SALT}
ADMIN_JWT_SECRET=${vars.ADMIN_JWT_SECRET}
TRANSFER_TOKEN_SALT=${vars.TRANSFER_TOKEN_SALT}
JWT_SECRET=${vars.JWT_SECRET}

# 🌍 Application Configuration
NODE_ENV=${vars.NODE_ENV}

# 🔤 Translation API
DEEPL_API_KEY=${vars.DEEPL_API_KEY}
DEEPL_API_URL=${vars.DEEPL_API_URL}

# 📊 Analytics & Monitoring
STRAPI_TELEMETRY_DISABLED=${vars.STRAPI_TELEMETRY_DISABLED}

# 🗄️ Database Configuration
DATABASE_SSL=${vars.DATABASE_SSL}
DATABASE_SSL_SELF=${vars.DATABASE_SSL_SELF}
DATABASE_POOL_MIN=${vars.DATABASE_POOL_MIN}
DATABASE_POOL_MAX=${vars.DATABASE_POOL_MAX}

# 🌐 CORS Configuration
CORS_ORIGINS=${vars.CORS_ORIGINS}

# 🏛️ Admin Panel
ADMIN_PATH=${vars.ADMIN_PATH}
SERVE_ADMIN=${vars.SERVE_ADMIN}

# 🚀 Performance
CRON_ENABLED=${vars.CRON_ENABLED}
WEBHOOKS_POPULATE_RELATIONS=${vars.WEBHOOKS_POPULATE_RELATIONS}

# 🔗 Railway Auto-Provided Variables:
# DATABASE_URL=postgresql://... (Railway provides automatically)
# RAILWAY_STATIC_URL=your-app.railway.app (Railway provides automatically)
# PORT=... (Railway provides automatically)

# ⚠️  IMPORTANT NOTES:
# 1. DATABASE_URL is provided automatically by Railway PostgreSQL
# 2. RAILWAY_STATIC_URL is provided automatically by Railway
# 3. These keys are DIFFERENT from your development keys
# 4. Never commit these keys to Git
# 5. Set these in Railway Dashboard → Variables tab
`;

  const filePath = path.join(process.cwd(), 'railway-production.env');
  
  try {
    fs.writeFileSync(filePath, envContent);
    return filePath;
  } catch (error) {
    log.error(`Failed to create railway-production.env: ${error.message}`);
    return null;
  }
}

/**
 * Display variables in Railway format
 * @param {Object} vars - Environment variables object
 */
function displayRailwayFormat(vars) {
  log.section('Railway Dashboard Variables');
  console.log('Copy each variable to Railway Dashboard → Project → Variables:\n');
  
  Object.entries(vars).forEach(([key, value]) => {
    log.variable(key, value);
  });
  
  console.log('\n');
  log.info('Additional Railway-provided variables:');
  console.log(`${colors.cyan}DATABASE_URL${colors.reset}=${colors.yellow}(automatically provided by Railway PostgreSQL)${colors.reset}`);
  console.log(`${colors.cyan}RAILWAY_STATIC_URL${colors.reset}=${colors.yellow}(automatically provided by Railway)${colors.reset}`);
  console.log(`${colors.cyan}PORT${colors.reset}=${colors.yellow}(automatically provided by Railway)${colors.reset}`);
}

/**
 * Create deployment checklist
 */
function createDeploymentChecklist() {
  const checklist = `# 🚂 Railway Deployment Checklist

## ✅ Pre-Deployment
- [ ] Repository pushed to GitHub
- [ ] All tests passing: \`npm run test:all\`
- [ ] Production environment variables generated
- [ ] Health check endpoint working: \`/api/health\`

## 🚂 Railway Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] Domain configured (optional)

## 🔧 Environment Variables
Copy these to Railway Dashboard → Variables:

### Required Variables
- [ ] \`APP_KEYS\` - Security keys for Strapi
- [ ] \`API_TOKEN_SALT\` - API token salt
- [ ] \`ADMIN_JWT_SECRET\` - Admin JWT secret
- [ ] \`TRANSFER_TOKEN_SALT\` - Transfer token salt
- [ ] \`JWT_SECRET\` - JWT secret
- [ ] \`NODE_ENV=production\` - Environment
- [ ] \`DEEPL_API_KEY\` - DeepL translation API key

### Optional Variables
- [ ] \`CORS_ORIGINS\` - Allowed frontend domains
- [ ] \`ADMIN_PATH=/admin\` - Admin panel path
- [ ] \`STRAPI_TELEMETRY_DISABLED=true\` - Disable telemetry

### Auto-Provided by Railway
- [x] \`DATABASE_URL\` - PostgreSQL connection string
- [x] \`RAILWAY_STATIC_URL\` - Your app's domain
- [x] \`PORT\` - Server port

## 🚀 Deployment Process
1. Push code to GitHub main branch
2. Railway automatically builds and deploys
3. Check deployment logs in Railway dashboard
4. Test endpoints after deployment

## ✅ Post-Deployment Verification
- [ ] Health check: \`https://your-app.railway.app/api/health\`
- [ ] Admin panel: \`https://your-app.railway.app/admin\`
- [ ] Quiz API: \`https://your-app.railway.app/api/quiz/health\`
- [ ] Questions API: \`https://your-app.railway.app/api/questions\`
- [ ] Database connectivity working
- [ ] DeepL translation working (if configured)

## 🔧 Troubleshooting
If deployment fails, check:
1. Railway deployment logs
2. Environment variables are set correctly
3. Database connection is established
4. All required dependencies are in package.json

---

Generated on ${new Date().toISOString()}
`;

  const checklistPath = path.join(process.cwd(), 'docs', 'RAILWAY_DEPLOYMENT_CHECKLIST.md');
  
  try {
    fs.writeFileSync(checklistPath, checklist);
    return checklistPath;
  } catch (error) {
    log.error(`Failed to create deployment checklist: ${error.message}`);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        🚂 Railway Production Environment Generator        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  log.warning('Generating NEW production keys (different from development)');
  
  // Generate production environment variables
  log.info('Generating production environment variables...');
  const productionVars = generateProductionEnv();
  
  // Create Railway environment file
  log.info('Creating railway-production.env file...');
  const envFilePath = createRailwayEnvFile(productionVars);
  if (envFilePath) {
    log.success(`Environment file created: ${envFilePath}`);
  }
  
  // Create deployment checklist
  log.info('Creating deployment checklist...');
  const checklistPath = createDeploymentChecklist();
  if (checklistPath) {
    log.success(`Deployment checklist created: ${checklistPath}`);
  }
  
  // Display variables in Railway format
  displayRailwayFormat(productionVars);
  
  // Final instructions
  console.log(`${colors.bold}${colors.green}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║             🎉 Production Variables Ready!               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  log.success('Production environment variables generated!');
  log.info('Next steps:');
  console.log('  1. Copy variables to Railway Dashboard → Variables');
  console.log('  2. Add PostgreSQL database in Railway');
  console.log('  3. Deploy: git push origin main');
  console.log('  4. Verify: npm run deploy:verify');
  console.log('');
  log.warning('SECURITY REMINDERS:');
  console.log('  • These keys are for PRODUCTION only');
  console.log('  • Never commit railway-production.env to Git');
  console.log('  • Use different keys than development');
  console.log('  • Railway provides DATABASE_URL automatically');
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
    log.error(`Production key generation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { generateProductionEnv, createRailwayEnvFile, createDeploymentChecklist };
