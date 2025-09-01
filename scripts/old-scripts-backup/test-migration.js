#!/usr/bin/env node

/**
 * Migration Test Script
 * Tests the migration process with a small sample of data
 */

const FirebaseToStrapiMigrator = require('./migrate-from-firebase');

class MigrationTester extends FirebaseToStrapiMigrator {
  constructor() {
    super();
    this.testMode = true;
    this.maxTestQuestions = 5; // Only test with 5 question groups
  }

  /**
   * Override to limit questions for testing
   */
  async fetchFirebaseQuestions() {
    const questions = await super.fetchFirebaseQuestions();
    
    // Group by baseId and take only first few groups
    const groups = new Map();
    
    for (const question of questions) {
      if (groups.size >= this.maxTestQuestions) break;
      
      const baseId = question.baseId;
      if (!baseId) continue;
      
      if (!groups.has(baseId)) {
        groups.set(baseId, []);
      }
      groups.get(baseId).push(question);
    }
    
    // Flatten back to array
    const testQuestions = [];
    for (const group of groups.values()) {
      testQuestions.push(...group);
    }
    
    this.log(`🧪 Test mode: Limited to ${testQuestions.length} questions from ${groups.size} groups`);
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
      const questionGroups = this.groupQuestionsByBaseId(questions);
      
      let validGroups = 0;
      let invalidGroups = 0;
      const validationErrors = [];
      
      for (const [baseId, group] of questionGroups) {
        this.log(`\n🔍 Validating group: ${baseId}`);
        
        try {
          // Identify master question
          const { master, locale } = this.identifyMasterQuestion(group);
          
          // Validate master
          const errors = this.validateQuestionData(master);
          if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
          }
          
          // Validate all questions in group
          for (const question of group) {
            const questionErrors = this.validateQuestionData(question);
            if (questionErrors.length > 0) {
              this.log(`⚠️ Question ${question.language} has issues: ${questionErrors.join(', ')}`);
            }
          }
          
          this.log(`✅ Group ${baseId} is valid (master: ${locale})`);
          validGroups++;
          
        } catch (error) {
          this.log(`❌ Group ${baseId} is invalid: ${error.message}`);
          invalidGroups++;
          validationErrors.push({ baseId, error: error.message });
        }
      }
      
      // Summary
      this.log(`\n📊 Dry run results:`);
      this.log(`   Valid groups: ${validGroups}`);
      this.log(`   Invalid groups: ${invalidGroups}`);
      this.log(`   Validation errors: ${validationErrors.length}`);
      
      if (validationErrors.length > 0) {
        this.log(`\n❌ Validation errors found:`);
        validationErrors.forEach(error => {
          this.log(`   ${error.baseId}: ${error.error}`);
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
  const tester = new MigrationTester();
  
  console.log('🧪 Migration Test Suite\n');
  
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
    
    console.log(`✅ Test migration completed: ${results.length} groups processed`);
    
    // Test 3: Verify created questions
    console.log('\n3️⃣ Verifying created questions in Strapi...');
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:1337/api/questions');
      const strapiQuestions = response.data.data;
      
      console.log(`📊 Found ${strapiQuestions.length} questions in Strapi`);
      
      // Check for test questions
      const testBaseIds = results.map(r => r.baseId);
      const foundTestQuestions = strapiQuestions.filter(q => 
        testBaseIds.includes(q.baseId)
      );
      
      console.log(`✅ Test questions found in Strapi: ${foundTestQuestions.length}`);
      
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
    const tester = new MigrationTester();
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
