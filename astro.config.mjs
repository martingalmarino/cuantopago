import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = (process.env.SITE_URL?.trim() || 'https://www.abonito.com.ar').replace(/\/$/, '');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/mis-suscripciones') && !page.includes('/simular-ahorro'),
    }),
  ],
});
