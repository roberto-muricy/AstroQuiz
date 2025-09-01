#!/usr/bin/env node

/**
 * Firebase to Strapi Migration Script
 * Migrates 362 quiz questions from Firebase Firestore to Strapi CMS
 * 
 * Features:
 * - Connects to Firebase using Admin SDK
 * - Groups questions by baseId
 * - Creates master English questions first
 * - Creates localizations for PT, ES, FR
 * - Comprehensive error handling
 * - Progress tracking and detailed logging
 * - Data validation
 * - Migration report generation
 */

const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  firebase: {
    // You'll need to add your Firebase service account key file
    serviceAccountPath: './firebase-service-account.json',
    databaseURL: 'https://your-project-id.firebaseio.com' // Replace with your Firebase project URL
  },
  strapi: {
    baseUrl: 'http://localhost:1337',
    apiToken: null, // We'll use public API for now
    endpoints: {
      questions: '/api/questions'
    }
  },
  migration: {
    batchSize: 10,
    delayBetweenBatches: 1000, // ms
    maxRetries: 3
  },
  logging: {
    logFile: './migration-log.txt',
    reportFile: './migration-report.json'
  }
};

// Language mapping
const LANGUAGE_MAPPING = {
  'en': 'en',
  'pt': 'pt', 
  'es': 'es',
  'fr': 'fr'
};

// Master language priority (English first)
const MASTER_LANGUAGE = 'en';
const FALLBACK_LANGUAGES = ['es', 'pt', 'fr']; // If no English, try these in order

