#!/usr/bin/env node

/**
 * Analyze Firebase structure and create proper ID mapping strategy
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseAnalyzer {
  constructor() {
    this.stats = {
      totalQuestions: 0,
      byLanguage: { en: 0, pt: 0, es: 0, fr: 0 },
      byBaseId: {},
      languagePatterns: {},
      sampleQuestions: []
    };
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
   * Analyze Firebase data structure
   */
  async analyzeStructure() {
    this.log('🔍 Starting Firebase structure analysis...');
    
    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    try {
      const snapshot = await questionsRef.get();
      this.stats.totalQuestions = snapshot.size;
      
      this.log(`📊 Found ${this.stats.totalQuestions} total questions in Firebase`);
      
      // Analyze each question
      snapshot.forEach((doc) => {
        const data = doc.data();
        const docId = doc.id;
        
        // Count by language
        const language = data.language || 'unknown';
        if (this.stats.byLanguage[language] !== undefined) {
          this.stats.byLanguage[language]++;
        }
        
        // Group by baseId
        const baseId = data.baseId;
        if (baseId) {
          if (!this.stats.byBaseId[baseId]) {
            this.stats.byBaseId[baseId] = [];
          }
          this.stats.byBaseId[baseId].push({
            docId,
            language,
            topic: data.topic,
            level: data.level,
            questionPreview: data.question?.substring(0, 80) + '...'
          });
        }
        
        // Collect sample questions for analysis
        if (this.stats.sampleQuestions.length < 20) {
          this.stats.sampleQuestions.push({
            docId,
            baseId,
            language,
            topic: data.topic,
            level: data.level,
            question: data.question?.substring(0, 100) + '...',
            optionA: data.optionA?.substring(0, 50) + '...'
          });
        }
      });
      
      this.showAnalysisResults();
      this.analyzeIdPatterns();
      this.suggestMigrationStrategy();
      
    } catch (error) {
      this.log(`❌ Error analyzing Firebase: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show analysis results
   */
  showAnalysisResults() {
    this.log('\n📊 FIREBASE STRUCTURE ANALYSIS');
    this.log('='.repeat(60));
    
    this.log(`📊 Total questions: ${this.stats.totalQuestions}`);
    this.log('\n🌍 Distribution by language:');
    for (const [lang, count] of Object.entries(this.stats.byLanguage)) {
      this.log(`   ${lang.toUpperCase()}: ${count} questions`);
    }
    
    // Analyze baseId groups
    const baseIds = Object.keys(this.stats.byBaseId);
    const completeGroups = baseIds.filter(baseId => this.stats.byBaseId[baseId].length === 4);
    const incompleteGroups = baseIds.filter(baseId => this.stats.byBaseId[baseId].length < 4);
    
    this.log(`\n🔗 BaseId groups analysis:`);
    this.log(`   Total unique baseIds: ${baseIds.length}`);
    this.log(`   Complete groups (4 languages): ${completeGroups.length}`);
    this.log(`   Incomplete groups: ${incompleteGroups.length}`);
    
    if (incompleteGroups.length > 0) {
      this.log(`\n⚠️ Incomplete groups (first 10):`);
      incompleteGroups.slice(0, 10).forEach(baseId => {
        const group = this.stats.byBaseId[baseId];
        const languages = group.map(q => q.language).join(', ');
        this.log(`   ${baseId}: ${group.length} languages (${languages})`);
      });
    }
    
    this.log(`\n📋 Sample questions (first 10):`);
    this.stats.sampleQuestions.slice(0, 10).forEach((q, i) => {
      this.log(`   ${i + 1}. ${q.baseId} [${q.language}]: "${q.question}"`);
    });
  }

  /**
   * Analyze ID patterns
   */
  analyzeIdPatterns() {
    this.log('\n🔍 ID PATTERN ANALYSIS');
    this.log('='.repeat(60));
    
    // Check if baseIds follow any pattern
    const baseIds = Object.keys(this.stats.byBaseId).sort();
    const firstFew = baseIds.slice(0, 10);
    const lastFew = baseIds.slice(-10);
    
    this.log(`📋 First 10 baseIds: ${firstFew.join(', ')}`);
    this.log(`📋 Last 10 baseIds: ${lastFew.join(', ')}`);
    
    // Check for numeric patterns
    const numericBaseIds = baseIds.filter(id => /^q\d+$/.test(id));
    this.log(`🔢 Numeric pattern (qXXXX): ${numericBaseIds.length}/${baseIds.length}`);
    
    if (numericBaseIds.length > 0) {
      const numbers = numericBaseIds.map(id => parseInt(id.substring(1))).sort((a, b) => a - b);
      this.log(`   Range: q${numbers[0].toString().padStart(4, '0')} to q${numbers[numbers.length - 1].toString().padStart(4, '0')}`);
    }
  }

  /**
   * Suggest migration strategy
   */
  suggestMigrationStrategy() {
    this.log('\n💡 MIGRATION STRATEGY RECOMMENDATIONS');
    this.log('='.repeat(60));
    
    const baseIds = Object.keys(this.stats.byBaseId);
    const completeGroups = baseIds.filter(baseId => this.stats.byBaseId[baseId].length === 4);
    
    this.log(`✅ Recommended approach: Process ${completeGroups.length} complete groups`);
    this.log(`\n📋 Strategy:`);
    this.log(`   1. Filter only complete groups (4 languages each)`);
    this.log(`   2. Identify English version as master for each baseId`);
    this.log(`   3. Create master question in Strapi with locale: "en"`);
    this.log(`   4. Create localizations for PT, ES, FR with correct locale assignment`);
    this.log(`   5. Use baseId as consistent identifier across all versions`);
    
    this.log(`\n🎯 Expected results:`);
    this.log(`   - ${completeGroups.length} master questions (English)`);
    this.log(`   - ${completeGroups.length * 3} localizations (PT, ES, FR)`);
    this.log(`   - Total: ${completeGroups.length * 4} questions in Strapi`);
    this.log(`   - All properly distributed across language tabs`);
    
    // Show a few examples of complete groups
    this.log(`\n📋 Example complete groups (first 5):`);
    completeGroups.slice(0, 5).forEach(baseId => {
      const group = this.stats.byBaseId[baseId];
      this.log(`   ${baseId}:`);
      group.forEach(q => {
        this.log(`     ${q.language}: "${q.questionPreview}"`);
      });
    });
  }
}

// Run analysis
async function main() {
  const analyzer = new FirebaseAnalyzer();
  
  try {
    analyzer.initializeFirebase();
    await analyzer.analyzeStructure();
    
    console.log('\n🎉 Analysis completed successfully!');
    console.log('💡 Ready to create clean migration script with proper locale assignment.');
    
  } catch (error) {
    console.error(`💥 Analysis failed: ${error.message}`);
    process.exit(1);
  }
}

main();
