#!/usr/bin/env node

/**
 * Clean migration with proper locale assignment from start
 * Groups questions intelligently and creates proper baseId system
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

class CleanMigrator {
  constructor() {
    this.stats = {
      firebase: { total: 0, byLanguage: {} },
      processed: { groups: 0, questions: 0, errors: 0 },
      strapi: { created: 0, byLocale: {} }
    };
    this.questionGroups = new Map(); // Group questions by similarity
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
   * Load all questions from Firebase and group them
   */
  async loadAndGroupQuestions() {
    this.log('📥 Loading questions from Firebase...');
    
    const db = admin.firestore();
    const questionsRef = db.collection('questions');
    
    const snapshot = await questionsRef.get();
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
    
    // Group questions by content similarity
    this.groupQuestionsBySimilarity(allQuestions);
    
    return allQuestions;
  }

  /**
   * Group questions by content similarity (same topic + level + similar question length)
   */
  groupQuestionsBySimilarity(questions) {
    this.log('🔗 Grouping questions by similarity...');
    
    // Sort by timestamp to maintain order
    questions.sort((a, b) => {
      const timeA = a.createdAt?._seconds || 0;
      const timeB = b.createdAt?._seconds || 0;
      return timeA - timeB;
    });
    
    const groups = new Map();
    let groupCounter = 1;
    
    for (const question of questions) {
      // Create a similarity key based on topic, level, and question length range
      const theme = question.theme || 'general';
      const level = question.level || 1;
      const questionLength = Math.floor((question.question?.length || 0) / 50) * 50; // Group by 50-char ranges
      
      const similarityKey = `${theme}-${level}-${questionLength}`;
      
      if (!groups.has(similarityKey)) {
        groups.set(similarityKey, {
          baseId: `q${groupCounter.toString().padStart(4, '0')}`,
          questions: {},
          theme,
          level
        });
        groupCounter++;
      }
      
      const group = groups.get(similarityKey);
      const language = question.language;
      
      // Only add if we don't already have this language in the group
      if (!group.questions[language]) {
        group.questions[language] = question;
      }
    }
    
    // Filter only complete groups (4 languages)
    const completeGroups = Array.from(groups.values()).filter(group => 
      Object.keys(group.questions).length === 4 &&
      ['en', 'pt', 'es', 'fr'].every(lang => group.questions[lang])
    );
    
    this.questionGroups = new Map(completeGroups.map(group => [group.baseId, group]));
    
    this.log(`✅ Created ${this.questionGroups.size} complete question groups`);
    this.log(`📊 Expected Strapi questions: ${this.questionGroups.size * 4}`);
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
      locale: firebaseQuestion.language, // This is the key for proper i18n!
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
      this.stats.processed.errors++;
      this.log(`❌ Error creating question: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Migrate all question groups to Strapi
   */
  async migrateToStrapi() {
    this.log('🚀 Starting migration to Strapi...');
    this.log(`📊 Processing ${this.questionGroups.size} question groups...`);
    
    let processedGroups = 0;
    
    for (const [baseId, group] of this.questionGroups) {
      try {
        this.log(`\\n📝 Processing group ${baseId} (${processedGroups + 1}/${this.questionGroups.size}):`);
        
        // Create questions for each language with proper locale
        const languageOrder = ['en', 'pt', 'es', 'fr']; // Process English first as master
        
        for (const language of languageOrder) {
          const firebaseQuestion = group.questions[language];
          if (firebaseQuestion) {
            const strapiData = this.convertToStrapiFormat(firebaseQuestion, baseId);
            
            await this.createStrapiQuestion(strapiData);
            this.log(`   ✅ Created ${language.toUpperCase()}: "${strapiData.question.substring(0, 60)}..."`);
            
            this.stats.processed.questions++;
          }
        }
        
        processedGroups++;
        this.stats.processed.groups++;
        
        // Progress update every 50 groups
        if (processedGroups % 50 === 0) {
          this.log(`\\n📊 Progress: ${processedGroups}/${this.questionGroups.size} groups | ${this.stats.strapi.created} questions created`);
        }
        
      } catch (error) {
        this.log(`❌ Error processing group ${baseId}: ${error.message}`);
        this.stats.processed.errors++;
      }
    }
  }

  /**
   * Show final migration report
   */
  showFinalReport() {
    this.log('\\n' + '='.repeat(70));
    this.log('🎉 CLEAN MIGRATION COMPLETED!');
    this.log('='.repeat(70));
    
    this.log(`\\n📊 FIREBASE SOURCE:`);
    this.log(`   Total questions: ${this.stats.firebase.total}`);
    Object.entries(this.stats.firebase.byLanguage).forEach(([lang, count]) => {
      this.log(`   ${lang.toUpperCase()}: ${count} questions`);
    });
    
    this.log(`\\n🔗 GROUPING RESULTS:`);
    this.log(`   Complete groups created: ${this.questionGroups.size}`);
    this.log(`   Questions per group: 4 (EN, PT, ES, FR)`);
    this.log(`   Expected total in Strapi: ${this.questionGroups.size * 4}`);
    
    this.log(`\\n📊 STRAPI MIGRATION:`);
    this.log(`   Questions created: ${this.stats.strapi.created}`);
    this.log(`   Groups processed: ${this.stats.processed.groups}`);
    this.log(`   Errors: ${this.stats.processed.errors}`);
    
    this.log(`\\n🌍 STRAPI LOCALE DISTRIBUTION:`);
    Object.entries(this.stats.strapi.byLocale).forEach(([locale, count]) => {
      this.log(`   ${locale.toUpperCase()}: ${count} questions`);
    });
    
    const successRate = ((this.stats.strapi.created / (this.questionGroups.size * 4)) * 100).toFixed(1);
    this.log(`\\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (this.stats.processed.errors === 0 && this.stats.strapi.created === this.questionGroups.size * 4) {
      this.log('\\n🎉 PERFECT MIGRATION! All questions created successfully with proper locales!');
    } else if (this.stats.processed.errors > 0) {
      this.log(`\\n⚠️ Migration completed with ${this.stats.processed.errors} errors.`);
    }
    
    this.log('\\n💡 NEXT STEPS:');
    this.log('   1. Check Strapi admin panel');
    this.log('   2. Verify questions appear in correct language tabs (EN, PT, ES, FR)');
    this.log('   3. Test question content and options');
    this.log('='.repeat(70));
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      this.initializeFirebase();
      await this.loadAndGroupQuestions();
      await this.migrateToStrapi();
      this.showFinalReport();
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }
}

// Run migration
async function main() {
  const migrator = new CleanMigrator();
  await migrator.runMigration();
}

main().catch(console.error);
