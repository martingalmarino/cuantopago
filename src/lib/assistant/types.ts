import type { Currency } from '../money';
import type { CategoryId, TaxInclusion, TaxRule } from '../types';

export const KNOWLEDGE_PATH = '/asistente/conocimiento.json';
export const CHAT_STORAGE_KEY = 'abonito:chat';

export interface KbPlan {
  id: string;
  name: string;
  amountMinor: number | null;
  currency: Currency | null;
  months: number;
  days: number | null;
  tax: TaxInclusion;
  otherCharges: boolean;
  ruleIds: string[];
  verifiedAt: string | null;
  sourceUrl: string | null;
  available: boolean | null;
  selectable: boolean;
  eligibility: string | null;
  /** Sólo informativa: nunca entra en un total. */
  promo: { amountMinor: number; currency: Currency; cycles: number; note: string } | null;
  ads: boolean | null;
  resolution: string | null;
  screens: number | null;
  downloads: string | null;
  storage: string | null;
  members: number | null;
}

export interface KbFaq {
  q: string;
  a: string;
  href?: string;
  linkLabel?: string;
}

export interface KbGuide {
  cancelHref: string;
  saveHref: string;
  intro: string;
  billers: string[];
  billerCheck: { text: string; label: string; url: string };
  faqs: KbFaq[];
}

export interface KbService {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  tags: string[];
  category: CategoryId;
  secondary: CategoryId[];
  description: string;
  officialUrl: string;
  /** Respuesta a «cuánto sale», la misma que muestra la ficha. */
  answer: string;
  cheapestPlanId: string | null;
  /** Mensual comparable dentro de la misma moneda: con impuestos si se pudieron sumar, si no el publicado. */
  rank: { minor: number; currency: Currency; withTax: boolean } | null;
  priceShort: string | null;
  faqs: KbFaq[];
  plans: KbPlan[];
  guide: KbGuide | null;
}

export interface KbPage {
  href: string;
  title: string;
  summary: string;
  keywords: string[];
}

export interface KbCategory {
  id: CategoryId;
  label: string;
  keywords: string[];
}

export interface KnowledgeBase {
  version: 1;
  revision: string;
  builtAt: string;
  categories: KbCategory[];
  services: KbService[];
  taxRules: TaxRule[];
  fx: { basis: string; sourceUrl: string };
  billingGuides: { apple: string; googlePlay: string };
  pages: KbPage[];
}

export type Intent =
  | 'saludo'
  | 'ayuda'
  | 'precio'
  | 'planes'
  | 'plan_mas_barato'
  | 'comparar'
  | 'impuestos'
  | 'dolar'
  | 'calcular'
  | 'cancelar'
  | 'pagar_menos'
  | 'categoria'
  | 'caracteristica'
  | 'busqueda'
  | 'sin_respuesta';

export interface AnswerLink {
  label: string;
  href: string;
}

export interface AnswerSource {
  label: string;
  href: string;
  reviewedAt: string | null;
}

export interface AnswerTable {
  caption: string;
  head: string[];
  rows: string[][];
}

export interface Answer {
  intent: Intent;
  /** false cuando no hubo dato publicado para responder. */
  answered: boolean;
  paragraphs: string[];
  table?: AnswerTable;
  links: AnswerLink[];
  sources: AnswerSource[];
  suggestions: string[];
  serviceIds: string[];
}

export interface ChatContext {
  serviceIds: string[];
  intent: Intent | null;
}
