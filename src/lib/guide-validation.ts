import { z } from 'zod';
import { billingGuides } from '../data/subscription-management/billing-guides';
import { managedPlatforms } from '../data/subscription-management/managed';
import { platformGuides } from '../data/subscription-management/platform-guides';
import { guideSources } from '../data/subscription-management/sources';
import type { BillingGuide, GuideSource, PlatformGuide } from '../data/subscription-management/types';
import { CHANNELS, INTENTS, isOfficialUrl, resolveRouteId, type GuideConfig } from './guides';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}, 'Fecha inválida');
const officialUrl = z.string().refine(isOfficialUrl, 'URL no oficial o sin HTTPS');
const text = z.string().trim().min(1);
const channel = z.enum(['directo', 'apple', 'google-play', 'externo']);
const cta = z.object({ label: text, url: officialUrl });
const link = z.object({ label: text, href: z.string().regex(/^\/[a-z0-9\-/]*\/$/, 'Enlace interno inválido') });

const sourceSchema = z.object({
  id: text,
  title: text,
  publisher: text,
  url: officialUrl,
  locale: text,
  applicability: text,
  lastReviewedAt: isoDate,
  lastLinkCheckedAt: isoDate,
});

const routeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  intent: z.enum(['cancelar', 'ahorrar']),
  channels: z.array(channel),
  role: z.enum(['titular', 'miembro']).nullable(),
  status: z.enum(['verified', 'conditional', 'official_handoff']),
  heading: text.max(90),
  eligibility: text.optional(),
  before: z.array(text),
  steps: z.array(text).min(1),
  cta: cta.nullable(),
  ctaNote: text.optional(),
  after: z.array(text).min(1),
  troubleshooting: z.array(text).min(1),
  related: z.array(link).optional(),
  sourceIds: z.array(text).min(1),
}).refine((route) => route.cta !== null || Boolean(route.ctaNote), 'Una ruta sin botón necesita una nota');

const platformSchema = z.object({
  platformId: text,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  providerName: text,
  aliases: z.array(text).min(1),
  existingLogoRef: z.string().nullable(),
  catalogHref: z.string().regex(/^\/[a-z0-9-]+\/$/),
  h1: text,
  intro: text,
  seo: z.object({ title: text.max(60), description: text.max(160) }),
  channels: z.array(channel).min(1),
  channelHints: z.record(z.string(), text),
  roleQuestion: z.object({
    legend: text,
    options: z.array(z.object({ id: z.enum(['titular', 'miembro']), label: text, hint: text })).length(2),
  }).nullable(),
  billerCheck: z.object({ text, label: text, url: officialUrl, sourceId: text }),
  routes: z.array(routeSchema).min(1),
  faqs: z.array(z.object({ question: text, answer: text })).min(1),
  updatedAt: isoDate,
});

const billingGuideSchema = z.object({
  id: z.enum(['apple', 'google-play']),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  h1: text,
  intro: text,
  seo: z.object({ title: text.max(60), description: text.max(160) }),
  cta,
  before: z.array(text),
  sections: z.array(z.object({ heading: text, steps: z.array(text).min(1), note: text.optional() })).min(1),
  after: z.array(text).min(1),
  troubleshooting: z.array(text).min(1),
  sourceIds: z.array(text).min(1),
  updatedAt: isoDate,
});

export function guideConfig(guide: PlatformGuide): GuideConfig {
  return {
    channels: guide.channels,
    hasRole: guide.roleQuestion !== null,
    routes: guide.routes.map(({ id, intent, channels, role }) => ({ id, intent, channels, role })),
  };
}

export interface GuideCatalog {
  sources: GuideSource[];
  platforms: PlatformGuide[];
  billing: BillingGuide[];
  managed: { serviceId: string; slug: string }[];
}

