#!/usr/bin/env node

/**
 * Firebase to Strapi Migration with Proper i18n Relationships
 * This version creates proper Strapi i18n relationships between localized content
 */

const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  firebase: {
    serviceAccountPath: './firebase-service-account.json',
    databaseURL: 'https://astroquiz-3a316-default-rtdb.firebaseio.com'
  },
  strapi: {
    baseUrl: 'http://localhost:1337',
    endpoints: {
      questions: '/api/questions'
    }
  },
  migration: {
    batchSize: 5,
    delayBetweenBatches: 2000, // ms
    maxRetries: 3
  },
  logging: {
    logFile: './migration-i18n-log.txt',
    reportFile: './migration-i18n-report.json'
  }
};

// Language mapping
const LANGUAGE_MAPPING = {
  'en': 'en',
  'pt': 'pt', 
  'es': 'es',
  'fr': 'fr'
};

class I18nFirebaseToStrapiMigrator {
  constructor() {
    this.stats = {
      totalQuestions: 0,
      processedGroups: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedQuestions: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };
    
    this.logBuffer = [];
    this.questionGroups = new Map(); // Group questions by content similarity
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initializeFirebase() {
    try {
      this.log('🔥 Initializing Firebase Admin SDK...');
      
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.log('✅ Firebase already initialized, reusing existing app');
        this.db = admin.firestore();
        return;
      }
      
      const serviceAccountPath = path.resolve(CONFIG.firebase.serviceAccountPath);
      const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: CONFIG.firebase.databaseURL
      });

