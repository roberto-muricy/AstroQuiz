#!/usr/bin/env node

/**
 * Debug grouping algorithm
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function debugGrouping() {
  try {
    console.log('🔍 Debugging question grouping...\n');

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
    const snapshot = await questionsRef.limit(20).get(); // Just first 20 for debugging
    
    const questions = [];
    snapshot.forEach(doc => {
      questions.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 Analyzing first ${questions.length} questions...\n`);

    // Group by language
    const byLanguage = {};
    questions.forEach(q => {
      if (!byLanguage[q.language]) byLanguage[q.language] = [];
      byLanguage[q.language].push(q);
    });

    console.log('📈 Questions by language:');
    Object.entries(byLanguage).forEach(([lang, qs]) => {
      console.log(`   ${lang}: ${qs.length} questions`);
    });

    // Show first question of each language to see if they're similar
    console.log('\n🔍 First question of each language:');
    Object.entries(byLanguage).forEach(([lang, qs]) => {
      if (qs.length > 0) {
        const q = qs[0];
        console.log(`\n--- ${lang.toUpperCase()} ---`);
        console.log(`ID: ${q.id}`);
        console.log(`Question: ${q.question?.substring(0, 80)}...`);
        console.log(`Options: [${q.options?.[0]?.substring(0, 20)}..., ${q.options?.[1]?.substring(0, 20)}...]`);
        console.log(`Correct: ${q.correctAnswer}`);
        console.log(`Theme: ${q.theme}`);
        
        // Show content key generation
        const content = (q.question || '') + (q.options ? q.options.join('') : '') + (q.correctAnswer || '').toString();
        const normalized = content
          .toLowerCase()
          .replace(/[áàâãäå]/g, 'a')
          .replace(/[éèêë]/g, 'e')
          .replace(/[íìîï]/g, 'i')
          .replace(/[óòôõö]/g, 'o')
          .replace(/[úùûü]/g, 'u')
          .replace(/[ñ]/g, 'n')
          .replace(/[ç]/g, 'c')
          .replace(/[^a-z0-9]/g, '');
        
        const contentKey = crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
        console.log(`Content Key: ${contentKey}`);
        console.log(`Normalized: ${normalized.substring(0, 50)}...`);
      }
    });

    // Try to find questions that should be grouped together
    console.log('\n🔍 Looking for potential groups...');
    
    // Manual check: look for questions with similar themes
    const themes = {};
    questions.forEach(q => {
      const theme = q.theme || 'unknown';
      if (!themes[theme]) themes[theme] = [];
      themes[theme].push({ lang: q.language, question: q.question?.substring(0, 50) });
    });

    Object.entries(themes).forEach(([theme, qs]) => {
      if (qs.length > 1) {
        console.log(`\n📚 Theme: "${theme}" (${qs.length} questions)`);
        qs.forEach(q => {
          console.log(`   ${q.lang}: ${q.question}...`);
        });
      }
    });

    process.exit(0);
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    process.exit(1);
  }
}

debugGrouping();
