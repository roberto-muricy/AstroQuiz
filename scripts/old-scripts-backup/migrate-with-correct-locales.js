#!/usr/bin/env node

/**
 * Migration script with CORRECT locale assignment
 * This creates questions with proper locale field based on language content
 */

const admin = require('firebase-admin');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CorrectedI18nMigrator {
  constructor() {
    this.db = null;
    this.questionGroups = new Map();
    this.stats = {
      totalQuestions: 0,
      groupsCreated: 0,
      localizationsCreated: 0,
      errors: 0,
      byLanguage: { en: 0, pt: 0, es: 0, fr: 0 }
    };
    
    this.strapi = {
      baseUrl: 'http://localhost:1337',
      endpoints: {
        questions: '/api/questions'
      }
    };
  }

  /**
   * Initialize Firebase connection
   */
  async initializeFirebase() {
    try {
      if (admin.apps.length > 0) {
        this.db = admin.firestore();
        this.log('✅ Using existing Firebase connection');
        return;
      }

      const serviceAccount = require('../firebase-service-account.json');
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://astroquiz-3a316.firebaseio.com'
      });

      this.db = admin.firestore();
      this.log('✅ Firebase initialized successfully');
      
    } catch (error) {
      this.log(`❌ Firebase initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate and fix correctOption value
   */
  validateCorrectOption(correctAnswer) {
    const answer = String(correctAnswer || 'A').toUpperCase().trim();
    
    // Map common variations to valid options
    const validOptions = ['A', 'B', 'C', 'D'];
    
    if (validOptions.includes(answer)) {
      return answer;
    }
    
    // Handle numeric answers (0=A, 1=B, 2=C, 3=D)
    if (/^\d+$/.test(answer)) {
      const num = parseInt(answer);
      if (num >= 0 && num <= 3) {
        return validOptions[num];
      }
    }
    
    // Default to A if invalid
    console.warn(`⚠️ Invalid correctAnswer "${correctAnswer}", defaulting to A`);
    return 'A';
  }

  /**
   * Detect language from question content
   */
  detectLanguage(questionData) {
    const content = (questionData.question + ' ' + questionData.options.join(' ')).toLowerCase();
    
    // Portuguese patterns
    if (/\b(qual|como|onde|quando|por que|quantos?|o que|de acordo com)\b/i.test(content) ||
        /\b(universo|galáxia|estrela|planeta|sistema solar)\b/i.test(content) ||
        /ção\b|ões\b|ão\b/i.test(content)) {
      return 'pt';
    }
    
    // Spanish patterns  
    if (/\b(qué|cuál|cómo|dónde|cuándo|por qué|cuántos?|de acuerdo con)\b/i.test(content) ||
        /\b(universo|galaxia|estrella|planeta|sistema solar)\b/i.test(content) ||
        /¿.*\?|ción\b|iones\b/i.test(content)) {
      return 'es';
    }
    
    // French patterns
    if (/\b(quel|quelle|comment|où|quand|pourquoi|combien|qu'est-ce que|selon)\b/i.test(content) ||
        /\b(univers|galaxie|étoile|planète|système solaire)\b/i.test(content) ||
        /\btion\b|ère\b|ème\b/i.test(content)) {
      return 'fr';
    }
    
    // English patterns (default)
    return 'en';
  }

  /**
   * Transform Firebase question to Strapi format with correct locale
   */
  transformQuestion(firebaseQuestion) {
    const detectedLang = this.detectLanguage(firebaseQuestion);
    
    return {
      question: firebaseQuestion.question,
      optionA: firebaseQuestion.options[0] || '',
      optionB: firebaseQuestion.options[1] || '',
      optionC: firebaseQuestion.options[2] || '',
      optionD: firebaseQuestion.options[3] || '',
      correctOption: this.validateCorrectOption(firebaseQuestion.correctAnswer),
      level: Math.min(Math.max(firebaseQuestion.level || 1, 1), 5), // Ensure level is between 1-5
      topic: firebaseQuestion.theme || firebaseQuestion.topics || 'General',
      explanation: firebaseQuestion.explanation || '',
      baseId: firebaseQuestion.baseId || `q${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      locale: detectedLang, // ✅ CORRECT LOCALE ASSIGNMENT
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Fetch and group questions by content similarity
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

      // Group questions by position (assuming language blocks: PT, EN, ES, FR)
      this.log('🗂️ Grouping questions by position...');

      const groups = new Map();
      const questionsPerLanguage = 362;

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

        // Add questions if they exist and transform them
        if (questions[ptIndex]) {
          const transformed = this.transformQuestion(questions[ptIndex]);
          transformed.baseId = baseId;
          transformed.locale = 'pt'; // Force correct locale
          group.questions.pt = transformed;
        }
        if (questions[enIndex]) {
          const transformed = this.transformQuestion(questions[enIndex]);
          transformed.baseId = baseId;
          transformed.locale = 'en'; // Force correct locale
          group.questions.en = transformed;
        }
        if (questions[esIndex]) {
          const transformed = this.transformQuestion(questions[esIndex]);
          transformed.baseId = baseId;
          transformed.locale = 'es'; // Force correct locale
          group.questions.es = transformed;
        }
        if (questions[frIndex]) {
          const transformed = this.transformQuestion(questions[frIndex]);
          transformed.baseId = baseId;
          transformed.locale = 'fr'; // Force correct locale
          group.questions.fr = transformed;
        }

        // Only add group if it has at least one question
        if (Object.keys(group.questions).length > 0) {
          groups.set(baseId, group);
        }
      }

      this.questionGroups = groups;
      this.log(`✅ Grouped into ${groups.size} question groups`);

      return groups;

    } catch (error) {
      this.log(`❌ Failed to fetch Firebase questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create question in Strapi with specific locale
   */
  async createQuestionInStrapi(questionData) {
    try {
      const response = await axios.post(
        `${this.strapi.baseUrl}${this.strapi.endpoints.questions}`,
        { data: questionData },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return response.data.data;
      
    } catch (error) {
      this.log(`❌ Failed to create question in Strapi: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Create localized version as independent question
   */
  async createLocalization(masterId, localizedData) {
    try {
      // Create localized version as independent question with same baseId
      const response = await axios.post(
        `${this.strapi.baseUrl}${this.strapi.endpoints.questions}`,
        {
          data: {
            ...localizedData,
            publishedAt: new Date().toISOString()
          }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return response.data.data;
      
    } catch (error) {
      this.log(`❌ Failed to create localization: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Migrate all question groups
   */
  async migrateQuestionGroups() {
    try {
      this.log('🚀 Starting migration of question groups...\n');

      let groupIndex = 0;
      for (const [baseId, group] of this.questionGroups.entries()) {
        groupIndex++;
        
        try {
          this.log(`📝 Processing group ${groupIndex}/${this.questionGroups.size}: ${baseId}`);

          // Step 1: Create master question (English)
          let masterQuestion = null;
          if (group.questions.en) {
            masterQuestion = await this.createQuestionInStrapi(group.questions.en);
            this.stats.byLanguage.en++;
            this.log(`  ✅ Created master (EN): ${masterQuestion.id}`);
          }

          // Step 2: Create localizations for other languages
          const locales = ['pt', 'es', 'fr'];
          const createdLocalizations = [];

          for (const locale of locales) {
            if (group.questions[locale]) {
              try {
                let localizedQuestion;
                
                if (masterQuestion) {
                  // Create as localization of master
                  localizedQuestion = await this.createLocalization(masterQuestion.id, group.questions[locale]);
                } else {
                  // Create as standalone if no master exists
                  localizedQuestion = await this.createQuestionInStrapi(group.questions[locale]);
                }
                
                createdLocalizations.push({ locale, id: localizedQuestion.id });
                this.stats.byLanguage[locale]++;
                this.stats.localizationsCreated++;
                
                this.log(`  ✅ Created ${locale.toUpperCase()}: ${localizedQuestion.id}`);
                
              } catch (error) {
                this.stats.errors++;
                this.log(`  ❌ Failed to create ${locale.toUpperCase()}: ${error.message}`);
              }
            }
          }

          this.stats.groupsCreated++;

          // Progress update every 50 groups
          if (groupIndex % 50 === 0) {
            const progress = Math.round((groupIndex / this.questionGroups.size) * 100);
            this.log(`\n📊 Progress: ${groupIndex}/${this.questionGroups.size} groups (${progress}%)\n`);
          }

        } catch (error) {
          this.stats.errors++;
          this.log(`❌ Error processing group ${baseId}: ${error.message}`);
        }
      }

      this.log('\n✅ Migration completed!');
      this.printSummary();

    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    this.log('\n' + '='.repeat(60));
    this.log('📊 CORRECTED I18N MIGRATION SUMMARY');
    this.log('='.repeat(60));
    this.log(`📥 Total Firebase Questions: ${this.stats.totalQuestions}`);
    this.log(`📦 Question Groups: ${this.questionGroups.size}`);
    this.log(`✅ Groups Migrated: ${this.stats.groupsCreated}`);
    this.log(`🌍 Localizations Created: ${this.stats.localizationsCreated}`);
    this.log(`❌ Errors: ${this.stats.errors}`);
    this.log('\n📈 Questions by Language:');
    Object.entries(this.stats.byLanguage).forEach(([lang, count]) => {
      if (count > 0) {
        this.log(`   ${lang.toUpperCase()}: ${count} questions`);
      }
    });
    this.log('='.repeat(60));
  }

  /**
   * Log with timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Main migration method
   */
  async migrate() {
    try {
      this.log('🚀 Starting CORRECTED I18N migration...\n');

      // Initialize Firebase
      await this.initializeFirebase();

      // Fetch and group questions
      await this.fetchAndGroupFirebaseQuestions();

      // Migrate question groups
      await this.migrateQuestionGroups();

      this.log('\n🎉 Corrected migration completed successfully!');
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const migrator = new CorrectedI18nMigrator();
  
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

module.exports = CorrectedI18nMigrator;
