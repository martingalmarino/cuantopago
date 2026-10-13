import type { DollarQuote } from '../quotes';
import {
  calcAnswer,
  cancelAnswer,
  categoryAnswer,
  cheapestPlanAnswer,
  clarifyServiceAnswer,
  compareAnswer,
  dollarAnswer,
  featureAnswer,
  greetingAnswer,
  helpAnswer,
  noAnswer,
  plansAnswer,
  priceAnswer,
  saveAnswer,
  searchAnswer,
  taxAnswer,
  todayAr,
} from './answers';
import { buildEntityIndex, parse, type Parsed } from './nlu';
import { buildRetrieval, search } from './retrieval';
import { contentTokens, normalize } from './text';
import type { Answer, ChatContext, KbService, KnowledgeBase } from './types';

export const MAX_QUESTION_LENGTH = 300;
export const EMPTY_CONTEXT: ChatContext = { serviceIds: [], intent: null };

export interface AssistantOptions {
  loadQuotes?: () => Promise<DollarQuote[]>;
  asOf?: string;
}

export interface Reply {
  answer: Answer;
  context: ChatContext;
}

/** Hosts a los que puede apuntar una respuesta: sólo los que ya están en los datos revisados. */
export function allowedHosts(kb: KnowledgeBase): Set<string> {
  const urls = [
    ...kb.services.flatMap((service) => [
      service.officialUrl,
      ...service.plans.map((plan) => plan.sourceUrl),
      service.guide?.billerCheck.url ?? null,
    ]),
    ...kb.taxRules.map((rule) => rule.sourceUrl),
    kb.fx.sourceUrl,
  ];
  const hosts = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:') hosts.add(parsed.hostname);
    } catch {
      // Una URL mal formada en los datos no se ofrece como enlace.
    }
  }
  return hosts;
}

export function isSafeHref(href: string, hosts: Set<string>): boolean {
  if (href.startsWith('/') && !href.startsWith('//') && !href.includes('\\')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && hosts.has(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sanitize(answer: Answer, hosts: Set<string>): Answer {
  const seen = new Set<string>();
  answer.links = answer.links.filter((link) => {
    if (!isSafeHref(link.href, hosts) || seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
  answer.sources = answer.sources.filter((source) => isSafeHref(source.href, hosts) && /^https:/.test(source.href));
  answer.suggestions = [...new Set(answer.suggestions)].slice(0, 4);
  return answer;
}

export function createAssistant(kb: KnowledgeBase, options: AssistantOptions = {}) {
  const entities = buildEntityIndex(kb);
  const retrieval = buildRetrieval(kb);
  const hosts = allowedHosts(kb);
  const byId = new Map(kb.services.map((service) => [service.id, service]));
  const managed = kb.services.filter((service) => service.guide);

  function plansMatching(service: KbService, leftover: string[]): string[] {
    const words = leftover.filter((word) => word.length >= 3);
    if (words.length === 0) return [];
    const ids = service.plans.filter((plan) => words.some((word) => normalize(plan.name).split(' ').includes(word))).map((plan) => plan.id);
    return ids.length < service.plans.length ? ids : [];
  }

  /** Busca en las preguntas frecuentes de la plataforma sin contar su nombre, que aparece en casi todas. */
  function serviceFaq(service: KbService, text: string) {
    const names = new Set(contentTokens([service.name, service.slug.replace(/-/g, ' '), ...service.aliases].join(' ')));
    const query = contentTokens(text).filter((token) => !names.has(token)).join(' ');
    if (!query) return null;
    const hit = search(retrieval, query, { serviceId: service.id, faqOnly: true, limit: 1 })[0];
    return hit && hit.coverage >= 0.6 ? hit : null;
  }

  async function answerFor(text: string, parsed: Parsed): Promise<Answer> {
    const asOf = options.asOf ?? todayAr();
    const services = parsed.serviceIds.map((id) => byId.get(id)).filter((service): service is KbService => Boolean(service));
    const service = services[0] ?? null;
    const folded = normalize(text);
    switch (parsed.intent) {
      case 'saludo':
        return greetingAnswer(/\b(gracias|genial|perfecto|joya|buenisimo)\b/.test(folded));
      case 'ayuda':
        return helpAnswer();
      case 'calcular':
        return calcAnswer(kb, parsed.amount!, asOf, text.trim());
      case 'dolar': {
        let quotes: DollarQuote[] | null = null;
        try {
          quotes = options.loadQuotes ? await options.loadQuotes() : null;
        } catch {
          quotes = null;
        }
        return dollarAnswer(kb, quotes, parsed.dollarKind);
      }
      case 'cancelar':
        return cancelAnswer(kb, service, managed);
      case 'pagar_menos':
        return saveAnswer(service);
      case 'comparar':
        return services.length >= 2 ? compareAnswer(services) : service ? priceAnswer(service) : clarifyServiceAnswer('comparar');
      case 'impuestos':
        return taxAnswer(kb, service, asOf);
      case 'caracteristica': {
        if (!service || !parsed.feature) return clarifyServiceAnswer('caracteristica');
        const faq = serviceFaq(service, text);
        return featureAnswer(service, parsed.feature, faq ? { q: faq.doc.title, a: faq.doc.text } : null);
      }
      case 'plan_mas_barato':
        return service ? cheapestPlanAnswer(service) : categoryAnswer(kb, parsed.categoryId, true);
      case 'categoria':
        return categoryAnswer(kb, parsed.categoryId, /\b(mas barat\w*|mas economic\w*|menor precio|mas accesible|menos)\b/.test(folded));
      case 'planes':
      case 'precio': {
        if (!service) return clarifyServiceAnswer(parsed.intent);
        const only = plansMatching(service, parsed.leftover);
        if (only.length) return plansAnswer(service, parsed.months, only);
        if (parsed.leftover.length >= 1) {
          const faq = serviceFaq(service, text);
          if (faq) return searchAnswer(faq.doc, service.id);
        }
        const answer = parsed.intent === 'planes' ? plansAnswer(service, parsed.months) : priceAnswer(service);
        if (/^que es\b/.test(folded)) answer.paragraphs.unshift(service.description);
        return answer;
      }
      default: {
        const hit = search(retrieval, text, { limit: 1 })[0];
        if (hit) return searchAnswer(hit.doc, hit.doc.serviceId);
        if (/\b(cuanto|precio|plan|planes|sale|cuesta|vale)\b/.test(folded)) return clarifyServiceAnswer('precio');
        return noAnswer();
      }
    }
  }

  async function respond(raw: string, context: ChatContext = EMPTY_CONTEXT): Promise<Reply> {
    const text = raw.slice(0, MAX_QUESTION_LENGTH);
    if (!normalize(text)) return { answer: sanitize(helpAnswer(), hosts), context };
    const parsed = parse(text, entities, context);
    const answer = sanitize(await answerFor(text, parsed), hosts);
    return {
      answer,
      context: { serviceIds: answer.serviceIds.length ? answer.serviceIds : context.serviceIds, intent: answer.intent },
    };
  }

  return { respond, hosts };
}

export type Assistant = ReturnType<typeof createAssistant>;
