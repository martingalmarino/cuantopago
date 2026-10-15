export type GuideIntent = 'cancelar' | 'ahorrar';
/** movistar, playstation y prime-video sólo aparecen donde una fuente oficial los menciona para esa plataforma. */
export type BillingChannel = 'directo' | 'apple' | 'google-play' | 'externo' | 'movistar' | 'playstation' | 'prime-video';
export type GuideRole = 'titular' | 'miembro';
/**
 * servicio: la suscripción principal. canal: un adicional que se paga dentro de otra plataforma. paquete: viene incluido en un combo como Apple One.
 * personal, familia, equipo y empresa: a quién cubre el plan, para servicios donde eso cambia quién puede gestionarlo.
 */
export type ProductScope = 'servicio' | 'canal' | 'paquete' | 'personal' | 'familia' | 'equipo' | 'empresa';
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

/** Pasos que cambian según el dispositivo o la versión. Sin JavaScript se ven todos. */
export interface GuideVariant {
  id: string;
  label: string;
  steps: string[];
}

/** Aviso informativo antes del botón oficial. No es un requisito para seguir. */
export interface GuideImpact {
  heading: string;
  points: { label: string; text: string }[];
  links: GuideCta[];
  sourceIds: string[];
}

export interface GuideRoute {
  id: string;
  intent: GuideIntent;
  /** Vacío cuando la ruta es para miembros: no depende de quién cobra. */
  channels: BillingChannel[];
  role: GuideRole | null;
  /** En guías con pregunta de alcance. Las rutas de miembro pueden tenerlo cuando el alcance cambia a quién recurrir. */
  scope?: ProductScope;
  transition?: PlanTransition;
  status: EvidenceStatus;
  heading: string;
  eligibility?: string;
  before: string[];
  /** Puede quedar vacío si la ruta tiene variantes. */
  steps: string[];
  variants?: GuideVariant[];
  /** Muestra el aviso impact de la guía antes del botón. */
  impact?: boolean;
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
  impact?: GuideImpact;
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