export function validateGuides(
  services: { id: string; slug: string; logo: string | null }[],
  today: string,
  catalog: GuideCatalog = { sources: guideSources, platforms: platformGuides, billing: billingGuides, managed: managedPlatforms },
): string[] {
  const errors: string[] = [];
  const internalRoutes = new Set<string>([
    '/simular-ahorro/',
    '/mis-suscripciones/',
    '/gestionar-suscripciones/',
    ...services.map((service) => `/${service.slug}/`),
    ...catalog.platforms.map((guide) => `/${guide.slug}/cancelar/`),
    ...catalog.billing.map((guide) => `/guias/${guide.slug}/`),
  ]);

  const sourceIds = new Set<string>();
  for (const source of catalog.sources) {
    const parsed = sourceSchema.safeParse(source);
    if (!parsed.success) errors.push(`Fuente ${source.id}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
    if (sourceIds.has(source.id)) errors.push(`Fuente duplicada: ${source.id}`);
    sourceIds.add(source.id);
    if (source.lastReviewedAt > today) errors.push(`La fuente ${source.id} tiene una revisión con fecha futura.`);
    if (source.lastLinkCheckedAt > today) errors.push(`La fuente ${source.id} tiene un chequeo de enlace con fecha futura.`);
  }

  const routeIds = new Set<string>();
  const slugs = new Set<string>();
  for (const guide of catalog.platforms) {
    const parsed = platformSchema.safeParse(guide);
    if (!parsed.success) errors.push(`Guía ${guide.slug}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
    if (slugs.has(guide.slug)) errors.push(`Guía duplicada: ${guide.slug}`);
    slugs.add(guide.slug);
    const service = services.find((item) => item.id === guide.platformId);
    if (!service) errors.push(`La guía ${guide.slug} apunta a un servicio inexistente: ${guide.platformId}`);
    else {
      if (service.slug !== guide.slug) errors.push(`El slug de la guía ${guide.slug} no coincide con el servicio.`);
      if (service.logo !== guide.existingLogoRef) errors.push(`El logo de la guía ${guide.slug} no coincide con el catálogo.`);
      if (`/${service.slug}/` !== guide.catalogHref) errors.push(`La ficha de la guía ${guide.slug} no coincide con el catálogo.`);
    }
    if (guide.updatedAt > today) errors.push(`La guía ${guide.slug} tiene fecha futura.`);
    if (!sourceIds.has(guide.billerCheck.sourceId)) errors.push(`La guía ${guide.slug} cita la fuente inexistente ${guide.billerCheck.sourceId}.`);
    for (const key of Object.keys(guide.channelHints)) {
      if (!guide.channels.includes(key as never)) errors.push(`La guía ${guide.slug} describe un canal que no ofrece: ${key}`);
    }

    for (const route of guide.routes) {
      if (routeIds.has(route.id)) errors.push(`Ruta duplicada: ${route.id}`);
      routeIds.add(route.id);
      for (const id of route.sourceIds) if (!sourceIds.has(id)) errors.push(`La ruta ${route.id} cita la fuente inexistente ${id}.`);
      for (const item of route.channels) if (!guide.channels.includes(item)) errors.push(`La ruta ${route.id} usa el canal ${item}, que la guía no ofrece.`);
      for (const item of route.related ?? []) if (!internalRoutes.has(item.href)) errors.push(`La ruta ${route.id} enlaza a una página inexistente: ${item.href}`);
      if (route.role === 'miembro' && route.channels.length) errors.push(`La ruta de miembro ${route.id} no debería depender del canal.`);
      if (route.role !== 'miembro' && route.channels.length === 0) errors.push(`La ruta ${route.id} no tiene canal.`);
      if (route.role !== null && !guide.roleQuestion) errors.push(`La ruta ${route.id} pide un rol que la guía no pregunta.`);
    }

    const config = guideConfig(guide);
    const roles = guide.roleQuestion ? (['titular', 'miembro'] as const) : [null];
    for (const intent of INTENTS) {
      for (const role of roles) {
        const channels = role === 'miembro' ? [null] : guide.channels;
        for (const item of channels) {
          const id = resolveRouteId({ intent, channel: item, unknown: false, role }, config);
          if (!id) errors.push(`La guía ${guide.slug} no cubre ${intent} / ${item ?? 'sin canal'} / ${role ?? 'sin rol'}.`);
        }
      }
    }
    for (const item of guide.channels) if (!CHANNELS.includes(item)) errors.push(`Canal desconocido en ${guide.slug}: ${item}`);
  }

  for (const guide of catalog.billing) {
    const parsed = billingGuideSchema.safeParse(guide);
    if (!parsed.success) errors.push(`Guía ${guide.slug}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
    for (const id of guide.sourceIds) if (!sourceIds.has(id)) errors.push(`La guía ${guide.slug} cita la fuente inexistente ${id}.`);
    if (guide.updatedAt > today) errors.push(`La guía ${guide.slug} tiene fecha futura.`);
  }

  const managedKeys = catalog.managed.map((item) => `${item.serviceId}:${item.slug}`).sort().join(',');
  const guideKeys = catalog.platforms.map((item) => `${item.platformId}:${item.slug}`).sort().join(',');
  if (managedKeys !== guideKeys) errors.push('El índice managedPlatforms no coincide con las guías publicadas.');

  return errors;
}
