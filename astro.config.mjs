import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const site = (process.env.SITE_URL?.trim() || 'https://www.abonito.com.ar').replace(/\/$/, '');

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const services = readJson('./src/data/services.json');
const plans = readJson('./src/data/plans.json');
const reviewedBySlug = new Map(services.map((service) => {
  const dates = plans
    .filter((plan) => plan.serviceId === service.id && !plan.retired && /^\d{4}-\d{2}-\d{2}$/.test(plan.verifiedAt ?? ''))
    .map((plan) => plan.verifiedAt)
    .sort();
  return [service.slug, dates.at(-1) ?? null];
}));

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/mis-suscripciones') && !page.includes('/simular-ahorro'),
      serialize: (item) => {
        const slug = new URL(item.url).pathname.match(/^\/([^/]+)\/$/)?.[1];
        const reviewed = slug ? reviewedBySlug.get(slug) : null;
        return reviewed ? { ...item, lastmod: reviewed } : item;
      },
    }),
  ],
});
