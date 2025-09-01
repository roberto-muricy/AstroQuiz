#!/usr/bin/env node

/**
 * Firebase Data Inspector
 * Inspects the structure of Firebase questions to understand the data format
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function inspectFirebaseData() {
  try {
    console.log('🔍 Inspecting Firebase data structure...\n');

    // Initialize Firebase
    const serviceAccountPath = path.resolve('./firebase-service-account.json');
    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://astroquiz-3a316-default-rtdb.firebaseio.com'
    });

    const db = admin.firestore();
    
    // Fetch first 10 questions to inspect structure
    console.log('📥 Fetching sample questions...');
    const questionsRef = db.collection('questions');
    const snapshot = await questionsRef.limit(10).get();
    
    const questions = [];
    snapshot.forEach(doc => {
      questions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Found ${questions.length} sample questions\n`);

    // Analyze structure
    console.log('📊 Sample question structures:\n');
    
    questions.forEach((question, index) => {
      console.log(`--- Question ${index + 1} (ID: ${question.id}) ---`);
      console.log(`Fields: ${Object.keys(question).join(', ')}`);
      
      // Show key fields
      console.log(`baseId: ${question.baseId || 'MISSING'}`);
      console.log(`language: ${question.language || 'MISSING'}`);
      console.log(`topic: ${question.topic || 'MISSING'}`);
      console.log(`question: ${(question.question || 'MISSING').substring(0, 60)}...`);
      console.log(`level: ${question.level || 'MISSING'}`);
      console.log(`correctOption: ${question.correctOption || 'MISSING'}`);
      console.log('');
    });

    // Count total and analyze baseIds
    const allSnapshot = await questionsRef.get();
    const allQuestions = [];
    allSnapshot.forEach(doc => {
      allQuestions.push(doc.data());
    });

    console.log(`📈 Total questions in Firebase: ${allQuestions.length}`);
    
    // Analyze baseIds
    const baseIds = new Set();
    const withoutBaseId = [];
    const languages = new Set();
    
    allQuestions.forEach((question, index) => {
      if (question.baseId) {
        baseIds.add(question.baseId);
      } else {
        withoutBaseId.push(index);
      }
      
      if (question.language) {
        languages.add(question.language);
      }
    });

    console.log(`🏷️  Unique baseIds: ${baseIds.size}`);
    console.log(`❌ Questions without baseId: ${withoutBaseId.length}`);
    console.log(`🌍 Languages found: ${Array.from(languages).join(', ')}`);
    
    // Show sample baseIds
    console.log(`\n📋 Sample baseIds:`);
    Array.from(baseIds).slice(0, 10).forEach(baseId => {
      console.log(`   ${baseId}`);
    });

    // Group by baseId to see language distribution
    const groups = new Map();
    allQuestions.forEach(question => {
      if (question.baseId) {
        if (!groups.has(question.baseId)) {
          groups.set(question.baseId, []);
        }
        groups.get(question.baseId).push(question.language);
      }
    });

    console.log(`\n🗂️  Sample baseId groups:`);
    Array.from(groups.entries()).slice(0, 5).forEach(([baseId, langs]) => {
      console.log(`   ${baseId}: [${langs.join(', ')}]`);
    });

    // Calculate expected vs actual
    const expectedTotal = baseIds.size * 4; // 4 languages per baseId
    console.log(`\n📊 Analysis:`);
    console.log(`   Expected questions (${baseIds.size} baseIds × 4 languages): ${expectedTotal}`);
    console.log(`   Actual questions: ${allQuestions.length}`);
    console.log(`   Difference: ${allQuestions.length - expectedTotal}`);

    process.exit(0);
    
  } catch (error) {
    console.error('💥 Inspection failed:', error.message);
    process.exit(1);
  }
}

inspectFirebaseData();
