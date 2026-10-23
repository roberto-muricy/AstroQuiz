export default [
  'strapi::logger',
  'strapi::errors',
  // Antes de strapi::body, que descompacta o corpo com o zlib do Node.
  // Ver src/middlewares/recusar-corpo-comprimido.ts (CVE-2026-111497).
  'global::recusar-corpo-comprimido',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
