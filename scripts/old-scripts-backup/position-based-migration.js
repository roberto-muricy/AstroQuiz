J'#!/usr/bin/env node

/**
 * Position-based migration - group by position within each language block
 * PT: positions 0-361, EN: positions 362-723, ES: positions 724-1085, FR: positions 1086-1447
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

class PositionBasedMigrator {
  constructor() {
    this.stats = {
      firebase: { total: 0, byLanguage: {} },
      groups: { created: 0, complete: 0 },
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
   * Group questions by position within each language block
   * Assumes: PT(0-361), EN(362-723), ES(724-1085), FR(1086-1447)
   */
  groupQuestionsByPosition(questions) {
    this.log('🔗 Grouping questions by position within language blocks...');
    
    // Separate questions by language with their positions
    const languageBlocks = {
      pt: questions.slice(0, 362),    // First 362 questions
      en: questions.slice(362, 724),  // Next 362 questions  
      es: questions.slice(724, 1086), // Next 362 questions
      fr: questions.slice(1086, 1448) // Last 362 questions
    };
    
    this.log(`📊 Language blocks: PT:${languageBlocks.pt.length}, EN:${languageBlocks.en.length}, ES:${languageBlocks.es.length}, FR:${languageBlocks.fr.length}`);
    
    // Verify all blocks have same size
    const blockSizes = Object.values(languageBlocks).map(block => block.length);
    const minSize = Math.min(...blockSizes);
    
    this.log(`📊 Minimum block size: ${minSize} (will create ${minSize} groups)`);
    
    // Create groups by matching positions
    const groups = [];
    
    for (let i = 0; i < minSize; i++) {
      const baseId = `q${(i + 1).toString().padStart(4, '0')}`;
      
      const group = {
        baseId,
        questions: {
          pt: languageBlocks.pt[i],
          en: languageBlocks.en[i],
          es: languageBlocks.es[i],
          fr: languageBlocks.fr[i]
        }
      };
      
      // Verify all questions exist and have correct languages
      const hasAllLanguages = ['pt', 'en', 'es', 'fr'].every(lang => {
        const question = group.questions[lang];
        return question && question.language === lang;
      });
      
      if (hasAllLanguages) {
        groups.push(group);
        this.stats.groups.complete++;
      } else {
        this.log(`⚠️ Group ${baseId} incomplete or has wrong languages`);
      }
      
      this.stats.groups.created++;
    }
    
    this.log(`✅ Created ${this.stats.groups.complete} complete groups out of ${this.stats.groups.created} total`);
    
    // Show sample groups
    this.log(`\\n📋 Sample groups (first 3):`);
    groups.slice(0, 3).forEach(group => {
      this.log(`   ${group.baseId}:`);
      Object.entries(group.questions).forEach(([lang, question]) => {
        this.log(`     ${lang.toUpperCase()}: "${question.question?.substring(0, 60)}..."`);
      });
    });
    
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
        const languageOrder = ['en', 'pt', 'es', 'fr']; // English first as master
        
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
        
        // Small delay to avoid overwhelming the API
        if (processedGroups % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
    this.log('🎉 POSITION-BASED MIGRATION COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 FIREBASE SOURCE:`);
    this.log(`   Total questions: ${this.stats.firebase.total}`);
    Object.entries(this.stats.firebase.byLanguage).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()}: ${count} questions`);
    });
    
    this.log(`\\n🔗 GROUPING RESULTS:`);
    this.log(`   Groups created: ${this.stats.groups.created}`);
    this.log(`   Complete groups: ${this.stats.groups.complete}`);
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
      this.log('\\n💡 Each baseId now has exactly 4 language versions with correct locale assignment!');
    } else if (this.stats.strapi.errors > 0) {
      this.log(`\\n⚠️ Migration completed with ${this.stats.strapi.errors} errors.`);
    }
    
    this.log('\\n💡 NEXT STEPS:');
    this.log('   1. Check Strapi admin panel');
    this.log('   2. Verify questions appear in CORRECT language tabs:');
    this.log(`      - English (en): should have ${this.stats.strapi.byLocale.en || 0} questions`);
    this.log(`      - Portuguese (pt): should have ${this.stats.strapi.byLocale.pt || 0} questions`);
    this.log(`      - Spanish (es): should have ${this.stats.strapi.byLocale.es || 0} questions`);
    this.log(`      - French (fr): should have ${this.stats.strapi.byLocale.fr || 0} questions`);
    this.log('   3. Test that same baseId appears in all 4 language tabs');
    this.log('   4. Verify question content and options match between languages');
    this.log('='.repeat(70));
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      this.initializeFirebase();
      const questions = await this.loadQuestionsChronologically();
      const groups = this.groupQuestionsByPosition(questions);
      
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
  const migrator = new PositionBasedMigrator();
  await migrator.runMigration();
}

main().catch(console.error);
