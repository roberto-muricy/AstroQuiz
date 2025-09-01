#!/usr/bin/env node

/**
 * Check how questions are organized in Firebase
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function checkOrganization() {
  try {
    console.log('🔍 Checking Firebase question organization...\n');

    // Initialize Firebase
    const serviceAccountPath = path.resolve('./firebase-service-account.json');
    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://astroquiz-3a316-default-rtdb.firebaseio.com'
      });
    }

    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    // Get all questions to see the full pattern
    const snapshot = await questionsRef.get();
    
    const questions = [];
    snapshot.forEach(doc => {
      questions.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 Total questions: ${questions.length}\n`);

    // Analyze language distribution in order
    console.log('📈 Language distribution in order (first 50):');
    questions.slice(0, 50).forEach((q, index) => {
      console.log(`${index + 1}: ${q.language} - ${q.theme} - ${q.question?.substring(0, 40)}...`);
    });

    // Check if there's a pattern
    console.log('\n🔍 Language pattern analysis:');
    const languagePattern = questions.slice(0, 100).map(q => q.language);
    console.log('First 100 languages:', languagePattern.join(', '));

    // Group by language to see distribution
    const byLanguage = {};
    questions.forEach((q, index) => {
      if (!byLanguage[q.language]) byLanguage[q.language] = [];
      byLanguage[q.language].push({ index, id: q.id, theme: q.theme });
    });

    console.log('\n📊 Questions by language with positions:');
    Object.entries(byLanguage).forEach(([lang, qs]) => {
      console.log(`\n${lang.toUpperCase()}: ${qs.length} questions`);
      console.log(`First 5 positions: ${qs.slice(0, 5).map(q => q.index).join(', ')}`);
      console.log(`Last 5 positions: ${qs.slice(-5).map(q => q.index).join(', ')}`);
    });

    // Look for questions that might be the same in different languages
    console.log('\n🔍 Looking for same questions in different languages...');
    
    // Try to find questions with the same theme and similar structure
    const themeGroups = {};
    questions.forEach(q => {
      const theme = q.theme || 'unknown';
      if (!themeGroups[theme]) themeGroups[theme] = {};
      if (!themeGroups[theme][q.language]) themeGroups[theme][q.language] = [];
      themeGroups[theme][q.language].push(q);
    });

    // Show themes that have multiple languages
    Object.entries(themeGroups).forEach(([theme, languages]) => {
      const langCount = Object.keys(languages).length;
      if (langCount > 1) {
        console.log(`\n📚 Theme: "${theme}" has ${langCount} languages:`);
        Object.entries(languages).forEach(([lang, qs]) => {
          console.log(`   ${lang}: ${qs.length} questions`);
          if (qs.length > 0) {
            console.log(`      Sample: ${qs[0].question?.substring(0, 50)}...`);
          }
        });
      }
    });

    process.exit(0);
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
    process.exit(1);
  }
}

checkOrganization();
