import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { brandAssets, plans, services, taxRules } from './catalog';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const featureSchema = z.object({
  ads: z.boolean().nullable(),
  maxResolution: z.string().nullable(),
  simultaneousPlayback: z.number().int().positive().nullable(),
  downloads: z.string().nullable(),
  storage: z.string().nullable(),
  memberLimit: z.number().int().positive().nullable(),
  eligibility: z.string().nullable(),
});

const serviceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: z.enum(['series', 'musica', 'almacenamiento', 'paquetes', 'deportes', 'tv-en-vivo', 'productividad', 'diseno', 'inteligencia-artificial']),
  officialUrl: z.url(),
  logo: z.string().nullable(),
  logoAltMode: z.enum(['decorative', 'text-fallback']),
  description: z.string().min(20),
  aliases: z.array(z.string()),
  overlapNote: z.string().nullable(),
  sourceUrls: z.array(z.url()).min(1),
  verificationStatus: z.enum(['verified', 'partial', 'unverified']),
  faqs: z.array(z.object({ question: z.string().min(8), answer: z.string().min(20) })).min(3),
  tags: z.array(z.string()).optional(),
  secondaryCategories: z.array(z.enum(['series', 'musica', 'almacenamiento', 'paquetes', 'deportes', 'tv-en-vivo', 'productividad', 'diseno', 'inteligencia-artificial'])).optional(),
  body: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

