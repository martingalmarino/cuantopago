import { contentTokens } from './text';
import type { KnowledgeBase } from './types';

export interface Doc {
  id: string;
  title: string;
  text: string;
  href: string;
  linkLabel: string;
  serviceId: string | null;
  /** Palabras que ayudan a encontrar el documento pero no se muestran. */
  extra?: string;
}

export interface Hit {
  doc: Doc;
  score: number;
  coverage: number;
}

export interface RetrievalIndex {
  docs: Doc[];
  terms: Map<string, number>[];
  lengths: number[];
  avgLength: number;
  df: Map<string, number>;
}

const K1 = 1.2;
const B = 0.75;
/** La pregunta tiene que compartir al menos esta parte de sus palabras con el documento. */
const MIN_COVERAGE = 0.5;
const MIN_SCORE = 2.5;

export function buildDocs(kb: KnowledgeBase): Doc[] {
  const docs: Doc[] = [];
  for (const service of kb.services) {
    const href = `/${service.slug}/`;
    docs.push({ id: `${service.id}:ficha`, title: service.name, text: service.description, extra: service.aliases.join(' '), href, linkLabel: `Ver ${service.name}`, serviceId: service.id });
    service.faqs.forEach((faq, index) => {
      docs.push({ id: `${service.id}:faq:${index}`, title: faq.q, text: faq.a, href: faq.href ?? href, linkLabel: faq.linkLabel ?? `Ver ${service.name}`, serviceId: service.id });
    });
    service.guide?.faqs.forEach((faq, index) => {
      docs.push({ id: `${service.id}:guia:${index}`, title: faq.q, text: faq.a, href: faq.href ?? service.guide!.cancelHref, linkLabel: faq.linkLabel ?? `Guía de ${service.name}`, serviceId: service.id });
    });
  }
  for (const page of kb.pages) {
    docs.push({ id: `pagina:${page.href}`, title: page.title, text: page.summary, extra: page.keywords.join(' '), href: page.href, linkLabel: `Ir a ${page.title}`, serviceId: null });
  }
  return docs;
}

export function buildRetrieval(kb: KnowledgeBase): RetrievalIndex {
  const docs = buildDocs(kb);
  const df = new Map<string, number>();
  const terms = docs.map((doc) => {
    const counts = new Map<string, number>();
    // El título pesa doble: suele ser la pregunta tal como la haría alguien.
    for (const token of [...contentTokens(doc.title), ...contentTokens(doc.title), ...contentTokens(doc.text), ...contentTokens(doc.extra ?? '')]) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    for (const token of counts.keys()) df.set(token, (df.get(token) ?? 0) + 1);
    return counts;
  });
  const lengths = terms.map((counts) => [...counts.values()].reduce((sum, value) => sum + value, 0));
  const avgLength = lengths.reduce((sum, value) => sum + value, 0) / Math.max(lengths.length, 1);
  return { docs, terms, lengths, avgLength, df };
}

export function search(index: RetrievalIndex, query: string, options: { serviceId?: string; faqOnly?: boolean; limit?: number } = {}): Hit[] {
  const words = [...new Set(contentTokens(query))];
  if (words.length === 0) return [];
  const total = index.docs.length;
  const hits: Hit[] = [];
  index.docs.forEach((doc, i) => {
    if (options.serviceId && doc.serviceId !== options.serviceId) return;
    if (options.faqOnly && !/:(faq|guia):/.test(doc.id)) return;
    let score = 0;
    let matched = 0;
    let inTitle = false;
    const title = new Set(contentTokens(doc.title));
    for (const word of words) {
      const tf = index.terms[i].get(word);
      if (!tf) continue;
      matched += 1;
      if (title.has(word)) inTitle = true;
      const df = index.df.get(word) ?? 0;
      const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * index.lengths[i]) / index.avgLength)));
    }
    const coverage = matched / words.length;
    // Con una sola palabra en común, tiene que estar en el título: «datos» no alcanza para traer cualquier FAQ.
    if (score >= MIN_SCORE && coverage >= MIN_COVERAGE && (matched >= 2 || inTitle)) hits.push({ doc, score, coverage });
  });
  return hits.sort((a, b) => b.score - a.score).slice(0, options.limit ?? 3);
}
