#!/usr/bin/env node

/**
 * 🚂 Railway-specific build script
 * Handles build-time configuration and environment setup
 */

const { execSync } = require('child_process');
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
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🚂 ${msg}${colors.reset}`)
};

/**
 * Check if we're in Railway environment
 */
function isRailwayEnvironment() {
  return !!(process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT);
}

/**
 * Setup environment variables for build
 */
function setupBuildEnvironment() {
  log.info('Setting up build environment...');
  
  // Ensure NODE_ENV is set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    log.info('Set NODE_ENV=production');
  }
  
  // Disable telemetry during build
  process.env.STRAPI_TELEMETRY_DISABLED = 'true';
  
  // Set build-specific flags
  process.env.STRAPI_DISABLE_UPDATE_NOTIFICATION = 'true';
  process.env.STRAPI_HIDE_STARTUP_MESSAGE = 'true';
  
  log.success('Build environment configured');
}

/**
 * Check for required dependencies
 */
function checkDependencies() {
  log.info('Checking dependencies...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log.error('package.json not found');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check for essential dependencies
  const requiredDeps = ['@strapi/strapi', 'pg', 'axios'];
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missingDeps.length > 0) {
    log.error(`Missing dependencies: ${missingDeps.join(', ')}`);
    process.exit(1);
  }
  
  log.success('Dependencies check passed');
}

/**
 * Run Strapi build with proper error handling
 */
function buildStrapi() {
  log.header('Building Strapi Application');
  
  try {
    // Run the build command
    execSync('npx strapi build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        STRAPI_TELEMETRY_DISABLED: 'true'
      }
    });
    
    log.success('Strapi build completed successfully');
    
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    
    // Try alternative build approach
    log.warning('Attempting alternative build approach...');
    
    try {
      execSync('npx strapi build --no-optimization', {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          STRAPI_TELEMETRY_DISABLED: 'true'
        }
      });
      
      log.success('Alternative build completed successfully');
      
    } catch (altError) {
      log.error(`Alternative build also failed: ${altError.message}`);
      process.exit(1);
    }
  }
}

/**
 * Verify build output
 */
function verifyBuild() {
  log.info('Verifying build output...');
  
  const buildDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(buildDir)) {
    log.error('Build directory not found');
    process.exit(1);
  }
  
  const adminBuildPath = path.join(buildDir, 'build');
  if (!fs.existsSync(adminBuildPath)) {
    log.warning('Admin build directory not found - this may be normal for API-only builds');
  } else {
    log.success('Admin build verified');
  }
  
  log.success('Build verification completed');
}

/**
 * Main build process
 */
async function main() {
  log.header('Railway Build Process Starting');
  
  if (isRailwayEnvironment()) {
    log.info('Detected Railway environment');
  } else {
    log.info('Running in local environment');
  }
  
  try {
    // Step 1: Setup environment
    setupBuildEnvironment();
    
    // Step 2: Check dependencies
    checkDependencies();
    
    // Step 3: Build Strapi
    buildStrapi();
    
    // Step 4: Verify build
    verifyBuild();
    
    log.header('🎉 Build Process Completed Successfully!');
    
  } catch (error) {
    log.error(`Build process failed: ${error.message}`);
    process.exit(1);
  }
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
    log.error(`Build script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, setupBuildEnvironment, checkDependencies, buildStrapi };
