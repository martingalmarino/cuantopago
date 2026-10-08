import servicesJson from '../data/services.json';
import plansJson from '../data/plans.json';
import rulesJson from '../data/tax-rules.json';
import ratesJson from '../data/exchange-rates.json';
import brandsJson from '../data/brand-assets.json';
import metaJson from '../data/meta.json';
import { calculate } from './calculation';
import { isStale } from './freshness';
import { divHalfUp } from './money';
import { fold } from './search';

export { fold };
import type {
  BrandAsset,
  CalculationInput,
  CalculationResult,
  CategoryId,
  PlanRecord,
  ServiceRecord,
  TaxRule,
} from './types';

export const catalogMeta = metaJson;
export const services = servicesJson as ServiceRecord[];
export const plans = plansJson as PlanRecord[];
export const taxRules = rulesJson as TaxRule[];
export const exchangeBasis = ratesJson.basis;
export const brandAssets = brandsJson as BrandAsset[];

export const categoryLabels: Record<CategoryId, string> = {
  series: 'Series y películas',
  musica: 'Música y video',
  almacenamiento: 'Almacenamiento',
  paquetes: 'Paquetes y beneficios',
  deportes: 'Deportes',
  'tv-en-vivo': 'TV en vivo',
  productividad: 'Productividad',
  diseno: 'Diseño',
  'inteligencia-artificial': 'Inteligencia artificial',
};

export function todayIso(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: catalogMeta.timeZone }).format(date);
}

const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function reviewedLabel(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return `Revisado el ${day} ${monthShort[month - 1]} ${year}`;
}

export function serviceBySlug(slug: string): ServiceRecord | undefined {
  return services.find((service) => service.slug === slug);
}

export function serviceById(id: string): ServiceRecord | undefined {
  return services.find((service) => service.id === id);
}

export function plansFor(serviceId: string): PlanRecord[] {
  return plans.filter((plan) => plan.serviceId === serviceId && !plan.retired);
}

export function purchasablePlans(serviceId: string): PlanRecord[] {
  return plansFor(serviceId).filter((plan) => plan.selectable !== false && plan.amountMinor !== null && plan.currency !== null);
}

export function planById(id: string): PlanRecord | undefined {
  return plans.find((plan) => plan.id === id);
}

export function searchText(service: ServiceRecord): string {
  return fold([
    service.name,
    service.slug,
    ...service.aliases,
    ...(service.tags ?? []),
    categoryLabels[service.category],
    ...(service.secondaryCategories ?? []).map((category) => categoryLabels[category]),
  ].join(' '));
}

function monthlyRank(plan: PlanRecord): number {
  if (plan.amountMinor === null) return Number.POSITIVE_INFINITY;
  if (plan.billingIntervalDays && plan.billingIntervalDays > 0) {
    return (plan.amountMinor * 365) / (plan.billingIntervalDays * 12);
  }
  if (plan.billingPeriodMonths < 1) return Number.POSITIVE_INFINITY;
  return plan.amountMinor / plan.billingPeriodMonths;
}

export function lowestPublishedPlan(serviceId: string, asOf: string): { plan: PlanRecord | null; stale: boolean } {
  const priced = plansFor(serviceId).filter((plan) => plan.amountMinor !== null && plan.currency && plan.availableInArgentina !== false);
  const ars = priced.filter((plan) => plan.currency === 'ARS');
  const pool = ars.length > 0 ? ars : priced;
  const fresh = pool.filter((plan) => !isStale(plan.verifiedAt, 30, 'days', asOf));
  const current = fresh.length > 0 ? fresh : pool;
  const unrestricted = current.filter((plan) => !plan.features.eligibility);
  const chosenFrom = unrestricted.length > 0 ? unrestricted : current;
  const plan = [...chosenFrom].sort((a, b) => monthlyRank(a) - monthlyRank(b))[0] ?? null;
  return { plan, stale: plan ? isStale(plan.verifiedAt, 30, 'days', asOf) : false };
}

export function publishedContext(plan: PlanRecord): string {
  const period = plan.billingIntervalDays
    ? `cada ${plan.billingIntervalDays} días`
    : plan.billingPeriodMonths === 1
      ? 'por mes'
      : `cada ${plan.billingPeriodMonths} meses`;
  if (plan.taxInclusion === 'excluded') return `Precio publicado ${period}, sin impuestos incluidos.`;
  if (plan.taxInclusion === 'included') {
    return plan.otherChargesNoted
      ? `Precio publicado ${period}. El IVA figura incluido; pueden existir otros cargos.`
      : `Precio publicado ${period}. Monto publicado con impuestos incluidos.`;
  }
  if (plan.currency === 'USD') return `Precio publicado ${period}, en dólares.`;
  return `Precio publicado ${period}.`;
}

export function inputFromPlan(
  plan: PlanRecord,
  options: {
    asOf: string;
    fxArsPerUsdMinor?: number | null;
    fxSource?: 'user' | 'snapshot' | null;
    userReportedFinalMinor?: number | null;
    userReportedMonths?: number | null;
    flags?: CalculationInput['flags'];
  },
): CalculationInput {
  return {
    label: plan.name,
    amountMinor: plan.amountMinor,
    currency: plan.currency,
    billingPeriodMonths: plan.billingPeriodMonths,
    billingIntervalDays: plan.billingIntervalDays ?? null,
    taxInclusion: plan.taxInclusion,
    otherChargesNoted: plan.otherChargesNoted,
    ruleIds: plan.taxRuleIds,
    priceVerifiedAt: plan.verifiedAt,
    priceSourceUrl: plan.sourceUrl,
    rules: taxRules,
    asOf: options.asOf,
    fxArsPerUsdMinor: options.fxArsPerUsdMinor ?? null,
    fxSource: options.fxSource ?? null,
    fxVerifiedAt: options.fxSource === 'user' ? options.asOf : null,
    flags: options.flags ?? {},
    userReportedFinalMinor: options.userReportedFinalMinor ?? null,
    userReportedMonths: options.userReportedMonths ?? null,
  };
}

export function quotePlan(
  plan: PlanRecord,
  options: Parameters<typeof inputFromPlan>[1] & { usePromotion?: boolean },
): CalculationResult {
  const input = inputFromPlan(plan, options);
  if (options.usePromotion && plan.promotion) {
    input.amountMinor = plan.promotion.amountMinor;
    input.currency = plan.promotion.currency;
    input.manual = true;
  }
  const result = calculate(input);
  if (options.usePromotion && plan.promotion) {
    result.assumptions = [
      'Estás usando el precio promocional publicado, no el de lista. No está confirmado que ese precio quede congelado.',
      plan.promotion.note,
      ...result.assumptions,
    ];
    result.simulated = true;
    if (result.status === 'complete') result.status = 'partial';
  }
  return result;
}

export function monthlyPublishedMinor(plan: PlanRecord): number | null {
  if (plan.amountMinor === null) return null;
  if (plan.billingIntervalDays && plan.billingIntervalDays > 0) {
    return divHalfUp(plan.amountMinor * 365, plan.billingIntervalDays * 12);
  }
  return divHalfUp(plan.amountMinor, plan.billingPeriodMonths);
}
