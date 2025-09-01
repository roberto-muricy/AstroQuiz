'use strict';

module.exports = () => {
  console.log('🚀 DeepL Translation Plugin loaded');
  
  return {
    // Define plugin controllers
    controllers: {
      translate: {
        async translateQuestion(ctx) {
          console.log('🔧 DeepL translate method called');
          
          try {
            const { id } = ctx.params;
            
            // Get the question
            const question = await strapi.entityService.findOne('api::question.question', id, {
              populate: '*'
            });
            
            if (!question) {
              return ctx.notFound('Question not found');
            }
            
            // Check if it's an English question
            if (question.locale !== 'en') {
              return ctx.badRequest('Only English questions can be translated');
            }
            
            // Import DeepL service
            const DeepLService = require('../../api/deepl/services/deepl');
            const deeplService = new DeepLService();
            await deeplService.init();
            
            // Translate the question
            const translations = await deeplService.translateQuestion(question);
            
            // Create localized versions
            await this.createLocalizedVersions(id, translations);
            
            ctx.send({
              success: true,
              message: 'Question translated successfully',
              translations
            });
            
          } catch (error) {
            console.error('❌ Translation error:', error);
            ctx.internalServerError('Translation failed: ' + error.message);
          }
        },
        
        async createLocalizedVersions(questionId, translations) {
          for (const [locale, data] of Object.entries(translations)) {
            try {
              await strapi.entityService.create('api::question.question', {
                data: {
                  ...data,
                  locale,
                  publishedAt: new Date()
                }
              });
              console.log(`✅ Created ${locale} version`);
            } catch (error) {
              console.error(`❌ Error creating ${locale} version:`, error);
            }
          }
        }
      }
    },
    
    // Define plugin routes
    routes: {
      'content-api': {
        type: 'content-api',
        routes: [
          {
            method: 'POST',
            path: '/questions/:id/translate',
            handler: 'translate.translateQuestion',
            config: {
              policies: [],
            }
          }
        ]
      }
    }
  };
};
