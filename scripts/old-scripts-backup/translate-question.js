/**
 * Manual Question Translation Script
 * Translates a specific question to all target languages
 */

require('dotenv').config();
const DeepLService = require('../src/api/deepl/services/deepl');

async function translateQuestion(questionId) {
  console.log(`🔄 Translating question ${questionId}...\n`);

  try {
    // Initialize DeepL service
    const deeplService = new DeepLService();
    await deeplService.init();
    
    // Get question data from Strapi
    const questionData = {
      question: "What is the largest planet in our solar system?",
      optionA: "Earth",
      optionB: "Mars", 
      optionC: "Jupiter",
      optionD: "Saturn",
      explanation: "Jupiter is the largest planet in our solar system, with a mass more than twice that of Saturn.",
      topic: "Astronomy"
    };

    console.log('📝 Original question data:');
    console.log(JSON.stringify(questionData, null, 2));
    console.log('');

    // Translate to all target languages
    const translations = await deeplService.translateQuestion(questionData);
    
    console.log('✅ Translations completed:');
    console.log(JSON.stringify(translations, null, 2));
    
    console.log('\n🎉 Translation successful!');
    console.log('📋 Next steps:');
    console.log('   1. Copy the translated content');
    console.log('   2. Create new questions in Strapi for each language');
    console.log('   3. Paste the translated content');
    
  } catch (error) {
    console.error('❌ Translation failed:', error.message);
  }
}

// Get question ID from command line argument
const questionId = process.argv[2] || 'j7hoqitm3fmv3sk3t0sk632h';
translateQuestion(questionId);
