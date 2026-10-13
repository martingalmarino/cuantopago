import { categoryLabels, fold, lowestPublishedPlan, monthlyPublishedMinor, plansFor, quotePlan, services } from './catalog';
import { isStale } from './freshness';
import { divHalfUp, formatPrice } from './money';
import { guideHref } from '../data/subscription-management/managed';
import type { PlanRecord, ServiceFaq, ServiceRecord } from './types';

export const DESCRIPTION_MAX = 160;
const PRICE_FRESH_DAYS = 30;

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function dateParts(iso: string): [number, number, number] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return [year, month, day];
}

export function longDate(iso: string): string {
  const parts = dateParts(iso);
  return parts ? `${parts[2]} de ${monthNames[parts[1] - 1]} de ${parts[0]}` : iso;
}

export function shortDate(iso: string): string {
  const parts = dateParts(iso);
  return parts ? `${parts[2]} ${monthShort[parts[1] - 1]} ${parts[0]}` : iso;
}

export function latestVerified(serviceId: string): string | null {
  const dates = plansFor(serviceId).map((plan) => plan.verifiedAt).filter((date): date is string => Boolean(date && dateParts(date)));
  return dates.length ? dates.sort().at(-1)! : null;
}

export function titleYear(serviceId: string, asOf: string): string {
  return (latestVerified(serviceId) ?? asOf).slice(0, 4);
}

export function serviceTitle(service: ServiceRecord, asOf: string): string {
  return `¿Cuánto sale ${service.name} en Argentina? - Precios y Planes ${titleYear(service.id, asOf)} | Abonito`;
}

export function periodText(plan: PlanRecord): string {
  if (plan.billingIntervalDays) return `cada ${plan.billingIntervalDays} días`;
  if (plan.billingPeriodMonths === 1) return 'por mes';
  if (plan.billingPeriodMonths === 12) return 'por año';
  return `cada ${plan.billingPeriodMonths} meses`;
}

function periodShort(plan: PlanRecord): string {
  if (plan.billingIntervalDays) return `/${plan.billingIntervalDays} días`;
  if (plan.billingPeriodMonths === 1) return '/mes';
  if (plan.billingPeriodMonths === 12) return '/año';
  return `/${plan.billingPeriodMonths} meses`;
}

export function taxLabel(plan: PlanRecord): string {
  if (plan.amountMinor === null || !plan.currency) return 'Sin precio publicado';
  if (plan.taxInclusion === 'excluded') return 'Sin impuestos';
  if (plan.taxInclusion === 'included') return plan.otherChargesNoted ? 'IVA incluido, puede haber otros cargos' : 'Incluidos';
  return 'La página no lo aclara';
}

