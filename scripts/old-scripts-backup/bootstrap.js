/**
 * Bootstrap script for populating sample multilingual quiz data
 * This script runs automatically when Strapi starts
 */

const { sampleQuestions } = require('./sample-data');

module.exports = async ({ strapi }) => {
  console.log('🌍 Bootstrapping multilingual quiz data...');

  try {
    // Check if questions already exist
    const existingQuestions = await strapi.entityService.findMany('api::question.question', {
      populate: '*',
    });

    if (existingQuestions.length > 0) {
      console.log('✅ Sample data already exists, skipping bootstrap');
      return;
    }

    // Clear any existing data to avoid conflicts
    try {
      const allQuestions = await strapi.entityService.findMany('api::question.question', {
        populate: '*',
      });
      
      for (const question of allQuestions) {
        await strapi.entityService.delete('api::question.question', question.id);
      }
      console.log('🧹 Cleared existing questions');
    } catch (error) {
      console.log('No existing questions to clear');
    }

    // Create questions in all languages
    for (const questionData of sampleQuestions) {
      const { baseId, level, correctOption, translations } = questionData;

      // Create master question (English)
      const masterQuestion = await strapi.entityService.create('api::question.question', {
        data: {
          ...translations.en,
          baseId,
          level,
          correctOption,
          locale: 'en',
          publishedAt: new Date(),
        },
      });

      console.log(`✅ Created master question: ${baseId} (English)`);

      // Create translations for other languages
      for (const [locale, translation] of Object.entries(translations)) {
        if (locale !== 'en') {
          await strapi.entityService.create('api::question.question', {
            data: {
              ...translation,
              baseId,
              level,
              correctOption,
              locale,
              localizations: [masterQuestion.id],
              publishedAt: new Date(),
            },
          });

          console.log(`✅ Created translation: ${baseId} (${locale})`);
        }
      }
    }

    console.log('🎉 Successfully bootstrapped multilingual quiz data!');
    console.log(`📊 Created ${sampleQuestions.length} questions in 4 languages (${sampleQuestions.length * 4} total entries)`);

  } catch (error) {
    console.error('❌ Error bootstrapping data:', error);
  }
};
