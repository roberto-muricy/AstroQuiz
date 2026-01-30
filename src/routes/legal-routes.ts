/**
 * Legal Routes
 * Serves Privacy Policy and Terms of Service pages
 */

import * as fs from 'fs';
import * as path from 'path';

export function createLegalRoutes(): any[] {
  // Use process.cwd() for production compatibility (works in both src and dist)
  const publicDir = path.resolve(process.cwd(), 'public');

  return [
    // Privacy Policy
    {
      method: 'GET',
      path: '/privacy-policy',
      handler: async (ctx: any) => {
        try {
          const filePath = path.join(publicDir, 'privacy-policy.html');
          const content = fs.readFileSync(filePath, 'utf-8');
          ctx.type = 'text/html';
          ctx.body = content;
        } catch (error) {
          ctx.throw(404, 'Privacy Policy not found');
        }
      },
      config: { auth: false },
    },

    // Terms of Service
    {
      method: 'GET',
      path: '/terms-of-service',
      handler: async (ctx: any) => {
        try {
          const filePath = path.join(publicDir, 'terms-of-service.html');
          const content = fs.readFileSync(filePath, 'utf-8');
          ctx.type = 'text/html';
          ctx.body = content;
        } catch (error) {
          ctx.throw(404, 'Terms of Service not found');
        }
      },
      config: { auth: false },
    },

    // Aliases (common alternative paths)
    {
      method: 'GET',
      path: '/privacy',
      handler: async (ctx: any) => {
        ctx.redirect('/privacy-policy');
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/terms',
      handler: async (ctx: any) => {
        ctx.redirect('/terms-of-service');
      },
      config: { auth: false },
    },
  ];
}
