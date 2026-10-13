export type GuideIntent = 'cancelar' | 'ahorrar';
/** movistar, playstation y prime-video sólo aparecen donde una fuente oficial los menciona para esa plataforma. */
export type BillingChannel = 'directo' | 'apple' | 'google-play' | 'externo' | 'movistar' | 'playstation' | 'prime-video';
export type GuideRole = 'titular' | 'miembro';
/** servicio: la suscripción principal. canal: un adicional que se paga dentro de otra plataforma. paquete: viene incluido en un combo como Apple One. */
export type ProductScope = 'servicio' | 'canal' | 'paquete';
/** verified: la fuente oficial describe el camino. conditional: depende de la cuenta o de la tienda. official_handoff: derivamos a la ayuda oficial sin pasos propios. */
export type EvidenceStatus = 'verified' | 'conditional' | 'official_handoff';
/** Cómo se llega a pagar menos según la fuente. No se muestra: sirve para validar que el texto no prometa otra cosa. */
export type PlanTransition = 'next_cycle' | 'cancel_then_expire_then_resubscribe' | 'inspect_account';
/** readable_article: leímos el cuerpo. store_listing: descripción del desarrollador en la tienda. indexed_excerpt: sólo un resumen indexado. */
export type SourceEvidence = 'readable_article' | 'store_listing' | 'indexed_excerpt';
export type RegionalScope = 'ar' | 'latam' | 'global' | 'otro-pais';

export interface GuideSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  locale: string;
  applicability: string;
  /** Última vez que una persona leyó el contenido. No se actualiza sola. */
  lastReviewedAt: string;
  /** Última vez que se comprobó que el enlace responde. */
  lastLinkCheckedAt: string;
  regionalScope?: RegionalScope;
  evidence?: SourceEvidence;
}

export interface GuideCta {
  label: string;
  url: string;
}

export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideRoute {
  id: string;
  intent: GuideIntent;
  /** Vacío cuando la ruta es para miembros: no depende de quién cobra. */
  channels: BillingChannel[];
  role: GuideRole | null;
  /** Sólo en guías con pregunta de alcance, para los objetivos donde se pregunta. */
  scope?: ProductScope;
  transition?: PlanTransition;
  status: EvidenceStatus;
  heading: string;
  eligibility?: string;
  before: string[];
  steps: string[];
  cta: GuideCta | null;
  ctaNote?: string;
  after: string[];
  troubleshooting: string[];
  related?: GuideLink[];
  sourceIds: string[];
}

export interface RoleQuestion {
  legend: string;
  options: { id: GuideRole; label: string; hint: string }[];
}

export interface ScopeQuestion {
  legend: string;
  /** Objetivos en los que se hace la pregunta. En los demás, las rutas no llevan alcance. */
  intents: GuideIntent[];
  /** askChannel false: ese alcance tiene una sola ruta y no se pregunta quién cobra. */
  options: { id: ProductScope; label: string; hint: string; askChannel: boolean }[];
}

export interface PlatformGuide {
  platformId: string;
  slug: string;
  name: string;
  providerName: string;
  aliases: string[];
  existingLogoRef: string | null;
  catalogHref: string;
  h1: string;
  intro: string;
  seo: { title: string; description: string };
  channels: BillingChannel[];
  channelHints: Partial<Record<BillingChannel, string>>;
  roleQuestion: RoleQuestion | null;
  scopeQuestion?: ScopeQuestion;
  billerCheck: { text: string; label: string; url: string; sourceId: string };
  routes: GuideRoute[];
  faqs: { question: string; answer: string }[];
  updatedAt: string;
}

export interface BillingGuideSection {
  heading: string;
  steps: string[];
  note?: string;
}

export interface BillingGuide {
  id: 'apple' | 'google-play';
  slug: string;
  name: string;
  h1: string;
  intro: string;
  seo: { title: string; description: string };
  cta: GuideCta;
  before: string[];
  sections: BillingGuideSection[];
  after: string[];
  troubleshooting: string[];
  sourceIds: string[];
  updatedAt: string;
}
