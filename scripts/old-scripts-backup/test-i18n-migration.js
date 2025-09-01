#!/usr/bin/env node

/**
 * Test script for i18n migration
 */

const I18nMigrator = require('./migrate-with-i18n');

class I18nMigrationTester extends I18nMigrator {
  constructor() {
    super();
    this.testMode = true;
    this.maxTestGroups = 2; // Only test with 2 question groups
  }

  /**
   * Override to limit groups for testing
   */
  async fetchAndGroupFirebaseQuestions() {
    const groups = await super.fetchAndGroupFirebaseQuestions();
    
    // Take only first few groups for testing
    const groupsArray = Array.from(groups.entries());
    const testGroups = new Map(groupsArray.slice(0, this.maxTestGroups));
    
    this.log(`🧪 Test mode: Limited to ${testGroups.size} question groups`);
    this.questionGroups = testGroups;
    
    return testGroups;
  }

  /**
   * Override to add test-specific logging
   */
  log(message) {
    const testMessage = `[I18N-TEST] ${message}`;
    super.log(testMessage);
  }
}

async function runI18nTest() {
  const tester = new I18nMigrationTester();
  
  console.log('🧪 i18n Firebase Migration Test\n');
  
  try {
    const results = await tester.migrate();
    
    console.log(`✅ Test i18n migration completed: ${results.length} groups processed`);
    
    // Show sample results
    if (results.length > 0) {
      const sample = results[0];
      console.log(`\n📝 Sample group result:`);
      console.log(`   BaseId: ${sample.baseId}`);
      console.log(`   Master: ${sample.master?.locale} (ID: ${sample.master?.strapiId})`);
      console.log(`   Localizations: ${Object.keys(sample.localizations || {}).join(', ')}`);
      console.log(`   Success: ${sample.success}`);
    }
    
  } catch (error) {
    console.error('💥 i18n Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runI18nTest();
}
