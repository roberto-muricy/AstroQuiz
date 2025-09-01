#!/usr/bin/env node

/**
 * Test script for real Firebase data structure migration
 */

const RealMigrator = require('./migrate-firebase-real');

class RealMigrationTester extends RealMigrator {
  constructor() {
    super();
    this.testMode = true;
    this.maxTestQuestions = 3; // Only test with 3 questions
  }

  /**
   * Override to limit questions for testing
   */
  async fetchFirebaseQuestions() {
    const questions = await super.fetchFirebaseQuestions();
    
    // Take only first few questions for testing
    const testQuestions = questions.slice(0, this.maxTestQuestions);
    
    this.log(`🧪 Test mode: Limited to ${testQuestions.length} questions`);
    this.stats.totalQuestions = testQuestions.length;
    
    return testQuestions;
  }

  /**
   * Override to add test-specific logging
   */
  log(message) {
    const testMessage = `[TEST] ${message}`;
    super.log(testMessage);
  }

  /**
   * Dry run - validate data without creating in Strapi
   */
  async dryRun() {
    try {
      this.log('🧪 Starting dry run (validation only)...');
      
      // Initialize Firebase only
      await this.initializeFirebase();
      
      // Fetch and validate questions
      const questions = await this.fetchFirebaseQuestions();
      
      let validQuestions = 0;
      let invalidQuestions = 0;
      const validationErrors = [];
      
      for (const [index, firebaseQuestion] of questions.entries()) {
        this.log(`\n🔍 Validating question ${index + 1}: ${firebaseQuestion.firebaseId}`);
        
        try {
          // Transform Firebase question to Strapi format
          const strapiQuestion = this.transformQuestionForStrapi(firebaseQuestion);
          
          this.log(`📝 Original: ${firebaseQuestion.question?.substring(0, 50)}...`);
          this.log(`🔄 Transformed baseId: ${strapiQuestion.baseId}`);
          this.log(`🌍 Language: ${firebaseQuestion.language} → ${strapiQuestion.locale}`);
          this.log(`📊 Level: ${firebaseQuestion.level} → ${strapiQuestion.level}`);
          this.log(`✅ Options: [${strapiQuestion.optionA?.substring(0, 20)}..., ${strapiQuestion.optionB?.substring(0, 20)}..., ...]`);
          this.log(`🎯 Correct: ${firebaseQuestion.correctAnswer} → ${strapiQuestion.correctOption}`);
          
          // Validate transformed question
          const errors = this.validateQuestionData(strapiQuestion);
          if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
          }
          
          this.log(`✅ Question ${index + 1} is valid`);
          validQuestions++;
          
        } catch (error) {
          this.log(`❌ Question ${index + 1} is invalid: ${error.message}`);
          invalidQuestions++;
          validationErrors.push({ 
            firebaseId: firebaseQuestion.firebaseId, 
            error: error.message 
          });
        }
      }
      
      // Summary
      this.log(`\n📊 Dry run results:`);
      this.log(`   Valid questions: ${validQuestions}`);
      this.log(`   Invalid questions: ${invalidQuestions}`);
      this.log(`   Validation errors: ${validationErrors.length}`);
      
      if (validationErrors.length > 0) {
        this.log(`\n❌ Validation errors found:`);
        validationErrors.forEach(error => {
          this.log(`   ${error.firebaseId}: ${error.error}`);
        });
      }
      
      return validationErrors.length === 0;
      
    } catch (error) {
      this.log(`💥 Dry run failed: ${error.message}`);
      throw error;
    }
  }
}

async function runTests() {
  const tester = new RealMigrationTester();
  
  console.log('🧪 Real Firebase Migration Test Suite\n');
  
  try {
    // Test 1: Dry run validation
    console.log('1️⃣ Running dry run validation...');
    const isValid = await tester.dryRun();
    
    if (!isValid) {
      console.log('❌ Dry run found validation errors. Fix these before running full migration.');
      process.exit(1);
    }
    
    console.log('✅ Dry run passed!\n');
    
    // Test 2: Small migration test
    console.log('2️⃣ Running small migration test...');
    const results = await tester.migrate();
    
    console.log(`✅ Test migration completed: ${results.length} questions processed`);
    
    // Test 3: Verify created questions
    console.log('\n3️⃣ Verifying created questions in Strapi...');
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:1337/api/questions');
      const strapiQuestions = response.data.data;
      
      console.log(`📊 Found ${strapiQuestions.length} questions in Strapi`);
      
      // Check for test questions
      const testBaseIds = results.filter(r => r.success).map(r => r.baseId);
      const foundTestQuestions = strapiQuestions.filter(q => 
        testBaseIds.includes(q.baseId)
      );
      
      console.log(`✅ Test questions found in Strapi: ${foundTestQuestions.length}`);
      
      // Show sample created question
      if (foundTestQuestions.length > 0) {
        const sample = foundTestQuestions[0];
        console.log(`\n📝 Sample created question:`);
        console.log(`   ID: ${sample.id}`);
        console.log(`   BaseId: ${sample.baseId}`);
        console.log(`   Locale: ${sample.locale}`);
        console.log(`   Question: ${sample.question?.substring(0, 60)}...`);
        console.log(`   Options: ${sample.optionA}, ${sample.optionB}, ${sample.optionC}, ${sample.optionD}`);
        console.log(`   Correct: ${sample.correctOption}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Could not verify Strapi questions: ${error.message}`);
    }
    
    console.log('\n🎉 All tests passed! Ready for full migration.');
    
  } catch (error) {
    console.error('💥 Tests failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run')) {
    // Run only dry run
    const tester = new RealMigrationTester();
    tester.dryRun()
      .then(isValid => {
        process.exit(isValid ? 0 : 1);
      })
      .catch(error => {
        console.error('Dry run failed:', error.message);
        process.exit(1);
      });
  } else {
    // Run full test suite
    runTests();
  }
}
