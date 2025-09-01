/**
 * DeepL Controller
 * Handles translation requests and admin panel integration
 */

'use strict';

module.exports = {
  /**
   * Test DeepL API connection
   */
  async testConnection(ctx) {
    try {
      const deeplService = strapi.service('api::deepl.deepl');
      const usage = await deeplService.testConnection();
      
      ctx.body = {
        success: true,
        message: 'DeepL API connection successful',
        usage
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get DeepL API usage statistics
   */
  async getUsage(ctx) {
    try {
      const deeplService = strapi.service('api::deepl.deepl');
      const usage = await deeplService.getUsage();
      
      ctx.body = {
        success: true,
        data: usage
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Translate text directly using DeepL
   */
  async translateText(ctx) {
    try {
      const { text, targetLang, sourceLang = 'EN' } = ctx.request.body;

      if (!text || !targetLang) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Text and targetLang are required'
        };
        return;
      }

      const deeplService = strapi.service('api::deepl.deepl');
      const translatedText = await deeplService.translateText(text, targetLang, sourceLang);
      const usage = await deeplService.getUsage();

      ctx.body = {
        success: true,
        data: {
          translatedText,
          sourceLang,
          targetLang,
          usage
        }
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Translate a question to specified target language
   */
  async translateQuestion(ctx) {
    try {
      const { questionId } = ctx.params;
      const { targetLang, fields = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation', 'topic'] } = ctx.request.body;

      if (!targetLang) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'targetLang is required'
        };
        return;
      }

      // Get the original question
      const originalQuestion = await strapi.entityService.findOne('api::question.question', questionId, {
        populate: '*'
      });

      if (!originalQuestion) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Question not found'
        };
        return;
      }

      const deeplService = strapi.service('api::deepl.deepl');
      const translatedFields = {};

      // Translate each specified field
      for (const field of fields) {
        if (originalQuestion[field]) {
          try {
            const translatedText = await deeplService.translateText(
              originalQuestion[field], 
              targetLang, 
              'EN'
            );
            translatedFields[field] = translatedText;
          } catch (error) {
            console.warn(`Failed to translate field ${field}:`, error.message);
            translatedFields[field] = originalQuestion[field]; // Fallback to original
          }
        }
      }

      const usage = await deeplService.getUsage();

      ctx.body = {
        success: true,
        data: {
          originalQuestion: {
            id: originalQuestion.id,
            documentId: originalQuestion.documentId,
            question: originalQuestion.question,
            locale: originalQuestion.locale
          },
          translatedFields,
          targetLang,
          usage
        }
      };

    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get translation progress
   */
  async getTranslationProgress(ctx) {
    try {
      const { questionId } = ctx.params;

      // Simple implementation - in production this would check actual progress
      ctx.body = {
        success: true,
        data: {
          questionId,
          status: 'completed',
          progress: 100
        }
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Reset usage counters
   */
  async resetCounters(ctx) {
    try {
      const deeplService = strapi.service('api::deepl.deepl');
      await deeplService.resetCounters();
      
      ctx.body = {
        success: true,
        message: 'Usage counters reset successfully'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  }
};