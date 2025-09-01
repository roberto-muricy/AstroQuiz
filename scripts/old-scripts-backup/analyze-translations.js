#!/usr/bin/env node

/**
 * Analyze translation quality in Firebase data
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function analyzeTranslations() {
  try {
    console.log('🔍 Analyzing Firebase translation quality...\n');

    // Initialize Firebase
    const serviceAccountPath = path.resolve('./firebase-service-account.json');
    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://astroquiz-3a316-default-rtdb.firebaseio.com'
    });

    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    const snapshot = await questionsRef.get();
    
    const questions = [];
    snapshot.forEach(doc => {
      questions.push(doc.data());
    });

    console.log(`📊 Total questions: ${questions.length}`);

    // Group by content similarity (same question in different languages)
    const languageStats = {
      'en': [],
      'pt': [],
      'es': [],
      'fr': []
    };

    questions.forEach(q => {
      if (languageStats[q.language]) {
        languageStats[q.language].push(q);
      }
    });

    console.log('\n📈 Questions by language:');
    Object.entries(languageStats).forEach(([lang, qs]) => {
      console.log(`   ${lang.toUpperCase()}: ${qs.length} questions`);
    });

    // Find potential translation groups by similar topics/themes
    console.log('\n🔍 Sample questions for comparison:');
    
    // Take first 3 questions of each language
    ['en', 'pt', 'es', 'fr'].forEach(lang => {
      if (languageStats[lang].length > 0) {
        const sample = languageStats[lang][0];
        console.log(`\n--- ${lang.toUpperCase()} Sample ---`);
        console.log(`Question: ${sample.question?.substring(0, 80)}...`);
        console.log(`Topic: ${sample.theme || sample.topics?.[0] || 'N/A'}`);
        console.log(`Options: ${sample.options?.[0]?.substring(0, 30)}..., ${sample.options?.[1]?.substring(0, 30)}...`);
      }
    });

    // Look for potential duplicates or similar content
    console.log('\n🔍 Looking for similar questions across languages...');
    
    const themes = new Set();
    questions.forEach(q => {
      if (q.theme) themes.add(q.theme);
      if (q.topics) q.topics.forEach(t => themes.add(t));
    });

    console.log(`\n📋 Found ${themes.size} unique themes/topics:`);
    Array.from(themes).slice(0, 10).forEach(theme => {
      console.log(`   - ${theme}`);
    });

    // Check translation consistency for same themes
    console.log('\n🌍 Translation consistency check:');
    
    const themeGroups = new Map();
    questions.forEach(q => {
      const theme = q.theme || q.topics?.[0] || 'Unknown';
      if (!themeGroups.has(theme)) {
        themeGroups.set(theme, { en: [], pt: [], es: [], fr: [] });
      }
      if (themeGroups.get(theme)[q.language]) {
        themeGroups.get(theme)[q.language].push(q);
      }
    });

    // Show themes that have questions in multiple languages
    let multiLangThemes = 0;
    themeGroups.forEach((langs, theme) => {
      const langCount = Object.values(langs).filter(arr => arr.length > 0).length;
      if (langCount > 1) {
        multiLangThemes++;
        if (multiLangThemes <= 3) { // Show first 3 examples
          console.log(`\n📚 Theme: "${theme}" (${langCount} languages)`);
          Object.entries(langs).forEach(([lang, questions]) => {
            if (questions.length > 0) {
              console.log(`   ${lang}: ${questions.length} questions - "${questions[0].question?.substring(0, 50)}..."`);
            }
          });
        }
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total themes with multiple languages: ${multiLangThemes}`);
    console.log(`   Potential translation groups found: ${Math.min(multiLangThemes, 10)}`);

    // Recommendation
    console.log('\n🎯 Recommendation:');
    
    const enCount = languageStats.en.length;
    const totalNonEn = languageStats.pt.length + languageStats.es.length + languageStats.fr.length;
    
    if (enCount > 0 && totalNonEn > enCount * 2) {
      console.log('   ✅ MIGRATE EXISTING TRANSLATIONS');
      console.log('   Reason: You have many existing translations that would be faster to migrate');
      console.log(`   English: ${enCount}, Other languages: ${totalNonEn}`);
    } else if (enCount > 300) {
      console.log('   🤖 USE DEEPL AUTO-TRANSLATION');
      console.log('   Reason: You have good English base and DeepL will be more consistent');
      console.log(`   English questions: ${enCount} (good base for translation)`);
    } else {
      console.log('   🌍 HYBRID APPROACH');
      console.log('   Reason: Mixed situation - migrate existing + auto-translate missing');
    }

    process.exit(0);
    
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    process.exit(1);
  }
}

analyzeTranslations();
