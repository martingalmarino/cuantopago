export type GuideIntent = 'cancelar' | 'ahorrar';
export type BillingChannel = 'directo' | 'apple' | 'google-play' | 'externo';
export type GuideRole = 'titular' | 'miembro';
/** verified: la fuente oficial describe el camino. conditional: depende de la cuenta o de la tienda. official_handoff: derivamos a la ayuda oficial sin pasos propios. */
export type EvidenceStatus = 'verified' | 'conditional' | 'official_handoff';

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
