#!/usr/bin/env node

/**
 * Firebase to Strapi Migration Script (Adapted for Real Data Structure)
 * Migrates 1448 quiz questions from Firebase Firestore to Strapi CMS
 * 
 * Real Firebase Structure:
 * - No baseId (each question is unique)
 * - options: array instead of optionA/B/C/D
 * - correctAnswer instead of correctOption
 * - theme/topics instead of topic
 * - Different ID format
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

class RealFirebaseToStrapiMigrator {
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
          firebaseId: doc.id,
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
   * Generate baseId from question content
   */
  generateBaseId(question) {
    // Create a consistent baseId based on question content
    const content = question.question + (question.theme || '') + (question.topics?.[0] || '');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return `q${hash.substring(0, 8)}`;
  }

  /**
   * Transform Firebase question to Strapi format
   */
  transformQuestionForStrapi(firebaseQuestion) {
    // Generate consistent baseId
    const baseId = this.generateBaseId(firebaseQuestion);
    
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
    } else if (typeof firebaseQuestion.correctAnswer === 'string') {
      // If it's already A/B/C/D format
      if (['A', 'B', 'C', 'D'].includes(firebaseQuestion.correctAnswer)) {
        correctOption = firebaseQuestion.correctAnswer;
      } else {
        // Try to find which option matches the answer
        const answerIndex = options.indexOf(firebaseQuestion.correctAnswer);
        if (answerIndex >= 0) {
          correctOption = ['A', 'B', 'C', 'D'][answerIndex] || 'A';
        }
      }
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
   * Process a single Firebase question
   */
  async processQuestion(firebaseQuestion) {
    try {
      this.stats.processedQuestions++;
      
      // Transform Firebase question to Strapi format
      const strapiQuestion = this.transformQuestionForStrapi(firebaseQuestion);
      
      // Validate transformed question
      const validationErrors = this.validateQuestionData(strapiQuestion);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Create question in Strapi
      const created = await this.createStrapiQuestion(strapiQuestion);
      const createdId = created.data?.id;
      
      if (!createdId) {
        throw new Error('Failed to get question ID from Strapi response');
      }
      
      this.stats.successfulMigrations++;
      this.log(`✅ Created question (${strapiQuestion.locale}) ID: ${createdId} - ${strapiQuestion.question.substring(0, 50)}...`);
      
      return {
        firebaseId: firebaseQuestion.firebaseId,
        strapiId: createdId,
        baseId: strapiQuestion.baseId,
        locale: strapiQuestion.locale,
        success: true
      };
      
    } catch (error) {
      this.stats.failedMigrations++;
      this.stats.errors.push({
        firebaseId: firebaseQuestion.firebaseId,
        error: error.message,
        question: firebaseQuestion.question?.substring(0, 50) + '...'
      });
      
      this.log(`❌ Failed to process question ${firebaseQuestion.firebaseId}: ${error.message}`);
      
      return {
        firebaseId: firebaseQuestion.firebaseId,
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

      // Fetch questions
      const questions = await this.fetchFirebaseQuestions();

      // Process in batches
      const results = [];
      
      for (let i = 0; i < questions.length; i += CONFIG.migration.batchSize) {
        const batch = questions.slice(i, i + CONFIG.migration.batchSize);
        
        this.log(`\n📦 Processing batch ${Math.floor(i / CONFIG.migration.batchSize) + 1}/${Math.ceil(questions.length / CONFIG.migration.batchSize)}`);
        
        const batchPromises = batch.map(question => 
          this.processQuestion(question)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            this.stats.failedMigrations++;
            this.stats.errors.push({
              firebaseId: batch[index].firebaseId,
              error: result.reason.message
            });
            this.log(`❌ Batch processing failed for ${batch[index].firebaseId}: ${result.reason.message}`);
          }
        });

        // Progress update
        const progress = Math.round((this.stats.processedQuestions / questions.length) * 100);
        this.log(`📊 Progress: ${this.stats.processedQuestions}/${questions.length} questions (${progress}%)`);
        
        // Delay between batches
        if (i + CONFIG.migration.batchSize < questions.length) {
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
    console.log(`🔄 Questions Processed: ${this.stats.processedQuestions}`);
    console.log(`✅ Successful Migrations: ${this.stats.successfulMigrations}`);
    console.log(`❌ Failed Migrations: ${this.stats.failedMigrations}`);
    console.log(`⏭️  Skipped Questions: ${this.stats.skippedQuestions}`);
    console.log(`📈 Success Rate: ${Math.round((this.stats.successfulMigrations / this.stats.processedQuestions) * 100)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  ${this.stats.errors.length} errors occurred:`);
      this.stats.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.firebaseId}: ${error.error}`);
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
  const migrator = new RealFirebaseToStrapiMigrator();
  
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

module.exports = RealFirebaseToStrapiMigrator;
