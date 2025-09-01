#!/usr/bin/env node

/**
 * Migration script using pre-mapped Firebase IDs
 * Uses the exported firebase-question-groups.json file
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

class MappedIdMigrator {
  constructor() {
    this.groups = [];
    this.stats = {
      groups: { total: 0, processed: 0, errors: 0 },
      strapi: { created: 0, byLocale: {}, errors: 0 }
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
   * Load pre-mapped question groups from JSON file
   */
  loadMappedGroups() {
    this.log('📥 Loading pre-mapped question groups...');
    
    const filePath = path.join(__dirname, 'firebase-question-groups.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Mapped groups file not found: ${filePath}. Run extract-firebase-ids.js first.`);
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.groups = data.groups;
    this.stats.groups.total = this.groups.length;
    
    this.log(`✅ Loaded ${this.groups.length} pre-mapped question groups`);
    this.log(`📊 Expected questions: ${this.groups.length * 4} (${this.groups.length} × 4 languages)`);
    
    // Show sample mapping
    this.log(`\\n📋 Sample mappings (first 3 groups):`);
    this.groups.slice(0, 3).forEach(group => {
      this.log(`   ${group.baseId}:`);
      Object.entries(group.questions).forEach(([lang, question]) => {
        this.log(`     ${lang.toUpperCase()}: ${question.docId}`);
      });
    });
    
    return this.groups;
  }

  /**
   * Fetch Firebase question data by document ID
   */
  async fetchFirebaseQuestion(docId) {
    const db = admin.firestore();
    const doc = await db.collection('questions').doc(docId).get();
    
    if (!doc.exists) {
      throw new Error(`Firebase document not found: ${docId}`);
    }
    
    return { docId, ...doc.data() };
  }

  /**
   * Convert Firebase question to Strapi format
   */
  convertToStrapiFormat(firebaseQuestion, baseId) {
    // Convert options array to individual fields
    const options = firebaseQuestion.options || [];
    const optionA = options[0] || '';
    const optionB = options[1] || '';
    const optionC = options[2] || '';
    const optionD = options[3] || '';
    
    // Convert correctAnswer index to letter
    const correctAnswerIndex = firebaseQuestion.correctAnswer || 0;
    const correctOption = ['A', 'B', 'C', 'D'][correctAnswerIndex] || 'A';
    
    // Ensure level is within 1-5 range
    const level = Math.min(Math.max(firebaseQuestion.level || 1, 1), 5);
    
    return {
      baseId,
      question: firebaseQuestion.question || '',
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation: firebaseQuestion.explanation || '',
      topic: firebaseQuestion.theme || 'general',
      level,
      locale: firebaseQuestion.language, // CRITICAL: Set correct locale
      publishedAt: new Date()
    };
  }

  /**
   * Create question in Strapi with correct locale
   */
  async createStrapiQuestion(questionData) {
    try {
      const response = await axios.post(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`,
        { data: questionData },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      this.stats.strapi.created++;
      const locale = questionData.locale;
      this.stats.strapi.byLocale[locale] = (this.stats.strapi.byLocale[locale] || 0) + 1;
      
      return response.data.data;
    } catch (error) {
      this.stats.strapi.errors++;
      this.log(`❌ Error creating question: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Process a single question group
   */
  async processGroup(group) {
    this.log(`\\n📝 Processing ${group.baseId} (${this.stats.groups.processed + 1}/${this.stats.groups.total}):`);
    
    // Process languages in specific order (English first as master)
    const languageOrder = ['en', 'pt', 'es', 'fr'];
    
    for (const language of languageOrder) {
      const questionRef = group.questions[language];
      if (questionRef && questionRef.docId) {
        try {
          // Fetch actual data from Firebase using the mapped docId
          const firebaseQuestion = await this.fetchFirebaseQuestion(questionRef.docId);
          
          // Convert to Strapi format
          const strapiData = this.convertToStrapiFormat(firebaseQuestion, group.baseId);
          
          // Create in Strapi
          await this.createStrapiQuestion(strapiData);
          
          this.log(`   ✅ ${language.toUpperCase()}: "${strapiData.question.substring(0, 50)}..."`);
          
        } catch (error) {
          this.log(`   ❌ ${language.toUpperCase()}: Error - ${error.message}`);
          this.stats.groups.errors++;
        }
      } else {
        this.log(`   ⚠️ ${language.toUpperCase()}: No document ID found`);
      }
    }
    
    this.stats.groups.processed++;
  }

  /**
   * Migrate all groups to Strapi
   */
  async migrateAllGroups() {
    this.log('🚀 Starting migration with mapped IDs...');
    
    for (const group of this.groups) {
      try {
        await this.processGroup(group);
        
        // Progress update every 25 groups
        if (this.stats.groups.processed % 25 === 0) {
          this.log(`\\n📊 Progress: ${this.stats.groups.processed}/${this.stats.groups.total} groups | ${this.stats.strapi.created} questions created`);
        }
        
        // Small delay to avoid overwhelming APIs
        if (this.stats.groups.processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        this.log(`❌ Error processing group ${group.baseId}: ${error.message}`);
        this.stats.groups.errors++;
      }
    }
  }

  /**
   * Show final migration report
   */
  showFinalReport() {
    this.log('\\n' + '='.repeat(70));
    this.log('🎉 MAPPED ID MIGRATION COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 GROUPS PROCESSING:`);
    this.log(`   Total groups: ${this.stats.groups.total}`);
    this.log(`   Successfully processed: ${this.stats.groups.processed}`);
    this.log(`   Group errors: ${this.stats.groups.errors}`);
    
    this.log(`\\n📊 STRAPI QUESTIONS:`);
    this.log(`   Questions created: ${this.stats.strapi.created}`);
    this.log(`   Creation errors: ${this.stats.strapi.errors}`);
    
    this.log(`\\n🌍 STRAPI LOCALE DISTRIBUTION:`);
    Object.entries(this.stats.strapi.byLocale).forEach(([locale, count]) => {
      this.log(`   ${locale.toUpperCase()}: ${count} questions`);
    });
    
    const expectedTotal = this.stats.groups.total * 4;
    const successRate = expectedTotal > 0 ? ((this.stats.strapi.created / expectedTotal) * 100).toFixed(1) : '0';
    this.log(`\\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (this.stats.strapi.errors === 0 && this.stats.strapi.created === expectedTotal) {
      this.log('\\n🎉 PERFECT MIGRATION! All questions created successfully!');
      this.log('\\n✨ Each baseId now has exactly 4 language versions with CORRECT locales!');
    } else if (this.stats.strapi.errors > 0) {
      this.log(`\\n⚠️ Migration completed with ${this.stats.strapi.errors} creation errors.`);
    }
    
    this.log('\\n💡 CRITICAL VERIFICATION STEPS:');
    this.log('   1. Open Strapi admin panel: http://localhost:1337/admin');
    this.log('   2. Go to Content Manager -> Question');
    this.log('   3. Check language tabs - you should see:');
    this.log(`      - English (en): ~${this.stats.strapi.byLocale.en || 0} questions`);
    this.log(`      - Portuguese (pt): ~${this.stats.strapi.byLocale.pt || 0} questions`);
    this.log(`      - Spanish (es): ~${this.stats.strapi.byLocale.es || 0} questions`);
    this.log(`      - French (fr): ~${this.stats.strapi.byLocale.fr || 0} questions`);
    this.log('   4. Verify same baseId appears in all 4 language tabs');
    this.log('   5. Test question content matches between languages');
    this.log('='.repeat(70));
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      this.initializeFirebase();
      this.loadMappedGroups();
      await this.migrateAllGroups();
      this.showFinalReport();
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }
}

// Run migration
async function main() {
  const migrator = new MappedIdMigrator();
  await migrator.runMigration();
}

main().catch(console.error);
