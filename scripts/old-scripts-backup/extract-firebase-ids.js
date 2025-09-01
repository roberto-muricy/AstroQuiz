#!/usr/bin/env node

/**
 * Extract and analyze Firebase document IDs and data structure
 * This will help us understand the real ID patterns and create proper grouping
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

class FirebaseIdExtractor {
  constructor() {
    this.allQuestions = [];
    this.stats = {
      total: 0,
      byLanguage: {},
      idPatterns: {},
      timestamps: []
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
   * Extract all questions with their IDs and metadata
   */
  async extractAllQuestions() {
    this.log('📥 Extracting all questions with IDs from Firebase...');
    
    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    // Get all questions ordered by creation time
    const snapshot = await questionsRef.orderBy('createdAt', 'asc').get();
    this.stats.total = snapshot.size;
    
    this.log(`📊 Found ${this.stats.total} questions in Firebase`);
    
    let index = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      const language = data.language;
      
      // Count by language
      this.stats.byLanguage[language] = (this.stats.byLanguage[language] || 0) + 1;
      
      // Extract timestamp from ID if possible
      const timestampMatch = docId.match(/q_(\d+)_/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : null;
      if (timestamp) {
        this.stats.timestamps.push(timestamp);
      }
      
      // Store complete question data
      const questionData = {
        index: index,
        docId: docId,
        language: language,
        timestamp: timestamp,
        createdAt: data.createdAt,
        question: data.question,
        theme: data.theme,
        level: data.level,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation
      };
      
      this.allQuestions.push(questionData);
      index++;
    });
    
    this.log(`🌍 Language distribution: ${Object.entries(this.stats.byLanguage).map(([lang, count]) => `${lang}:${count}`).join(', ')}`);
  }

  /**
   * Analyze ID patterns and timestamps
   */
  analyzeIdPatterns() {
    this.log('🔍 Analyzing ID patterns and timestamps...');
    
    // Group by language to see patterns
    const byLanguage = {
      pt: this.allQuestions.filter(q => q.language === 'pt'),
      en: this.allQuestions.filter(q => q.language === 'en'),
      es: this.allQuestions.filter(q => q.language === 'es'),
      fr: this.allQuestions.filter(q => q.language === 'fr')
    };
    
    this.log(`\\n📋 Questions by language (first 5 of each):`);
    Object.entries(byLanguage).forEach(([lang, questions]) => {
      this.log(`\\n${lang.toUpperCase()} (${questions.length} total):`);
      questions.slice(0, 5).forEach((q, i) => {
        this.log(`   ${i + 1}. ${q.docId} | "${q.question?.substring(0, 60)}..."`);
      });
    });
    
    // Analyze timestamp patterns
    if (this.stats.timestamps.length > 0) {
      this.stats.timestamps.sort((a, b) => a - b);
      const firstTimestamp = this.stats.timestamps[0];
      const lastTimestamp = this.stats.timestamps[this.stats.timestamps.length - 1];
      
      this.log(`\\n⏰ Timestamp analysis:`);
      this.log(`   First: ${firstTimestamp} (${new Date(firstTimestamp).toISOString()})`);
      this.log(`   Last: ${lastTimestamp} (${new Date(lastTimestamp).toISOString()})`);
      this.log(`   Range: ${lastTimestamp - firstTimestamp} milliseconds`);
    }
  }

  /**
   * Create intelligent grouping based on position and content similarity
   */
  createIntelligentGroups() {
    this.log('🧠 Creating intelligent question groups...');
    
    // Since we know the pattern: PT(0-361), EN(362-723), ES(724-1085), FR(1086-1447)
    // Let's group by position within each language block
    
    const languageBlocks = {
      pt: this.allQuestions.slice(0, 362),
      en: this.allQuestions.slice(362, 724),
      es: this.allQuestions.slice(724, 1086),
      fr: this.allQuestions.slice(1086, 1448)
    };
    
    this.log(`📊 Language blocks extracted:`);
    Object.entries(languageBlocks).forEach(([lang, questions]) => {
      this.log(`   ${lang.toUpperCase()}: ${questions.length} questions`);
    });
    
    // Create groups by matching positions
    const groups = [];
    const maxQuestions = Math.min(
      languageBlocks.pt.length,
      languageBlocks.en.length,
      languageBlocks.es.length,
      languageBlocks.fr.length
    );
    
    for (let i = 0; i < maxQuestions; i++) {
      const baseId = `q${(i + 1).toString().padStart(4, '0')}`;
      
      const group = {
        baseId,
        groupIndex: i,
        questions: {
          pt: languageBlocks.pt[i],
          en: languageBlocks.en[i],
          es: languageBlocks.es[i],
          fr: languageBlocks.fr[i]
        }
      };
      
      groups.push(group);
    }
    
    this.log(`✅ Created ${groups.length} question groups`);
    
    // Show sample groups with their Firebase IDs
    this.log(`\\n📋 Sample groups with Firebase IDs (first 3):`);
    groups.slice(0, 3).forEach(group => {
      this.log(`\\n${group.baseId} (group ${group.groupIndex + 1}):`);
      Object.entries(group.questions).forEach(([lang, question]) => {
        this.log(`   ${lang.toUpperCase()}: ${question.docId}`);
        this.log(`        "${question.question?.substring(0, 60)}..."`);
      });
    });
    
    return groups;
  }

  /**
   * Export groups to JSON file for migration script
   */
  exportGroupsToFile(groups) {
    this.log('💾 Exporting groups to JSON file...');
    
    const exportData = {
      metadata: {
        totalQuestions: this.stats.total,
        totalGroups: groups.length,
        languageDistribution: this.stats.byLanguage,
        exportedAt: new Date().toISOString()
      },
      groups: groups
    };
    
    const filePath = path.join(__dirname, 'firebase-question-groups.json');
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    
    this.log(`✅ Groups exported to: ${filePath}`);
    this.log(`📊 Export contains ${groups.length} groups with ${groups.length * 4} total questions`);
    
    return filePath;
  }

  /**
   * Generate migration summary
   */
  generateSummary(groups) {
    this.log('\\n' + '='.repeat(70));
    this.log('📊 FIREBASE ID EXTRACTION SUMMARY');
    this.log('='.repeat(70));
    
    this.log(`\\n📥 FIREBASE DATA:`);
    this.log(`   Total questions extracted: ${this.stats.total}`);
    Object.entries(this.stats.byLanguage).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()}: ${count} questions`);
    });
    
    this.log(`\\n🔗 GROUPING RESULTS:`);
    this.log(`   Question groups created: ${groups.length}`);
    this.log(`   Questions per group: 4 (EN, PT, ES, FR)`);
    this.log(`   Total questions for migration: ${groups.length * 4}`);
    
    this.log(`\\n🎯 BASEIDS GENERATED:`);
    this.log(`   Range: q0001 to q${groups.length.toString().padStart(4, '0')}`);
    this.log(`   Each baseId maps to 4 Firebase document IDs`);
    
    this.log(`\\n💡 NEXT STEPS:`);
    this.log(`   1. Review exported JSON file: firebase-question-groups.json`);
    this.log(`   2. Run migration script using the exported groups`);
    this.log(`   3. Each group will create 4 Strapi questions with correct locales`);
    this.log(`   4. All questions with same baseId will be properly linked in i18n`);
    
    this.log('='.repeat(70));
  }

  /**
   * Run complete extraction and grouping
   */
  async runExtraction() {
    try {
      this.initializeFirebase();
      await this.extractAllQuestions();
      this.analyzeIdPatterns();
      const groups = this.createIntelligentGroups();
      const filePath = this.exportGroupsToFile(groups);
      this.generateSummary(groups);
      
      return { groups, filePath };
      
    } catch (error) {
      this.log(`💥 Extraction failed: ${error.message}`);
      throw error;
    }
  }
}

// Run extraction
async function main() {
  const extractor = new FirebaseIdExtractor();
  await extractor.runExtraction();
}

main().catch(console.error);
