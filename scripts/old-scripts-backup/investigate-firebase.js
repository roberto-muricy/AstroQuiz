#!/usr/bin/env node

/**
 * Deep investigation of Firebase structure
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseInvestigator {
  constructor() {
    this.sampleSize = 20;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Initialize Firebase connection
   */
  initializeFirebase() {
    try {
      if (admin.apps.length > 0) {
        this.log('🔥 Firebase already initialized');
        return;
      }

      const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      this.log('🔥 Firebase initialized successfully');
    } catch (error) {
      this.log(`❌ Firebase initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Investigate actual Firebase structure
   */
  async investigateStructure() {
    this.log('🔍 Deep investigation of Firebase structure...');
    
    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    try {
      // Get first few documents
      const snapshot = await questionsRef.limit(this.sampleSize).get();
      
      this.log(`📊 Investigating ${snapshot.size} sample questions...`);
      
      let questionIndex = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const docId = doc.id;
        
        questionIndex++;
        this.log(`\n📋 Question ${questionIndex}:`);
        this.log(`   Document ID: ${docId}`);
        this.log(`   Available fields: ${Object.keys(data).join(', ')}`);
        
        // Show all field values
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            const preview = value.length > 100 ? value.substring(0, 100) + '...' : value;
            this.log(`   ${key}: "${preview}"`);
          } else {
            this.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        }
      });
      
      // Analyze patterns
      this.analyzePatterns(snapshot);
      
    } catch (error) {
      this.log(`❌ Error investigating Firebase: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze patterns in the data
   */
  analyzePatterns(snapshot) {
    this.log('\n🔍 PATTERN ANALYSIS');
    this.log('='.repeat(60));
    
    const allFields = new Set();
    const languageDistribution = {};
    const topicDistribution = {};
    const levelDistribution = {};
    const docIds = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      
      // Collect all field names
      Object.keys(data).forEach(field => allFields.add(field));
      
      // Language distribution
      const lang = data.language || 'unknown';
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
      
      // Topic distribution
      const topic = data.topic || 'unknown';
      topicDistribution[topic] = (topicDistribution[topic] || 0) + 1;
      
      // Level distribution
      const level = data.level || 'unknown';
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
      
      // Document IDs
      docIds.push(docId);
    });
    
    this.log(`📋 All available fields: ${Array.from(allFields).join(', ')}`);
    
    this.log(`\n🌍 Language distribution:`);
    for (const [lang, count] of Object.entries(languageDistribution)) {
      this.log(`   ${lang}: ${count}`);
    }
    
    this.log(`\n📚 Topic distribution:`);
    Object.entries(topicDistribution).slice(0, 10).forEach(([topic, count]) => {
      this.log(`   ${topic}: ${count}`);
    });
    
    this.log(`\n🎯 Level distribution:`);
    for (const [level, count] of Object.entries(levelDistribution)) {
      this.log(`   ${level}: ${count}`);
    }
    
    this.log(`\n🆔 Document ID patterns:`);
    this.log(`   Sample IDs: ${docIds.slice(0, 10).join(', ')}`);
    
    // Check if document IDs follow any pattern
    const numericIds = docIds.filter(id => /^q\d+$/.test(id));
    if (numericIds.length > 0) {
      this.log(`   Numeric pattern (qXXXX): ${numericIds.length}/${docIds.length}`);
    }
    
    this.suggestGroupingStrategy(docIds, snapshot);
  }

  /**
   * Suggest grouping strategy based on patterns
   */
  suggestGroupingStrategy(docIds, snapshot) {
    this.log('\n💡 GROUPING STRATEGY SUGGESTIONS');
    this.log('='.repeat(60));
    
    // Check if we can group by document ID patterns
    const numericIds = docIds.filter(id => /^q\d+$/.test(id));
    
    if (numericIds.length > 0) {
      this.log(`✅ Found ${numericIds.length} questions with numeric IDs (qXXXX)`);
      this.log(`💡 Strategy: Use document ID as baseId for grouping`);
      
      // Extract numbers and check for sequential patterns
      const numbers = numericIds.map(id => parseInt(id.substring(1))).sort((a, b) => a - b);
      this.log(`   Number range: ${numbers[0]} to ${numbers[numbers.length - 1]}`);
      
      // Check if we have 4 languages for same numbers
      this.analyzeLanguageGrouping(snapshot, numericIds);
    } else {
      this.log(`⚠️ No clear numeric pattern found in document IDs`);
      this.log(`💡 Alternative strategies:`);
      this.log(`   1. Group by content similarity (question text)`);
      this.log(`   2. Group by topic + level combination`);
      this.log(`   3. Create new baseId system during migration`);
    }
  }

  /**
   * Analyze if questions can be grouped by language for same base numbers
   */
  analyzeLanguageGrouping(snapshot, numericIds) {
    this.log(`\n🔍 Analyzing language grouping patterns...`);
    
    const questionsByNumber = {};
    
    snapshot.forEach((doc) => {
      const docId = doc.id;
      const data = doc.data();
      
      if (/^q\d+$/.test(docId)) {
        const number = parseInt(docId.substring(1));
        const language = data.language;
        
        if (!questionsByNumber[number]) {
          questionsByNumber[number] = {};
        }
        questionsByNumber[number][language] = {
          docId,
          question: data.question?.substring(0, 80) + '...',
          topic: data.topic
        };
      }
    });
    
    this.log(`📊 Found ${Object.keys(questionsByNumber).length} unique question numbers`);
    
    // Check for complete groups (4 languages)
    const completeGroups = [];
    const incompleteGroups = [];
    
    for (const [number, languages] of Object.entries(questionsByNumber)) {
      const langCount = Object.keys(languages).length;
      if (langCount === 4) {
        completeGroups.push(number);
      } else {
        incompleteGroups.push({ number, langCount, languages: Object.keys(languages) });
      }
    }
    
    this.log(`✅ Complete groups (4 languages): ${completeGroups.length}`);
    this.log(`⚠️ Incomplete groups: ${incompleteGroups.length}`);
    
    if (completeGroups.length > 0) {
      this.log(`\n📋 Example complete groups:`);
      completeGroups.slice(0, 3).forEach(number => {
        this.log(`   q${number}:`);
        const group = questionsByNumber[number];
        Object.entries(group).forEach(([lang, data]) => {
          this.log(`     ${lang}: "${data.question}"`);
        });
      });
    }
    
    if (incompleteGroups.length > 0) {
      this.log(`\n⚠️ Incomplete groups (first 5):`);
      incompleteGroups.slice(0, 5).forEach(({ number, langCount, languages }) => {
        this.log(`   q${number}: ${langCount} languages (${languages.join(', ')})`);
      });
    }
  }
}

// Run investigation
async function main() {
  const investigator = new FirebaseInvestigator();
  
  try {
    investigator.initializeFirebase();
    await investigator.investigateStructure();
    
    console.log('\n🎉 Investigation completed successfully!');
    
  } catch (error) {
    console.error(`💥 Investigation failed: ${error.message}`);
    process.exit(1);
  }
}

main();
