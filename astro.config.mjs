import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL?.trim().replace(/\/$/, '') || undefined;

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    ...(site
      ? [
          sitemap({
            filter: (page) =>
              !page.includes('/mis-suscripciones') && !page.includes('/simular-ahorro'),
          }),
        ]
      : []),
  ],
});
