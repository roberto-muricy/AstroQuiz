/**
 * Valida o question-bank.json e imprime distribuição.
 */
const path = require('path');

const questions = require('./question-bank.json');

const allowedTopics = [
  'Galaxies & Cosmology',
  'General Curiosities',
  'Relativity & Fundamental Physics',
  'Scientists',
  'Small Solar System Bodies',
  'Solar System',
  'Space Missions',
  'Space Observation',
  'Stellar Objects',
  'Worlds Beyond',
];

function validateQuestions() {
  let errors = 0;
  const byLevel = {};
  const byTopic = {};
  const byType = {};
  const byLocale = {};

  questions.forEach((q, index) => {
    // Required fields
    if (!q.baseId || !q.question || !q.correctOption) {
      console.error(`Question ${index}: Missing required fields (baseId/question/correctOption)`);
      errors++;
    }

    // Options
    if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      console.error(`Question ${index}: Missing options`);
      errors++;
    }

    // Correct option
    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) {
      console.error(`Question ${index}: Invalid correct option`);
      errors++;
    }

    // Level
    if (q.level < 1 || q.level > 5) {
      console.error(`Question ${index}: Invalid level ${q.level}`);
      errors++;
    }

    // Topic
    if (!allowedTopics.includes(q.topic)) {
      console.error(`Question ${index}: Invalid topic "${q.topic}"`);
      errors++;
    }

    // Explanation
    if (!q.explanation || q.explanation.length < 20) {
      console.error(`Question ${index}: Explanation too short`);
      errors++;
    }

    // Type
    const type = q.questionType || 'text';
    byType[type] = (byType[type] || 0) + 1;

    // Level count
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;

    // Topic count
    byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;

    // Locale count
    const loc = q.locale || 'en';
    byLocale[loc] = (byLocale[loc] || 0) + 1;
  });

  console.log('\nValidation complete:');
  console.log(`Total questions: ${questions.length}`);
  console.log(`Errors found: ${errors}`);
  console.log('\nBy Level:', byLevel);
  console.log('By Topic:', byTopic);
  console.log('By Type:', byType);
  console.log('By Locale:', byLocale);

  if (errors > 0) {
    console.log('\n⚠️  Há erros acima. Ajuste antes de importar.');
  } else {
    console.log('\n✅ Sem erros críticos.');
  }
}

validateQuestions();
