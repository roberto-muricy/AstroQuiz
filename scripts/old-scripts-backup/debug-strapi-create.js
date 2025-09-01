#!/usr/bin/env node

/**
 * Debug script to test Strapi question creation
 */

const axios = require('axios');

async function testCreateQuestion() {
  console.log('🧪 Testing Strapi question creation...\n');

  // Test 1: Minimal question
  console.log('1️⃣ Testing minimal question...');
  try {
    const minimalQuestion = {
      question: "Test question",
      optionA: "Option A",
      optionB: "Option B", 
      optionC: "Option C",
      optionD: "Option D",
      correctOption: "A",
      baseId: "test_minimal",
      level: 1,
      locale: "en",
      topic: "Test"
    };

    const response1 = await axios.post(
      'http://localhost:1337/api/questions',
      { data: minimalQuestion },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ Minimal question created:', response1.data.data.id);
    
  } catch (error) {
    console.log('❌ Minimal question failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.error?.message);
    console.log('   Details:', JSON.stringify(error.response?.data?.error?.details, null, 2));
  }

  // Test 2: Question with explanation
  console.log('\n2️⃣ Testing question with explanation...');
  try {
    const fullQuestion = {
      question: "What is 2+2?",
      optionA: "3",
      optionB: "4", 
      optionC: "5",
      optionD: "6",
      correctOption: "B",
      explanation: null,
      baseId: "test_full",
      level: 1,
      locale: "en",
      topic: "Math"
    };

    const response2 = await axios.post(
      'http://localhost:1337/api/questions',
      { data: fullQuestion },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ Full question created:', response2.data.data.id);
    
  } catch (error) {
    console.log('❌ Full question failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.error?.message);
    console.log('   Details:', JSON.stringify(error.response?.data?.error?.details, null, 2));
  }

  // Test 3: Firebase-like question
  console.log('\n3️⃣ Testing Firebase-like question...');
  try {
    const firebaseQuestion = {
      question: "De acordo com teorias recentes, o que poderia explicar o Paradoxo de Fermi?",
      optionA: "Placas tectônicas são raras",
      optionB: "Filtro grande se tornou IA avançada", 
      optionC: "Civilizações se autodestroem",
      optionD: "Todas as anteriores",
      correctOption: "D",
      explanation: null,
      baseId: "qd76877f6",
      level: 5,
      locale: "pt",
      topic: "Galaxias e Cosmologia"
    };

    const response3 = await axios.post(
      'http://localhost:1337/api/questions',
      { data: firebaseQuestion },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log('✅ Firebase-like question created:', response3.data.data.id);
    
  } catch (error) {
    console.log('❌ Firebase-like question failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.error?.message);
    console.log('   Details:', JSON.stringify(error.response?.data?.error?.details, null, 2));
    
    // Show full error for debugging
    if (error.response?.data) {
      console.log('\n📝 Full error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🎯 Debug complete!');
}

testCreateQuestion().catch(console.error);
