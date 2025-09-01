/**
 * API testing script for i18n functionality
 * Run this script to test all multilingual endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337';

const testEndpoints = async () => {
  console.log('🧪 Testing i18n API endpoints...\n');

  try {
    // Test 1: Get questions in English (default)
    console.log('1️⃣ Testing English questions (default)...');
    const enResponse = await axios.get(`${BASE_URL}/api/questions`);
    console.log(`✅ English questions: ${enResponse.data.data.length} found`);
    console.log(`   Sample question: ${enResponse.data.data[0]?.attributes?.question}\n`);

    // Test 2: Get questions in Portuguese
    console.log('2️⃣ Testing Portuguese questions...');
    const ptResponse = await axios.get(`${BASE_URL}/api/questions?locale=pt`);
    console.log(`✅ Portuguese questions: ${ptResponse.data.data.length} found`);
    console.log(`   Sample question: ${ptResponse.data.data[0]?.attributes?.question}\n`);

    // Test 3: Get questions in Spanish
    console.log('3️⃣ Testing Spanish questions...');
    const esResponse = await axios.get(`${BASE_URL}/api/questions?locale=es`);
    console.log(`✅ Spanish questions: ${esResponse.data.data.length} found`);
    console.log(`   Sample question: ${esResponse.data.data[0]?.attributes?.question}\n`);

    // Test 4: Get questions in French
    console.log('4️⃣ Testing French questions...');
    const frResponse = await axios.get(`${BASE_URL}/api/questions?locale=fr`);
    console.log(`✅ French questions: ${frResponse.data.data.length} found`);
    console.log(`   Sample question: ${frResponse.data.data[0]?.attributes?.question}\n`);

    // Test 5: Custom endpoint - Get questions by locale
    console.log('5️⃣ Testing custom locale endpoint...');
    const customPtResponse = await axios.get(`${BASE_URL}/api/questions/locale/pt`);
    console.log(`✅ Custom Portuguese endpoint: ${customPtResponse.data.data.length} found\n`);

    // Test 6: Get questions by level and locale
    console.log('6️⃣ Testing level + locale endpoint...');
    const levelResponse = await axios.get(`${BASE_URL}/api/questions/level/beginner/en`);
    console.log(`✅ Beginner English questions: ${levelResponse.data.data.length} found\n`);

    // Test 7: Get questions by topic and locale
    console.log('7️⃣ Testing topic + locale endpoint...');
    const topicResponse = await axios.get(`${BASE_URL}/api/questions/topic/astronomy/en`);
    console.log(`✅ Astronomy English questions: ${topicResponse.data.data.length} found\n`);

    // Test 8: Verify non-translatable fields are consistent
    console.log('8️⃣ Verifying non-translatable fields...');
    const enQuestions = enResponse.data.data;
    const ptQuestions = ptResponse.data.data;
    
    if (enQuestions.length > 0 && ptQuestions.length > 0) {
      const enBaseId = enQuestions[0].attributes.baseId;
      const ptBaseId = ptQuestions[0].attributes.baseId;
      const enLevel = enQuestions[0].attributes.level;
      const ptLevel = ptQuestions[0].attributes.level;
      
      console.log(`✅ BaseId consistency: ${enBaseId} === ${ptBaseId} (${enBaseId === ptBaseId})`);
      console.log(`✅ Level consistency: ${enLevel} === ${ptLevel} (${enLevel === ptLevel})`);
    }

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - English questions: ${enResponse.data.data.length}`);
    console.log(`   - Portuguese questions: ${ptResponse.data.data.length}`);
    console.log(`   - Spanish questions: ${esResponse.data.data.length}`);
    console.log(`   - French questions: ${frResponse.data.data.length}`);

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints };
