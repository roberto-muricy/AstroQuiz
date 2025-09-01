#!/usr/bin/env node

/**
 * Migration Setup Script
 * Helps configure the Firebase to Strapi migration
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupMigration() {
  console.log('🔧 Firebase to Strapi Migration Setup\n');

  try {
    // Check if Firebase service account exists
    const serviceAccountPath = path.resolve('./firebase-service-account.json');
    
    try {
      await fs.access(serviceAccountPath);
      console.log('✅ Firebase service account file found');
    } catch {
      console.log('❌ Firebase service account file not found');
      console.log('\n📋 To set up Firebase:');
      console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
      console.log('2. Click "Generate new private key"');
      console.log('3. Save the file as "firebase-service-account.json" in the project root');
      console.log('4. Make sure your Firebase project has a Firestore database');
      
      const continueSetup = await question('\nDo you want to continue setup? (y/n): ');
      if (continueSetup.toLowerCase() !== 'y') {
        console.log('Setup cancelled');
        process.exit(0);
      }
    }

    // Get Firebase project info
    const projectId = await question('Enter your Firebase Project ID: ');
    const databaseURL = `https://${projectId}-default-rtdb.firebaseio.com`;
    
    console.log(`\n📝 Configuration:`);
    console.log(`   Firebase Project: ${projectId}`);
    console.log(`   Database URL: ${databaseURL}`);
    console.log(`   Strapi URL: http://localhost:1337`);

    // Test Strapi connection
    console.log('\n🔗 Testing Strapi connection...');
    const axios = require('axios');
    
    try {
      await axios.get('http://localhost:1337/api/questions');
      console.log('✅ Strapi connection successful');
    } catch (error) {
      console.log('❌ Strapi connection failed');
      console.log('Make sure Strapi is running: npm run develop');
      
      const continueAnyway = await question('Continue anyway? (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        process.exit(1);
      }
    }

    // Update migration script with project info
    const migrationScriptPath = './scripts/migrate-from-firebase.js';
    let scriptContent = await fs.readFile(migrationScriptPath, 'utf8');
    
    // Replace placeholder values
    scriptContent = scriptContent.replace(
      'https://your-project-id.firebaseio.com',
      databaseURL
    );
    
    await fs.writeFile(migrationScriptPath, scriptContent);
    console.log('✅ Migration script updated with your Firebase project info');

    // Create sample Firebase service account template if needed
    try {
      await fs.access(serviceAccountPath);
    } catch {
      const template = {
        "type": "service_account",
        "project_id": projectId,
        "private_key_id": "YOUR_PRIVATE_KEY_ID",
        "private_key": "YOUR_PRIVATE_KEY",
        "client_email": `firebase-adminsdk-xxxxx@${projectId}.iam.gserviceaccount.com`,
        "client_id": "YOUR_CLIENT_ID",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40${projectId}.iam.gserviceaccount.com`
      };
      
      await fs.writeFile(
        'firebase-service-account.template.json', 
        JSON.stringify(template, null, 2)
      );
      console.log('📄 Created firebase-service-account.template.json');
      console.log('   Replace with your actual service account data');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Ensure firebase-service-account.json has your real Firebase credentials');
    console.log('2. Make sure Strapi is running: npm run develop');
    console.log('3. Run the migration: node scripts/migrate-from-firebase.js');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setupMigration();
