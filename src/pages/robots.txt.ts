import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const site = import.meta.env.SITE?.replace(/\/$/, '');
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /mis-suscripciones/',
    'Disallow: /simular-ahorro/',
  ];
  if (site) lines.push(`Sitemap: ${site}/sitemap-index.xml`);
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
