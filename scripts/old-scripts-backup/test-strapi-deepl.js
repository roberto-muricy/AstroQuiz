/**
 * Test DeepL Integration in Strapi
 * Tests the DeepL service directly within Strapi context
 */

require('dotenv').config();

async function testStrapiDeepL() {
  console.log('🧪 Testing DeepL Integration in Strapi...\n');

  try {
    // Import the DeepL service
    const DeepLService = require('../src/api/deepl/services/deepl');
    
    console.log('✅ DeepL service imported successfully');
    
    // Create instance
    const deeplService = new DeepLService();
    console.log('✅ DeepL service instance created');
    
    // Initialize
    await deeplService.init();
    console.log('✅ DeepL service initialized');
    
    // Test connection
    const usage = await deeplService.testConnection();
    console.log('✅ DeepL API connection successful');
    console.log('📊 Usage:', usage);
    
    // Test translation
    const testText = "What is the largest planet in our solar system?";
    const translated = await deeplService.translateText(testText, 'pt');
    console.log('✅ Translation successful');
    console.log(`🌐 "${testText}" → "${translated}"`);
    
    console.log('\n🎉 All tests passed! DeepL integration is working in Strapi!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStrapiDeepL();