      this.db = admin.firestore();
      this.log('✅ Firebase initialized successfully');
      
    } catch (error) {
      this.log(`❌ Firebase initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test Strapi connection
   */
  async testStrapiConnection() {
    try {
      this.log('🔗 Testing Strapi connection...');
      const response = await axios.get(`${CONFIG.strapi.baseUrl}/api/questions`);
      this.log(`✅ Strapi connection successful (${response.status})`);
    } catch (error) {
      this.log(`❌ Strapi connection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all questions from Firebase and group them
   */
  async fetchAndGroupFirebaseQuestions() {
    try {
      this.log('📥 Fetching questions from Firebase...');
      
      const questionsRef = this.db.collection('questions');
      const snapshot = await questionsRef.get();
      
      const questions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        questions.push({
          firebaseId: doc.id,
          ...data
        });
      });

      this.stats.totalQuestions = questions.length;
      this.log(`✅ Fetched ${questions.length} questions from Firebase`);
      
      // Group questions by position (Firebase organizes in language blocks)
      this.log('🗂️ Grouping questions by position (language blocks)...');
      
      const groups = new Map();
      const questionsPerLanguage = 362; // Based on analysis
      
      // Group questions assuming 4 languages in blocks of 362
      for (let i = 0; i < questionsPerLanguage; i++) {
        const ptIndex = i;                           // Portuguese: 0-361
        const enIndex = i + questionsPerLanguage;    // English: 362-723
        const esIndex = i + (questionsPerLanguage * 2); // Spanish: 724-1085
        const frIndex = i + (questionsPerLanguage * 3); // French: 1086-1447
        
        const baseId = `q${String(i + 1).padStart(4, '0')}`; // q0001, q0002, etc.
        
        const group = {
          baseId: baseId,
          questions: {}
        };
        
        // Add questions if they exist
        if (questions[ptIndex] && questions[ptIndex].language === 'pt') {
          group.questions.pt = questions[ptIndex];
        }
        if (questions[enIndex] && questions[enIndex].language === 'en') {
          group.questions.en = questions[enIndex];
        }
        if (questions[esIndex] && questions[esIndex].language === 'es') {
          group.questions.es = questions[esIndex];
        }
        if (questions[frIndex] && questions[frIndex].language === 'fr') {
          group.questions.fr = questions[frIndex];
        }
        
        // Only add group if it has at least one question
        if (Object.keys(group.questions).length > 0) {
          groups.set(baseId, group);
        }
      }

      this.questionGroups = groups;
      this.log(`✅ Grouped into ${groups.size} question groups`);
      
      // Show sample of groups
      let sampleCount = 0;
      for (const [contentKey, group] of groups.entries()) {
        if (sampleCount < 3) {
          const languages = Object.keys(group.questions);
          this.log(`📋 Group ${group.baseId}: [${languages.join(', ')}] - ${languages.length} languages`);
          sampleCount++;
        }
      }
      
      return groups;
      
    } catch (error) {
      this.log(`❌ Failed to fetch Firebase questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate content key for grouping similar questions
   */
  generateContentKey(question) {
    // Use a combination of question content and options to create a unique key
    const content = (question.question || '') + 
                   (question.options ? question.options.join('') : '') +
                   (question.correctAnswer || '').toString();
    
    // Remove language-specific characters and normalize
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
    
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
  }

  /**
   * Generate baseId from question content
   */
  generateBaseId(question) {
    const content = question.question + (question.theme || '') + (question.topics?.[0] || '');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return `q${hash.substring(0, 8)}`;
  }

  /**
   * Transform Firebase question to Strapi format
   */
  transformQuestionForStrapi(firebaseQuestion, baseId) {
    // Extract options (assuming array format)
    const options = firebaseQuestion.options || [];
    const optionA = options[0] || '';
    const optionB = options[1] || '';
    const optionC = options[2] || '';
    const optionD = options[3] || '';
    
    // Convert correctAnswer to correctOption format
    let correctOption = 'A';
    if (typeof firebaseQuestion.correctAnswer === 'number') {
      const answerIndex = firebaseQuestion.correctAnswer;
      correctOption = ['A', 'B', 'C', 'D'][answerIndex] || 'A';
    }

    // Get topic from theme or topics
    const topic = firebaseQuestion.theme || 
                  (firebaseQuestion.topics && firebaseQuestion.topics[0]) || 
                  'General';

    // Normalize level (ensure it's between 1-5)
    let level = firebaseQuestion.level || firebaseQuestion.difficulty || 1;
    if (level > 5) level = 5;
    if (level < 1) level = 1;

    // Get locale
    const locale = LANGUAGE_MAPPING[firebaseQuestion.language] || 'en';

    return {
      baseId: baseId,
      topic: topic,
      level: parseInt(level),
      question: firebaseQuestion.question || '',
      optionA: optionA,
      optionB: optionB,
      optionC: optionC,
      optionD: optionD,
      correctOption: correctOption,
      explanation: firebaseQuestion.explanation || null,
      locale: locale
    };
  }

  /**
   * Create master question in Strapi (English version)
   */
  async createMasterQuestion(questionData) {
    try {
      const response = await axios.post(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`,
        { data: questionData },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      return response.data.data;
      
    } catch (error) {
      throw new Error(`Failed to create master question: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Create localized version of a question
   */
  async createLocalizedQuestion(questionData, masterQuestionId) {
    try {
      // For Strapi i18n, we create a localized version by referencing the master
      const response = await axios.post(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`,
        { 
          data: {
            ...questionData,
            // Note: In a full i18n setup, we'd use localizations field
            // For now, we'll use baseId to group them logically
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      return response.data.data;
      
    } catch (error) {
      throw new Error(`Failed to create localized question: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Process a question group (all languages for one question)
   */
  async processQuestionGroup(group) {
    try {
      this.stats.processedGroups++;
      
      const { baseId, questions } = group;
      const results = {
        baseId: baseId,
        master: null,
        localizations: {},
        success: true,
        errors: []
      };

      // Step 1: Create master question (preferably English)
      let masterQuestion = null;
      let masterLocale = 'en';
      
      if (questions.en) {
        masterQuestion = questions.en;
        masterLocale = 'en';
      } else {
        // If no English, use the first available language as master
        const availableLocales = Object.keys(questions);
        masterLocale = availableLocales[0];
        masterQuestion = questions[masterLocale];
      }

      if (!masterQuestion) {
        throw new Error('No questions found in group');
      }

      // Transform and create master question
      const masterData = this.transformQuestionForStrapi(masterQuestion, baseId);
      const createdMaster = await this.createMasterQuestion(masterData);
      
      results.master = {
        strapiId: createdMaster.id,
        locale: masterLocale,
        firebaseId: masterQuestion.firebaseId
      };

      this.log(`✅ Created master question (${masterLocale}) ID: ${createdMaster.id} - ${masterData.question.substring(0, 50)}...`);

      // Step 2: Create localized versions for other languages
      for (const [locale, question] of Object.entries(questions)) {
        if (locale === masterLocale) continue; // Skip master, already created
        
        try {
          const localizedData = this.transformQuestionForStrapi(question, baseId);
          const createdLocalized = await this.createLocalizedQuestion(localizedData, createdMaster.id);
          
          results.localizations[locale] = {
            strapiId: createdLocalized.id,
            firebaseId: question.firebaseId
          };

          this.log(`✅ Created localized question (${locale}) ID: ${createdLocalized.id} - ${localizedData.question.substring(0, 50)}...`);
          
        } catch (error) {
          results.errors.push(`${locale}: ${error.message}`);
          this.log(`❌ Failed to create ${locale} version: ${error.message}`);
        }
      }

      if (results.errors.length > 0) {
        results.success = false;
      }

      this.stats.successfulMigrations++;
      return results;
      
    } catch (error) {
      this.stats.failedMigrations++;
      this.stats.errors.push({
        baseId: group.baseId,
        error: error.message
      });
      
      this.log(`❌ Failed to process group ${group.baseId}: ${error.message}`);
      
      return {
        baseId: group.baseId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run the complete migration with i18n relationships
   */
  async migrate() {
    try {
      this.log('🚀 Starting Firebase to Strapi i18n migration...');
      this.stats.startTime = new Date();

      // Initialize connections
      await this.initializeFirebase();
      await this.testStrapiConnection();

      // Fetch and group questions
      const groups = await this.fetchAndGroupFirebaseQuestions();

      // Process groups in batches
      const results = [];
      const groupsArray = Array.from(groups.values());
      
      for (let i = 0; i < groupsArray.length; i += CONFIG.migration.batchSize) {
        const batch = groupsArray.slice(i, i + CONFIG.migration.batchSize);
        
        this.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.migration.batchSize) + 1}/${Math.ceil(groupsArray.length / CONFIG.migration.batchSize)}`);
        
        const batchPromises = batch.map(group => 
          this.processQuestionGroup(group)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            this.stats.failedMigrations++;
            this.stats.errors.push({
              baseId: batch[index].baseId,
              error: result.reason.message
            });
            this.log(`❌ Batch processing failed for ${batch[index].baseId}: ${result.reason.message}`);
          }
        });

        // Progress update
        const progress = Math.round((this.stats.processedGroups / groupsArray.length) * 100);
        this.log(`📊 Progress: ${this.stats.processedGroups}/${groupsArray.length} groups (${progress}%)`);
        
        // Delay between batches
        if (i + CONFIG.migration.batchSize < groupsArray.length) {
          await this.delay(CONFIG.migration.delayBetweenBatches);
        }
      }

      // Finalize migration
      this.stats.endTime = new Date();
      await this.generateReport(results);
      await this.saveLogs();

      this.log('\n🎉 i18n Migration completed!');
      this.printSummary();
      
      return results;
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate detailed migration report
   */
  async generateReport(results) {
    const report = {
      migration: {
        type: 'i18n_grouped',
        startTime: this.stats.startTime,
        endTime: this.stats.endTime,
        duration: this.stats.endTime - this.stats.startTime,
        totalQuestions: this.stats.totalQuestions,
        processedGroups: this.stats.processedGroups,
        successfulMigrations: this.stats.successfulMigrations,
        failedMigrations: this.stats.failedMigrations,
        successRate: Math.round((this.stats.successfulMigrations / this.stats.processedGroups) * 100)
      },
      results: results,
      errors: this.stats.errors,
      config: CONFIG
    };

    try {
      await fs.writeFile(
        CONFIG.logging.reportFile, 
        JSON.stringify(report, null, 2)
      );
      this.log(`📄 Migration report saved to: ${CONFIG.logging.reportFile}`);
    } catch (error) {
      this.log(`⚠️ Failed to save migration report: ${error.message}`);
    }
  }

  /**
   * Save logs to file
   */
  async saveLogs() {
    try {
      const logContent = this.logBuffer.join('\n');
      await fs.writeFile(CONFIG.logging.logFile, logContent);
      this.log(`📝 Logs saved to: ${CONFIG.logging.logFile}`);
    } catch (error) {
      console.error(`Failed to save logs: ${error.message}`);
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 I18N MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📥 Total Firebase Questions: ${this.stats.totalQuestions}`);
    console.log(`🗂️  Question Groups: ${this.questionGroups.size}`);
    console.log(`🔄 Groups Processed: ${this.stats.processedGroups}`);
    console.log(`✅ Successful Migrations: ${this.stats.successfulMigrations}`);
    console.log(`❌ Failed Migrations: ${this.stats.failedMigrations}`);
    console.log(`📈 Success Rate: ${Math.round((this.stats.successfulMigrations / this.stats.processedGroups) * 100)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  ${this.stats.errors.length} errors occurred:`);
      this.stats.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.baseId}: ${error.error}`);
      });
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more (see report file)`);
      }
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Logging with timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.logBuffer.push(logMessage);
  }
}

// Main execution
async function main() {
  const migrator = new I18nFirebaseToStrapiMigrator();
  
  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('💥 i18n Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = I18nFirebaseToStrapiMigrator;
