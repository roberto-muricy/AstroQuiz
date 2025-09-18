#!/usr/bin/env node

/**
 * 🚂 Railway Deployment Fix Script
 * Diagnóstica e corrige problemas comuns de deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚂 Railway Deployment Fix Script');
console.log('================================\n');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      log(`✅ ${description}: ${filePath}`, 'green');
      return true;
    } else {
      log(`❌ ${description}: ${filePath} (NOT FOUND)`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking ${description}: ${error.message}`, 'red');
    return false;
  }
}

function checkPackageJson() {
  log('\n📦 Checking package.json...', 'blue');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Verificar scripts essenciais
    const requiredScripts = ['build', 'start', 'railway:build', 'railway:start'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length === 0) {
      log('✅ All required scripts present', 'green');
    } else {
      log(`❌ Missing scripts: ${missingScripts.join(', ')}`, 'red');
    }
    
    // Verificar dependências
    const requiredDeps = ['@strapi/strapi', 'strapi'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      log('✅ All required dependencies present', 'green');
    } else {
      log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
    }
    
    return missingScripts.length === 0 && missingDeps.length === 0;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

function checkRailwayConfig() {
  log('\n🚂 Checking railway.json...', 'blue');
  
  try {
    const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
    
    // Verificar configurações essenciais
    const hasBuildCommand = railwayConfig.build && railwayConfig.build.buildCommand;
    const hasStartCommand = railwayConfig.deploy && railwayConfig.deploy.startCommand;
    
    if (hasBuildCommand && hasStartCommand) {
      log('✅ Railway configuration is valid', 'green');
      log(`   Build: ${railwayConfig.build.buildCommand}`, 'blue');
      log(`   Start: ${railwayConfig.deploy.startCommand}`, 'blue');
      return true;
    } else {
      log('❌ Railway configuration is incomplete', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error reading railway.json: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentFiles() {
  log('\n🌍 Checking environment files...', 'blue');
  
  const envFiles = [
    { path: 'env.example', description: 'Environment example' },
    { path: 'railway-production.env', description: 'Railway production env' },
    { path: 'config/env.example', description: 'Config env example' }
  ];
  
  let allPresent = true;
  envFiles.forEach(file => {
    if (!checkFile(file.path, file.description)) {
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkStrapiConfig() {
  log('\n⚙️ Checking Strapi configuration...', 'blue');
  
  const configFiles = [
    { path: 'config/admin.ts', description: 'Admin config' },
    { path: 'config/database.ts', description: 'Database config' },
    { path: 'config/server.ts', description: 'Server config' },
    { path: 'config/middlewares.ts', description: 'Middlewares config' }
  ];
  
  let allPresent = true;
  configFiles.forEach(file => {
    if (!checkFile(file.path, file.description)) {
      allPresent = false;
    }
  });
  
  return allPresent;
}

function checkBuildProcess() {
  log('\n🔨 Testing build process...', 'blue');
  
  try {
    log('Running npm run railway:build...', 'yellow');
    execSync('npm run railway:build', { stdio: 'inherit' });
    log('✅ Build completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    return false;
  }
}

function generateRailwayVariables() {
  log('\n🔐 Generating Railway variables...', 'blue');
  
  const variables = {
    'NODE_ENV': 'production',
    'STRAPI_TELEMETRY_DISABLED': 'true',
    'ADMIN_PATH': '/admin',
    'SERVE_ADMIN': 'true',
    'CORS_ORIGINS': 'https://your-frontend-domain.com,https://localhost:3000',
    'DATABASE_SSL': 'true',
    'DATABASE_SSL_SELF': 'false',
    'DATABASE_POOL_MIN': '2',
    'DATABASE_POOL_MAX': '10',
    'CRON_ENABLED': 'false',
    'WEBHOOKS_POPULATE_RELATIONS': 'false'
  };
  
  log('\n📋 Required Railway Variables:', 'yellow');
  log('Copy these to Railway Dashboard → Variables:', 'yellow');
  log('', 'reset');
  
  Object.entries(variables).forEach(([key, value]) => {
    log(`${key}=${value}`, 'blue');
  });
  
  log('\n🔑 Security Keys (from railway-production.env):', 'yellow');
  log('APP_KEYS=IcoWvDRU/pwx28mqyVmW41dqRlS8Z8hzHuHNbATxItE=,2KxRvscx7UHsMPxJzbkGSTl3Bs9UPfKZnCcmLCnz+Uc=,r0rhigOzzArZj632XYiqJGh47uc1PLtUiRsunsVG3aY=,bDjOw/FVyHVfv4KnG59fdLGLx5L9Yoa+4JciwDQ1nB8=', 'blue');
  log('API_TOKEN_SALT=JafSjJ2cPG0Q90WseZ9OWLkagdtH+cOI+PEDEqC6Qx8=', 'blue');
  log('ADMIN_JWT_SECRET=Rt3dimDAcHLsdBD+6eG5pgBeGmdp03Q8okKk8jmyKlU=', 'blue');
  log('TRANSFER_TOKEN_SALT=SwOErxKSPu1sgSwbD3lHHSb4AnO6CF4NSiI1A6Jt/Kw=', 'blue');
  log('JWT_SECRET=aTKgGFD1DmFT6jmDvlP1+HlbXXcFkTfEqyISSqIHVUI=', 'blue');
}

function generateDeployCommands() {
  log('\n🚀 Deploy Commands:', 'yellow');
  log('1. Commit changes:', 'blue');
  log('   git add .', 'blue');
  log('   git commit -m "fix: resolve railway deployment issues"', 'blue');
  log('   git push origin main', 'blue');
  log('', 'reset');
  log('2. In Railway Dashboard:', 'blue');
  log('   - Go to Variables tab', 'blue');
  log('   - Add all variables above', 'blue');
  log('   - Go to Deployments tab', 'blue');
  log('   - Click "Deploy" to force new deployment', 'blue');
}

function main() {
  log('🔍 Starting Railway deployment diagnosis...\n', 'bold');
  
  const checks = [
    { name: 'Package.json', fn: checkPackageJson },
    { name: 'Railway config', fn: checkRailwayConfig },
    { name: 'Environment files', fn: checkEnvironmentFiles },
    { name: 'Strapi config', fn: checkStrapiConfig }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (!check.fn()) {
      allPassed = false;
    }
  });
  
  log('\n📊 Diagnosis Summary:', 'bold');
  
  if (allPassed) {
    log('✅ All checks passed! Your configuration looks good.', 'green');
    log('The deployment issues might be related to:', 'yellow');
    log('- Missing environment variables in Railway', 'yellow');
    log('- Database connection issues', 'yellow');
    log('- Network/timeout issues', 'yellow');
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
  }
  
  generateRailwayVariables();
  generateDeployCommands();
  
  log('\n🎯 Next Steps:', 'bold');
  log('1. Fix any failed checks above', 'blue');
  log('2. Configure Railway variables', 'blue');
  log('3. Test build locally: npm run railway:build', 'blue');
  log('4. Deploy to Railway', 'blue');
  log('5. Monitor deployment logs', 'blue');
  
  log('\n📚 For detailed troubleshooting, see: RAILWAY_DEPLOYMENT_FIX.md', 'yellow');
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
