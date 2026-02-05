/**
 * Production Plugins Configuration
 * Cloudinary for image uploads
 */

module.exports = ({ env }) => ({
  // Enable i18n plugin
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      locales: ['en', 'pt', 'es', 'fr'],
    },
  },
  // Cloudinary upload provider
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
