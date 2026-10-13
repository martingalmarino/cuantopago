import { allowedHosts } from './engine';
import { buildEntityIndex, parse } from './nlu';
import type { KnowledgeBase } from './types';

/** Cada plataforma tiene que poder encontrarse por su nombre, y cada enlace del índice tiene que ser HTTPS. */
export function validateKnowledge(kb: KnowledgeBase): string[] {
  const errors: string[] = [];
  const index = buildEntityIndex(kb);
  for (const service of kb.services) {
    const found = parse(service.name, index, { serviceIds: [], intent: null }).serviceIds;
    if (!found.includes(service.id)) errors.push(`El chat no encuentra «${service.name}» por su nombre (encontró: ${found.join(', ') || 'nada'}).`);
    if (service.guide && !service.guide.cancelHref.startsWith('/')) errors.push(`La guía de ${service.name} no es una ruta interna.`);
  }
  const hosts = allowedHosts(kb);
  for (const service of kb.services) {
    if (!/^https:\/\//.test(service.officialUrl)) errors.push(`El sitio oficial de ${service.name} no es HTTPS.`);
    for (const plan of service.plans) {
      if (plan.sourceUrl && !hosts.has(URL.canParse(plan.sourceUrl) ? new URL(plan.sourceUrl).hostname : '')) {
        errors.push(`La fuente del plan ${plan.id} no es una URL HTTPS válida.`);
      }
    }
  }
  return errors;
}
