#!/usr/bin/env node

/**
 * Simple chronological migration - group every 4 consecutive questions
 * Assumes Firebase questions are ordered: EN, PT, ES, FR, EN, PT, ES, FR, ...
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

const CONFIG = {
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  }
};

class ChronologicalMigrator {
  constructor() {
    this.stats = {
      firebase: { total: 0, byLanguage: {} },
      groups: { created: 0, complete: 0, incomplete: 0 },
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
   * Load all questions from Firebase in chronological order
   */
  async loadQuestionsChronologically() {
    this.log('📥 Loading questions in chronological order...');
    
    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    const snapshot = await questionsRef.orderBy('createdAt', 'asc').get();
    this.stats.firebase.total = snapshot.size;
    
    this.log(`📊 Found ${this.stats.firebase.total} questions in Firebase`);
    
    const allQuestions = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const language = data.language;
      
      // Count by language
      this.stats.firebase.byLanguage[language] = (this.stats.firebase.byLanguage[language] || 0) + 1;
      
      allQuestions.push({
        docId: doc.id,
        ...data
      });
    });
    
    this.log(`🌍 Language distribution: ${Object.entries(this.stats.firebase.byLanguage).map(([lang, count]) => `${lang}:${count}`).join(', ')}`);
    
    return allQuestions;
  }

  /**
   * Group questions chronologically (every 4 consecutive questions)
   */
  groupQuestionsChronologically(questions) {
    this.log('🔗 Grouping questions chronologically (every 4 questions)...');
    
    const groups = [];
    let groupCounter = 1;
    
    // Process in chunks of 4
    for (let i = 0; i < questions.length; i += 4) {
      const chunk = questions.slice(i, i + 4);
      
      if (chunk.length === 4) {
        const baseId = `q${groupCounter.toString().padStart(4, '0')}`;
        
        const group = {
          baseId,
          questions: {}
        };
        
        // Assign each question to the group
        chunk.forEach((question, index) => {
          const language = question.language;
          group.questions[language] = question;
        });
        
        // Check if group has all 4 languages
        const languages = Object.keys(group.questions);
        const hasAllLanguages = ['en', 'pt', 'es', 'fr'].every(lang => languages.includes(lang));
        
        if (hasAllLanguages && languages.length === 4) {
          groups.push(group);
          this.stats.groups.complete++;
        } else {
          this.log(`⚠️ Incomplete group ${baseId}: has ${languages.join(', ')} (expected: en, pt, es, fr)`);
          this.stats.groups.incomplete++;
        }
        
        groupCounter++;
        this.stats.groups.created++;
      }
    }
    
    this.log(`✅ Created ${this.stats.groups.complete} complete groups (${this.stats.groups.incomplete} incomplete)`);
    
    return groups;
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
   * Migrate all question groups to Strapi
   */
  async migrateGroupsToStrapi(groups) {
    this.log('🚀 Starting migration to Strapi...');
    this.log(`📊 Processing ${groups.length} complete question groups...`);
    
    let processedGroups = 0;
    
    for (const group of groups) {
      try {
        this.log(`\\n📝 Processing group ${group.baseId} (${processedGroups + 1}/${groups.length}):`);
        
        // Create questions for each language with proper locale
        const languageOrder = ['en', 'pt', 'es', 'fr'];
        
        for (const language of languageOrder) {
          const firebaseQuestion = group.questions[language];
          if (firebaseQuestion) {
            const strapiData = this.convertToStrapiFormat(firebaseQuestion, group.baseId);
            
            await this.createStrapiQuestion(strapiData);
            this.log(`   ✅ ${language.toUpperCase()}: "${strapiData.question.substring(0, 50)}..."`);
          }
        }
        
        processedGroups++;
        
        // Progress update every 25 groups
        if (processedGroups % 25 === 0) {
          this.log(`\\n📊 Progress: ${processedGroups}/${groups.length} groups | ${this.stats.strapi.created} questions created`);
        }
        
      } catch (error) {
        this.log(`❌ Error processing group ${group.baseId}: ${error.message}`);
      }
    }
  }

  /**
   * Show final migration report
   */
  showFinalReport() {
    this.log('\\n' + '='.repeat(70));
    this.log('🎉 CHRONOLOGICAL MIGRATION COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 FIREBASE SOURCE:`);
    this.log(`   Total questions: ${this.stats.firebase.total}`);
    Object.entries(this.stats.firebase.byLanguage).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()}: ${count} questions`);
    });
    
    this.log(`\\n🔗 GROUPING RESULTS:`);
    this.log(`   Groups created: ${this.stats.groups.created}`);
    this.log(`   Complete groups: ${this.stats.groups.complete}`);
    this.log(`   Incomplete groups: ${this.stats.groups.incomplete}`);
    this.log(`   Expected questions in Strapi: ${this.stats.groups.complete * 4}`);
    
    this.log(`\\n📊 STRAPI MIGRATION:`);
    this.log(`   Questions created: ${this.stats.strapi.created}`);
    this.log(`   Errors: ${this.stats.strapi.errors}`);
    
    this.log(`\\n🌍 STRAPI LOCALE DISTRIBUTION:`);
    Object.entries(this.stats.strapi.byLocale).forEach(([locale, count]) => {
      this.log(`   ${locale.toUpperCase()}: ${count} questions`);
    });
    
    const expectedTotal = this.stats.groups.complete * 4;
    const successRate = expectedTotal > 0 ? ((this.stats.strapi.created / expectedTotal) * 100).toFixed(1) : '0';
    this.log(`\\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (this.stats.strapi.errors === 0 && this.stats.strapi.created === expectedTotal) {
      this.log('\\n🎉 PERFECT MIGRATION! All questions created successfully with proper locales!');
    } else if (this.stats.strapi.errors > 0) {
      this.log(`\\n⚠️ Migration completed with ${this.stats.strapi.errors} errors.`);
    }
    
    this.log('\\n💡 NEXT STEPS:');
    this.log('   1. Check Strapi admin panel');
    this.log('   2. Verify questions appear in correct language tabs:');
    this.log(`      - English (en): should have ~${this.stats.strapi.byLocale.en || 0} questions`);
    this.log(`      - Portuguese (pt): should have ~${this.stats.strapi.byLocale.pt || 0} questions`);
    this.log(`      - Spanish (es): should have ~${this.stats.strapi.byLocale.es || 0} questions`);
    this.log(`      - French (fr): should have ~${this.stats.strapi.byLocale.fr || 0} questions`);
    this.log('   3. Test question content and options');
    this.log('='.repeat(70));
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      this.initializeFirebase();
      const questions = await this.loadQuestionsChronologically();
      const groups = this.groupQuestionsChronologically(questions);
      
      if (groups.length > 0) {
        await this.migrateGroupsToStrapi(groups);
      } else {
        this.log('⚠️ No complete groups found - nothing to migrate');
      }
      
      this.showFinalReport();
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }
}

// Run migration
async function main() {
  const migrator = new ChronologicalMigrator();
  await migrator.runMigration();
}

main().catch(console.error);