const planSchema = z.object({
  id: z.string().min(1),
  serviceId: z.string().min(1),
  availableInArgentina: z.boolean().nullable(),
  name: z.string().min(1),
  billingPeriodMonths: z.number().int().positive(),
  currency: z.enum(['ARS', 'USD']).nullable(),
  amountMinor: z.number().int().nonnegative().nullable(),
  taxInclusion: z.enum(['included', 'excluded', 'unknown']),
  otherChargesNoted: z.boolean(),
  taxRuleIds: z.array(z.string()),
  channel: z.enum(['web-direct', 'app-store', 'google-play', 'operator', 'bundle']),
  features: featureSchema,
  sourceUrl: z.url().nullable(),
  verifiedAt: z.string().regex(datePattern).nullable(),
  effectiveFrom: z.string().regex(datePattern).nullable(),
  effectiveTo: z.string().regex(datePattern).nullable(),
  retired: z.boolean(),
  notes: z.string().nullable(),
  billingIntervalDays: z.number().int().positive().nullable().optional(),
  selectable: z.boolean().optional(),
  promotion: z.object({
    amountMinor: z.number().int().positive(),
    currency: z.enum(['ARS', 'USD']),
    durationCycles: z.number().int().positive(),
    note: z.string().min(10),
  }).nullable().optional(),
  entitlements: z.array(z.object({
    serviceId: z.string().nullable(),
    label: z.string().min(1),
    capacityGb: z.number().int().positive().nullable(),
  })).optional(),
  choiceSlots: z.number().int().nonnegative().optional(),
  choiceOptions: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    serviceId: z.string().nullable(),
  })).optional(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  effectiveFrom: z.string().regex(datePattern),
  effectiveTo: z.string().regex(datePattern).nullable(),
  jurisdiction: z.string().min(2),
  chargeType: z.string().min(1),
  label: z.string().min(1),
  rateBasisPoints: z.number().int().nonnegative().nullable(),
  fixedAmountMinor: z.number().int().nonnegative().nullable(),
  inclusion: z.enum(['add-when-excluded', 'add-when-flags-match']),
  appliesToTaxInclusion: z.array(z.enum(['included', 'excluded', 'unknown'])).min(1),
  requiresFlags: z.array(z.string()),
  unresolvedIfFlagsUnknown: z.boolean(),
  exclusiveGroup: z.string().nullable(),
  priority: z.number().int(),
  sourceUrl: z.url(),
  verifiedAt: z.string().regex(datePattern),
  freshnessDays: z.number().int().positive(),
  note: z.string().min(20),
});

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export function validateCatalog(root = process.cwd()): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const serviceIds = new Set<string>();
  const slugs = new Set<string>();
  const planIds = new Set<string>();
  const ruleIds = new Set(taxRules.map((rule) => rule.id));

  const servicesParsed = z.array(serviceSchema).safeParse(services);
  if (!servicesParsed.success) errors.push(servicesParsed.error.message);
  const plansParsed = z.array(planSchema).safeParse(plans);
  if (!plansParsed.success) errors.push(plansParsed.error.message);
  const rulesParsed = z.array(ruleSchema).safeParse(taxRules);
  if (!rulesParsed.success) errors.push(rulesParsed.error.message);

  for (const service of services) {
    if (serviceIds.has(service.id)) errors.push(`Servicio duplicado: ${service.id}`);
    serviceIds.add(service.id);
    if (slugs.has(service.slug)) errors.push(`Slug duplicado: ${service.slug}`);
    slugs.add(service.slug);
    if (service.logo && !existsSync(resolve(root, 'public', service.logo.replace(/^\//, '')))) {
      errors.push(`Falta el archivo de logo de ${service.id}: ${service.logo}`);
    }
    if (service.verificationStatus === 'unverified' && plans.some((plan) => plan.serviceId === service.id && plan.amountMinor !== null)) {
      errors.push(`${service.id} está como no verificado pero tiene un precio.`);
    }
    const asset = brandAssets.find((item) => item.serviceId === service.id);
    if (!asset) errors.push(`Falta la ficha de marca de ${service.id}`);
    else if (asset.file !== service.logo) errors.push(`La marca de ${service.id} no coincide con el logo del servicio.`);
  }

  for (const plan of plans) {
    if (planIds.has(plan.id)) errors.push(`Plan duplicado: ${plan.id}`);
    planIds.add(plan.id);
    if (!serviceIds.has(plan.serviceId)) errors.push(`El plan ${plan.id} apunta a un servicio inexistente.`);
    if ((plan.choiceSlots ?? 0) > 0 && (plan.choiceOptions ?? []).length < (plan.choiceSlots ?? 0)) {
      errors.push(`El plan ${plan.id} pide más elecciones de las que ofrece.`);
    }
    if (plan.promotion && plan.promotion.amountMinor === plan.amountMinor) {
      warnings.push(`${plan.id} tiene la misma promo que el precio de lista.`);
    }
    if (plan.amountMinor !== null && (!plan.sourceUrl || !plan.verifiedAt || !plan.currency)) {
      errors.push(`El plan ${plan.id} tiene importe sin fuente, fecha o moneda.`);
    }
    if (plan.amountMinor === null && plan.currency !== null) {
      warnings.push(`${plan.id} tiene moneda pero no importe.`);
    }
    for (const ruleId of plan.taxRuleIds) {
      if (!ruleIds.has(ruleId)) errors.push(`El plan ${plan.id} cita la regla inexistente ${ruleId}.`);
    }
    if (plan.effectiveFrom && plan.effectiveTo && plan.effectiveFrom > plan.effectiveTo) {
      errors.push(`Vigencia invertida en ${plan.id}.`);
    }
    if (plan.channel !== 'web-direct') warnings.push(`${plan.id} usa un canal que la interfaz no ofrece.`);
  }

  for (const rule of taxRules) {
    if (rule.effectiveTo && rule.effectiveFrom > rule.effectiveTo) errors.push(`Vigencia invertida en ${rule.id}.`);
    if (rule.rateBasisPoints === null && rule.fixedAmountMinor === null) {
      warnings.push(`${rule.id} no tiene tasa ni monto fijo.`);
    }
  }

  const priced = plans.filter((plan) => plan.amountMinor !== null).length;
  const pendingServices = services.filter((service) => !plans.some((plan) => plan.serviceId === service.id && plan.amountMinor !== null));
  for (const service of pendingServices) {
    warnings.push(`${service.name}: precio pendiente de verificación.`);
  }
  warnings.push(`Planes con importe: ${priced}. Servicios sin importe: ${pendingServices.length}.`);

  return { errors, warnings };
}
