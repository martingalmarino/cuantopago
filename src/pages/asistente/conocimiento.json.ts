import type { APIRoute } from 'astro';
import { buildKnowledge } from '../../lib/assistant/knowledge';

export const prerender = true;

export const GET: APIRoute = () => new Response(JSON.stringify(buildKnowledge()), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