export interface PriceSummary {
  plan: PlanRecord | null;
  price: string | null;
  priceShort: string | null;
  monthlyEquivalent: string | null;
  withTaxMonthlyMinor: number | null;
  addedLabels: string[];
  unresolvedLabels: string[];
  pricedPlanCount: number;
  verifiedAt: string | null;
  sourceHost: string | null;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function priceSummary(service: ServiceRecord, asOf: string): PriceSummary {
  const { plan } = lowestPublishedPlan(service.id, asOf);
  const pricedPlanCount = plansFor(service.id).filter((item) => item.amountMinor !== null && item.currency).length;
  if (!plan || plan.amountMinor === null || !plan.currency) {
    return {
      plan: null, price: null, priceShort: null, monthlyEquivalent: null, withTaxMonthlyMinor: null,
      addedLabels: [], unresolvedLabels: [], pricedPlanCount, verifiedAt: latestVerified(service.id), sourceHost: hostOf(service.officialUrl),
    };
  }
  const amount = formatPrice(plan.amountMinor, plan.currency);
  const monthly = monthlyPublishedMinor(plan);
  const isMonthly = plan.billingPeriodMonths === 1 && !plan.billingIntervalDays;
  const quote = quotePlan(plan, { asOf });
  const added = quote.lines.filter((line) => line.kind === 'added' && line.amountMinor !== null);
  const withTax = plan.currency === 'ARS' && plan.taxInclusion === 'excluded' && added.length > 0 && quote.monthly
    ? divHalfUp(quote.monthly.n, quote.monthly.d)
    : null;
  return {
    plan,
    price: `${amount} ${periodText(plan)}`,
    priceShort: `${amount}${periodShort(plan)}`,
    monthlyEquivalent: !isMonthly && monthly !== null ? `${formatPrice(monthly, plan.currency)} por mes` : null,
    withTaxMonthlyMinor: withTax,
    addedLabels: added.map((line) => line.label),
    unresolvedLabels: quote.lines.filter((line) => line.kind === 'unresolved').map((line) => line.label),
    pricedPlanCount,
    verifiedAt: plan.verifiedAt ?? latestVerified(service.id),
    sourceHost: hostOf(plan.sourceUrl) ?? hostOf(service.officialUrl),
  };
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

/** Una oración que responde «cuánto sale», sólo con datos verificados del catálogo. */
export function answerText(service: ServiceRecord, summary: PriceSummary): string {
  const { plan } = summary;
  if (!plan || !summary.price) {
    return `Todavía no hay un precio publicado de ${service.name} para Argentina que podamos confirmar. Podés cargar lo que te cobran y calcular el total con impuestos.`;
  }
  const parts: string[] = [];
  const equivalent = summary.monthlyEquivalent ? `, unos ${summary.monthlyEquivalent}` : '';
  parts.push(`En Argentina, ${service.name} cuesta desde ${summary.price}${equivalent} con el plan ${plan.name}.`);
  if (plan.currency === 'USD') {
    parts.push('Se cobra en dólares: el total en pesos depende del tipo de cambio y de los impuestos.');
  } else if (plan.taxInclusion === 'excluded') {
    parts.push(summary.withTaxMonthlyMinor !== null
      ? `Es un precio sin impuestos: sumando ${joinList(summary.addedLabels)} queda en ${formatPrice(summary.withTaxMonthlyMinor, 'ARS')} por mes.`
      : 'Es un precio sin impuestos.');
  } else if (plan.taxInclusion === 'included') {
    parts.push(plan.otherChargesNoted ? 'La página lo publica con IVA incluido y avisa que puede haber otros cargos.' : 'La página lo publica con impuestos incluidos.');
  } else {
    parts.push('La página oficial no aclara si incluye impuestos.');
  }
  if (summary.unresolvedLabels.length > 0) {
    parts.push(`Hay cargos que no podemos confirmar (${joinList(summary.unresolvedLabels)}), así que el total es parcial.`);
  }
  if (summary.verifiedAt) {
    parts.push(`Precio revisado el ${longDate(summary.verifiedAt)}${summary.sourceHost ? ` en ${summary.sourceHost}` : ''}.`);
  }
  return parts.join(' ');
}

function planNames(serviceId: string): string[] {
  const names = plansFor(serviceId)
    .filter((plan) => plan.amountMinor !== null && plan.currency && plan.selectable !== false)
    .map((plan) => plan.name);
  return [...new Set(names)];
}

export function serviceDescription(service: ServiceRecord, summary: PriceSummary): string {
  const { plan } = summary;
  let lead: string;
  if (!plan || !summary.priceShort) {
    lead = `${service.name} en Argentina: precio a confirmar.`;
  } else if (plan.currency === 'USD') {
    lead = `${service.name} en Argentina: desde ${summary.priceShort}, cobrado en dólares.`;
  } else if (plan.taxInclusion === 'excluded') {
    const approx = summary.withTaxMonthlyMinor !== null
      ? ` (≈ ${formatPrice(Math.round(summary.withTaxMonthlyMinor / 100) * 100, 'ARS')}/mes con ${joinList(summary.addedLabels)})`
      : '';
    lead = `${service.name} en Argentina: desde ${summary.priceShort} sin impuestos${approx}.`;
    if (lead.length > DESCRIPTION_MAX) lead = `${service.name} en Argentina: desde ${summary.priceShort} sin impuestos.`;
  } else if (plan.taxInclusion === 'included') {
    lead = `${service.name} en Argentina: desde ${summary.priceShort} con impuestos incluidos.`;
  } else {
    lead = `${service.name} en Argentina: desde ${summary.priceShort}.`;
  }
  const names = planNames(service.id);
  const extras = [
    names.length >= 2 && names.length <= 4 ? `Planes ${joinList(names)}.` : null,
    summary.verifiedAt ? `Revisado el ${shortDate(summary.verifiedAt)}.` : null,
    'Calculá el total con impuestos.',
  ].filter((part): part is string => Boolean(part));
  let text = lead;
  for (const extra of extras) {
    if (`${text} ${extra}`.length <= DESCRIPTION_MAX) text = `${text} ${extra}`;
  }
  return text.length <= DESCRIPTION_MAX ? text : `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export interface PageFaq extends ServiceFaq {
  link?: { label: string; href: string };
}

/** Preguntas típicas que el catálogo puede responder; se omiten si ya hay una pregunta sobre el mismo tema. */
export function standardFaqs(service: ServiceRecord, summary: PriceSummary): PageFaq[] {
  const asked = service.faqs.map((faq) => fold(faq.question));
  const covered = (pattern: RegExp) => asked.some((question) => pattern.test(question));
  const { plan } = summary;
  const faqs: PageFaq[] = [];

  if (plan && summary.price && !covered(/mas barato|cuanto (cuesta|sale|vale)|precio de/)) {
    const equivalent = summary.monthlyEquivalent ? `, unos ${summary.monthlyEquivalent}` : '';
    const when = summary.verifiedAt ? ` según la página oficial revisada el ${longDate(summary.verifiedAt)}` : '';
    faqs.push(summary.pricedPlanCount > 1
      ? { question: `¿Cuál es el plan más barato de ${service.name} en Argentina?`, answer: `${plan.name}, a ${summary.price}${equivalent}${when}.` }
      : { question: `¿Cuánto cuesta ${service.name} en Argentina?`, answer: `${summary.price}${equivalent} con el plan ${plan.name}${when}.` });
  }

  if (plan && plan.currency === 'ARS' && !covered(/impuesto|iva/)) {
    const answer = plan.taxInclusion === 'excluded'
      ? `No. La página publica el precio sin impuestos.${summary.withTaxMonthlyMinor !== null ? ` Sumando ${joinList(summary.addedLabels)}, el plan ${plan.name} queda en ${formatPrice(summary.withTaxMonthlyMinor, 'ARS')} por mes.` : ''}`
      : plan.taxInclusion === 'included'
        ? `Sí. La página publica el precio con impuestos incluidos.${plan.otherChargesNoted ? ' Avisa que puede haber otros cargos.' : ''}`
        : 'La página oficial no lo aclara. En la calculadora de esta página podés ver el total estimado y qué cargos quedan sin confirmar.';
    faqs.push({ question: `¿El precio de ${service.name} incluye impuestos?`, answer });
  }

  if (plan && plan.currency === 'USD' && !covered(/dolar|usd/)) {
    faqs.push({
      question: `¿${service.name} se cobra en dólares?`,
      answer: `Sí. El precio publicado para Argentina está en dólares, desde ${summary.price}. El total en pesos depende del tipo de cambio y de los impuestos.`,
      link: { label: 'Ver cotizaciones del dólar', href: '/cotizaciones/' },
    });
  }

  const cancel = guideHref(service.id, 'cancelar');
  if (cancel && !covered(/cancel|dar de baja|darme de baja/)) {
    faqs.push({
      question: `¿Cómo cancelo ${service.name}?`,
      answer: `Depende de quién te cobra: ${service.name} directamente, una tienda de apps u otra empresa. La guía te muestra los pasos para tu caso y te lleva al sitio oficial.`,
      link: { label: `Cómo cancelar ${service.name}`, href: cancel },
    });
  }
  return faqs;
}

export function relatedServices(service: ServiceRecord, limit = 6): ServiceRecord[] {
  const same = services.filter((item) => item.category === service.category && item.id !== service.id);
  const near = services.filter((item) => item.id !== service.id && item.category !== service.category && (
    (item.secondaryCategories ?? []).includes(service.category) || (service.secondaryCategories ?? []).includes(item.category)
  ));
  return [...same, ...near].slice(0, limit);
}

export function relatedHeading(service: ServiceRecord): string {
  return `Otras de ${categoryLabels[service.category]}`;
}

function decimalPrice(minor: number): string {
  return (minor / 100).toFixed(2);
}

function billingDuration(plan: PlanRecord): string {
  return plan.billingIntervalDays ? `P${plan.billingIntervalDays}D` : `P${plan.billingPeriodMonths}M`;
}

/** Planes que pueden ir como oferta: con importe positivo, fecha verificada y no vencida. Nunca precios nulos ni promociones. */
export function offerPlans(serviceId: string, asOf: string): PlanRecord[] {
  return plansFor(serviceId).filter((plan) =>
    plan.amountMinor !== null && plan.amountMinor > 0 && plan.currency && plan.verifiedAt
    && plan.availableInArgentina !== false && !isStale(plan.verifiedAt, PRICE_FRESH_DAYS, 'days', asOf));
}

export function serviceJsonLd(options: {
  service: ServiceRecord;
  pageUrl: string;
  title: string;
  description: string;
  logoUrl: string | null;
  faqs: ServiceFaq[];
  asOf: string;
}): Record<string, unknown> {
  const { service, pageUrl, title, description, logoUrl, faqs, asOf } = options;
  const productId = `${pageUrl}#producto`;
  const modified = latestVerified(service.id);
  const offers = offerPlans(service.id, asOf).map((plan) => {
    const vat = plan.taxInclusion === 'excluded' ? false : plan.taxInclusion === 'included' ? true : undefined;
    return {
      '@type': 'Offer',
      name: plan.name,
      sku: plan.id,
      price: decimalPrice(plan.amountMinor!),
      priceCurrency: plan.currency,
      url: pageUrl,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: decimalPrice(plan.amountMinor!),
        priceCurrency: plan.currency,
        billingDuration: billingDuration(plan),
        ...(vat === undefined ? {} : { valueAddedTaxIncluded: vat }),
      },
      ...(plan.sourceUrl ? { seller: { '@type': 'Organization', name: service.name, url: plan.sourceUrl } } : {}),
    };
  });
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: title,
      description,
      inLanguage: 'es-AR',
      isPartOf: { '@type': 'WebSite', '@id': new URL('/#sitio', pageUrl).href, name: 'Abonito', url: new URL('/', pageUrl).href },
      ...(offers.length ? { about: { '@id': productId } } : {}),
      ...(modified ? { dateModified: modified } : {}),
    },
  ];
  // Google rechaza un Product sin ofertas, reseñas ni calificación.
  if (offers.length) {
    graph.push({
      '@type': 'Product',
      '@id': productId,
      name: service.name,
      description: service.description,
      brand: { '@type': 'Brand', name: service.name },
      category: categoryLabels[service.category],
      url: pageUrl,
      ...(logoUrl ? { image: logoUrl } : {}),
      offers,
    });
  }
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
