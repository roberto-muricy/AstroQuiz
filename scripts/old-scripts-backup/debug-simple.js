#!/usr/bin/env node

const axios = require('axios');

async function testSimplest() {
  console.log('🧪 Testing simplest possible question...\n');

  try {
    // Test without baseId (in case unique constraint is causing issues)
    const simpleQuestion = {
      question: "Test?",
      optionA: "A",
      optionB: "B", 
      optionC: "C",
      optionD: "D",
      correctOption: "A",
      level: 1,
      locale: "en"
    };

    console.log('📤 Sending:', JSON.stringify(simpleQuestion, null, 2));

    const response = await axios.post(
      'http://localhost:1337/api/questions',
      { data: simpleQuestion },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ Success! Created question ID:', response.data.data.id);
    
  } catch (error) {
    console.log('❌ Failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.error?.message);
    
    if (error.response?.data?.error?.details) {
      console.log('   Details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    
    // Try to get more info from error
    if (error.response?.data) {
      console.log('\n📝 Full response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    // Show request details
    console.log('\n📤 Request details:');
    console.log('   URL:', error.config?.url);
    console.log('   Method:', error.config?.method);
    console.log('   Data:', error.config?.data);
  }
}

testSimplest().catch(console.error);