class FirebaseToStrapiMigrator {
  constructor() {
    this.stats = {
      totalQuestions: 0,
      processedQuestions: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedQuestions: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };
    
    this.logBuffer = [];
    this.questionGroups = new Map(); // baseId -> array of questions
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initializeFirebase() {
    try {
      this.log('🔥 Initializing Firebase Admin SDK...');
      
      // Check if service account file exists
      const serviceAccountPath = path.resolve(CONFIG.firebase.serviceAccountPath);
      
      try {
        await fs.access(serviceAccountPath);
      } catch (error) {
        throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
      }

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
   * Fetch all questions from Firebase
   */
  async fetchFirebaseQuestions() {
    try {
      this.log('📥 Fetching questions from Firebase...');
      
      const questionsRef = this.db.collection('questions');
      const snapshot = await questionsRef.get();
      
      const questions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        questions.push({
          id: doc.id,
          ...data
        });
      });

      this.stats.totalQuestions = questions.length;
      this.log(`✅ Fetched ${questions.length} questions from Firebase`);
      
      return questions;
      
    } catch (error) {
      this.log(`❌ Failed to fetch Firebase questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group questions by baseId
   */
  groupQuestionsByBaseId(questions) {
    this.log('🗂️ Grouping questions by baseId...');
    
    const groups = new Map();
    
    questions.forEach(question => {
      const baseId = question.baseId;
      if (!baseId) {
        this.log(`⚠️ Question ${question.id} has no baseId, skipping`);
        this.stats.skippedQuestions++;
        return;
      }

      if (!groups.has(baseId)) {
        groups.set(baseId, []);
      }
      
      groups.get(baseId).push(question);
    });

    this.questionGroups = groups;
    this.log(`✅ Grouped into ${groups.size} unique baseIds`);
    
    return groups;
  }

  /**
   * Identify master question (English or fallback)
   */
  identifyMasterQuestion(questionGroup) {
    // First try to find English version
    let master = questionGroup.find(q => q.language === MASTER_LANGUAGE);
    
    if (master) {
      return { master, locale: MASTER_LANGUAGE };
    }

    // Try fallback languages
    for (const lang of FALLBACK_LANGUAGES) {
      master = questionGroup.find(q => q.language === lang);
      if (master) {
        this.log(`⚠️ No English version found for ${questionGroup[0].baseId}, using ${lang} as master`);
        return { master, locale: lang };
      }
    }

    // If no known language found, use first question
    master = questionGroup[0];
    const detectedLocale = LANGUAGE_MAPPING[master.language] || 'en';
    this.log(`⚠️ Unknown language for ${master.baseId}, using first question as master (${detectedLocale})`);
    
    return { master, locale: detectedLocale };
  }

  /**
   * Validate question data
   */
  validateQuestionData(question) {
    const errors = [];
    
    // Required fields
    const requiredFields = ['baseId', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'];
    
    requiredFields.forEach(field => {
      if (!question[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate level
    if (question.level && (question.level < 1 || question.level > 5)) {
      errors.push(`Invalid level: ${question.level} (must be 1-5)`);
    }

    // Validate correctOption
    if (question.correctOption && !['A', 'B', 'C', 'D'].includes(question.correctOption)) {
      errors.push(`Invalid correctOption: ${question.correctOption} (must be A, B, C, or D)`);
    }

    return errors;
  }

  /**
   * Transform Firebase question to Strapi format
   */
  transformQuestionForStrapi(question, locale) {
    return {
      baseId: question.baseId,
      topic: question.topic || '',
      level: question.level || 1,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation: question.explanation || '',
      locale: locale
    };
  }

  /**
   * Create question in Strapi
   */
  async createStrapiQuestion(questionData, retryCount = 0) {
    try {
      const response = await axios.post(
        `${CONFIG.strapi.baseUrl}${CONFIG.strapi.endpoints.questions}`,
        { data: questionData },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
      
    } catch (error) {
      if (retryCount < CONFIG.migration.maxRetries) {
        this.log(`⚠️ Retry ${retryCount + 1}/${CONFIG.migration.maxRetries} for question ${questionData.baseId}`);
        await this.delay(CONFIG.migration.delayBetweenBatches);
        return this.createStrapiQuestion(questionData, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Process a single question group (baseId)
   */
  async processQuestionGroup(baseId, questionGroup) {
    try {
      this.log(`\n🔄 Processing group: ${baseId} (${questionGroup.length} questions)`);
      
      // Identify master question
      const { master, locale: masterLocale } = this.identifyMasterQuestion(questionGroup);
      
      // Validate master question
      const validationErrors = this.validateQuestionData(master);
      if (validationErrors.length > 0) {
        throw new Error(`Master question validation failed: ${validationErrors.join(', ')}`);
      }

      // Transform and create master question
      const masterData = this.transformQuestionForStrapi(master, masterLocale);
      this.log(`📝 Creating master question (${masterLocale}): ${master.question.substring(0, 50)}...`);
      
      const createdMaster = await this.createStrapiQuestion(masterData);
      const masterId = createdMaster.data?.id;
      
      if (!masterId) {
        throw new Error('Failed to get master question ID from Strapi response');
      }
      
      this.log(`✅ Master question created with ID: ${masterId}`);

      // Process localizations
      const localizations = [];
      const processedLanguages = new Set([masterLocale]);
      
      for (const question of questionGroup) {
        const questionLocale = LANGUAGE_MAPPING[question.language];
        
        // Skip if already processed or invalid locale
        if (!questionLocale || processedLanguages.has(questionLocale)) {
          continue;
        }
        
        try {
          const localizationData = this.transformQuestionForStrapi(question, questionLocale);
          this.log(`🌍 Creating localization (${questionLocale}): ${question.question.substring(0, 50)}...`);
          
          const createdLocalization = await this.createStrapiQuestion(localizationData);
          const localizationId = createdLocalization.data?.id;
          
          if (localizationId) {
            localizations.push({
              locale: questionLocale,
              id: localizationId,
              question: question.question.substring(0, 50) + '...'
            });
            this.log(`✅ Localization created (${questionLocale}) with ID: ${localizationId}`);
          }
          
          processedLanguages.add(questionLocale);
          
        } catch (error) {
          this.log(`❌ Failed to create localization (${questionLocale}): ${error.message}`);
          this.stats.errors.push({
            baseId,
            locale: questionLocale,
            error: error.message,
            question: question.question.substring(0, 50) + '...'
          });
        }
        
        // Delay between requests
        await this.delay(200);
      }

      this.stats.successfulMigrations++;
      this.log(`✅ Group ${baseId} completed: 1 master + ${localizations.length} localizations`);
      
      return {
        baseId,
        master: { id: masterId, locale: masterLocale },
        localizations,
        success: true
      };
      
    } catch (error) {
      this.stats.failedMigrations++;
      this.stats.errors.push({
        baseId,
        error: error.message,
        group: questionGroup.map(q => ({ language: q.language, question: q.question.substring(0, 30) + '...' }))
      });
      
      this.log(`❌ Failed to process group ${baseId}: ${error.message}`);
      
      return {
        baseId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run the complete migration
   */
  async migrate() {
    try {
      this.log('🚀 Starting Firebase to Strapi migration...');
      this.stats.startTime = new Date();

      // Initialize connections
      await this.initializeFirebase();
      await this.testStrapiConnection();

      // Fetch and group questions
      const questions = await this.fetchFirebaseQuestions();
      const questionGroups = this.groupQuestionsByBaseId(questions);

      // Process in batches
      const groupEntries = Array.from(questionGroups.entries());
      const results = [];
      
      for (let i = 0; i < groupEntries.length; i += CONFIG.migration.batchSize) {
        const batch = groupEntries.slice(i, i + CONFIG.migration.batchSize);
        
        this.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.migration.batchSize) + 1}/${Math.ceil(groupEntries.length / CONFIG.migration.batchSize)}`);
        
        const batchPromises = batch.map(([baseId, group]) => 
          this.processQuestionGroup(baseId, group)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const [baseId] = batch[index];
          this.stats.processedQuestions++;
          
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            this.stats.failedMigrations++;
            this.stats.errors.push({
              baseId,
              error: result.reason.message
            });
            this.log(`❌ Batch processing failed for ${baseId}: ${result.reason.message}`);
          }
        });

        // Progress update
        const progress = Math.round((this.stats.processedQuestions / questionGroups.size) * 100);
        this.log(`📊 Progress: ${this.stats.processedQuestions}/${questionGroups.size} groups (${progress}%)`);
        
        // Delay between batches
        if (i + CONFIG.migration.batchSize < groupEntries.length) {
          await this.delay(CONFIG.migration.delayBetweenBatches);
        }
      }

      // Finalize migration
      this.stats.endTime = new Date();
      await this.generateReport(results);
      await this.saveLogs();

      this.log('\n🎉 Migration completed!');
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
        startTime: this.stats.startTime,
        endTime: this.stats.endTime,
        duration: this.stats.endTime - this.stats.startTime,
        totalQuestions: this.stats.totalQuestions,
        processedQuestions: this.stats.processedQuestions,
        successfulMigrations: this.stats.successfulMigrations,
        failedMigrations: this.stats.failedMigrations,
        skippedQuestions: this.stats.skippedQuestions,
        successRate: Math.round((this.stats.successfulMigrations / this.stats.processedQuestions) * 100)
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
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📥 Total Firebase Questions: ${this.stats.totalQuestions}`);
    console.log(`🗂️  Question Groups Processed: ${this.stats.processedQuestions}`);
    console.log(`✅ Successful Migrations: ${this.stats.successfulMigrations}`);
    console.log(`❌ Failed Migrations: ${this.stats.failedMigrations}`);
    console.log(`⏭️  Skipped Questions: ${this.stats.skippedQuestions}`);
    console.log(`📈 Success Rate: ${Math.round((this.stats.successfulMigrations / this.stats.processedQuestions) * 100)}%`);
    
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
  const migrator = new FirebaseToStrapiMigrator();
  
  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FirebaseToStrapiMigrator;
