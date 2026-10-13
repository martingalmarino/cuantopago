import { calculate } from '../calculation';
import { divHalfUp, formatMinor, formatPrice } from '../money';
import { formatQuote, formatUpdated, quoteShortName, type DollarQuote } from '../quotes';
import type { CalculationInput, CalculationResult, CategoryId } from '../types';
import type { AmountQuery, Feature } from './nlu';
import type { Answer, AnswerLink, AnswerSource, Intent, KbPlan, KbService, KnowledgeBase } from './types';

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function longDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} de ${monthNames[month - 1]} de ${year}`;
}

export function todayAr(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba' }).format(date);
}

function joinList(items: string[], last = 'y'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`;
}

function periodText(plan: Pick<KbPlan, 'months' | 'days'>): string {
  if (plan.days) return `cada ${plan.days} días`;
  if (plan.months === 1) return 'por mes';
  if (plan.months === 12) return 'por año';
  return `cada ${plan.months} meses`;
}

export function planPrice(plan: KbPlan): string {
  if (plan.amountMinor === null || !plan.currency) return 'A confirmar';
  return `${formatPrice(plan.amountMinor, plan.currency)} ${periodText(plan)}`;
}

function monthlyOf(plan: KbPlan): number | null {
  if (plan.amountMinor === null || !plan.currency) return null;
  if (plan.days && plan.days > 0) return divHalfUp(plan.amountMinor * 365, plan.days * 12);
  if (plan.months < 1) return null;
  return divHalfUp(plan.amountMinor, plan.months);
}

function taxText(plan: KbPlan): string {
  if (plan.amountMinor === null || !plan.currency) return 'Sin precio publicado';
  if (plan.currency === 'USD') return 'En dólares';
  if (plan.tax === 'excluded') return 'Sin impuestos';
  if (plan.tax === 'included') return plan.otherCharges ? 'IVA incluido, puede haber otros cargos' : 'Incluidos';
  return 'La página no lo aclara';
}

function rankText(service: KbService): string {
  if (!service.rank) return 'A confirmar';
  const amount = formatPrice(service.rank.minor, service.rank.currency);
  if (service.rank.currency === 'USD') return `${amount} por mes, en dólares`;
  return service.rank.withTax ? `${amount} por mes con impuestos` : `${amount} por mes sin impuestos`;
}

function visiblePlans(service: KbService): KbPlan[] {
  return service.plans.filter((plan) => plan.available !== false);
}

function fichaLink(service: KbService): AnswerLink {
  return { label: `Ver ${service.name} en Abonito`, href: `/${service.slug}/` };
}

function planSources(service: KbService, plans: KbPlan[]): AnswerSource[] {
  const seen = new Set<string>();
  const sources: AnswerSource[] = [];
  for (const plan of plans) {
    if (!plan.sourceUrl || seen.has(plan.sourceUrl)) continue;
    seen.add(plan.sourceUrl);
    sources.push({ label: `Precios de ${service.name}`, href: plan.sourceUrl, reviewedAt: plan.verifiedAt });
  }
  return sources.slice(0, 2);
}

function promoNote(service: KbService, plans: KbPlan[]): string | null {
  const promos = plans.filter((plan) => plan.promo);
  if (promos.length === 0) return null;
  const list = promos.map((plan) => `${plan.name}: ${formatPrice(plan.promo!.amountMinor, plan.promo!.currency)} durante ${plan.promo!.cycles} ${plan.promo!.cycles === 1 ? 'cobro' : 'cobros'}`);
  return `${service.name} publica una promoción (${joinList(list)}). No la sumamos a ningún total: los precios de arriba son los de lista.`;
}

function base(intent: Intent, serviceIds: string[] = []): Answer {
  return { intent, answered: true, paragraphs: [], links: [], sources: [], suggestions: [], serviceIds };
}

function serviceSuggestions(service: KbService, skip: Intent): string[] {
  const options: [Intent, string][] = [
    ['planes', `Planes de ${service.name}`],
    ['impuestos', `¿${service.name} incluye impuestos?`],
    ['cancelar', `¿Cómo cancelo ${service.name}?`],
    ['pagar_menos', `¿Cómo pago menos en ${service.name}?`],
  ];
  return options.filter(([intent]) => intent !== skip).map(([, text]) => text).slice(0, 3);
}

export function priceAnswer(service: KbService): Answer {
  const answer = base('precio', [service.id]);
  answer.paragraphs.push(service.answer);
  const promo = promoNote(service, visiblePlans(service));
  if (promo) answer.paragraphs.push(promo);
  const cheapest = service.plans.find((plan) => plan.id === service.cheapestPlanId);
  answer.answered = Boolean(cheapest && cheapest.amountMinor !== null);
  answer.links.push(fichaLink(service));
  answer.sources = planSources(service, cheapest ? [cheapest] : []);
  answer.suggestions = serviceSuggestions(service, 'precio');
  return answer;
}

export function plansAnswer(service: KbService, months: number | null, only: string[] = []): Answer {
  const answer = base('planes', [service.id]);
  const all = visiblePlans(service);
  const picked = all.filter((plan) => only.includes(plan.id));
  const plans = picked.length ? picked : all;
  if (plans.length === 0) {
    answer.answered = false;
    answer.paragraphs.push(`No tenemos planes publicados de ${service.name} para Argentina.`);
    answer.links.push(fichaLink(service));
    return answer;
  }
  const filtered = months ? plans.filter((plan) => !plan.days && plan.months === months) : plans;
  const shown = filtered.length > 0 ? filtered : plans;
  if (picked.length) {
    answer.paragraphs.push(`Esto figura en Abonito para ${service.name} ${joinList(picked.map((plan) => plan.name))}:`);
  } else if (months && filtered.length === 0) {
    answer.paragraphs.push(`No hay un plan ${months === 12 ? 'anual' : 'mensual'} publicado de ${service.name}. Estos son los que figuran:`);
  } else {
    const priced = shown.filter((plan) => plan.amountMinor !== null).length;
    answer.paragraphs.push(`${service.name} tiene ${shown.length} ${shown.length === 1 ? 'plan' : 'planes'}${months ? (months === 12 ? ' anuales' : ' mensuales') : ''} en Abonito${priced < shown.length ? `, ${shown.length - priced} sin precio confirmado` : ''}.`);
  }
  answer.table = {
    caption: `Planes de ${service.name}`,
    head: ['Plan', 'Precio publicado', 'Impuestos'],
    rows: shown.map((plan) => [plan.name, planPrice(plan), taxText(plan)]),
  };
  const restricted = shown.filter((plan) => plan.eligibility);
  if (restricted.length) answer.paragraphs.push(`Con requisitos: ${restricted.map((plan) => `${plan.name} (${plan.eligibility})`).join('; ')}.`);
  const promo = promoNote(service, shown);
  if (promo) answer.paragraphs.push(promo);
  const reviewed = shown.map((plan) => plan.verifiedAt).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
  if (reviewed) answer.paragraphs.push(`Precios revisados el ${longDate(reviewed)}.`);
  answer.links.push(fichaLink(service));
  answer.sources = planSources(service, shown);
  answer.suggestions = serviceSuggestions(service, 'planes');
  return answer;
}

export function cheapestPlanAnswer(service: KbService): Answer {
  const answer = base('plan_mas_barato', [service.id]);
  const cheapest = service.plans.find((plan) => plan.id === service.cheapestPlanId);
  if (!cheapest || cheapest.amountMinor === null || !cheapest.currency) {
    answer.answered = false;
    answer.paragraphs.push(`Todavía no hay un precio publicado de ${service.name} para Argentina que podamos confirmar.`);
    answer.links.push(fichaLink(service));
    return answer;
  }
  const monthly = monthlyOf(cheapest);
  const equivalent = monthly !== null && (cheapest.months !== 1 || cheapest.days) ? `, unos ${formatPrice(monthly, cheapest.currency)} por mes` : '';
  answer.paragraphs.push(`El plan más barato publicado de ${service.name} es ${cheapest.name}: ${planPrice(cheapest)}${equivalent}. ${taxText(cheapest)}.`);
  const cheaperWithRequirements = visiblePlans(service).filter((plan) => plan.eligibility && plan.currency === cheapest.currency
    && monthlyOf(plan) !== null && monthly !== null && monthlyOf(plan)! < monthly);
  for (const plan of cheaperWithRequirements) {
    answer.paragraphs.push(`Si cumplís los requisitos, ${plan.name} sale ${planPrice(plan)} (${plan.eligibility}).`);
  }
  if (cheapest.verifiedAt) answer.paragraphs.push(`Precio revisado el ${longDate(cheapest.verifiedAt)}.`);
  answer.links.push(fichaLink(service));
  answer.sources = planSources(service, [cheapest]);
  answer.suggestions = serviceSuggestions(service, 'planes');
  return answer;
}

export function compareAnswer(services: KbService[]): Answer {
  const list = services.slice(0, 4);
  const answer = base('comparar', list.map((service) => service.id));
  const cheapestOf = (service: KbService) => service.plans.find((plan) => plan.id === service.cheapestPlanId) ?? null;
  answer.table = {
    caption: `Comparación: ${joinList(list.map((service) => service.name))}`,
    head: ['', ...list.map((service) => service.name)],
    rows: [
      ['Plan más barato', ...list.map((service) => cheapestOf(service)?.name ?? 'Sin precio')],
      ['Precio publicado', ...list.map((service) => { const plan = cheapestOf(service); return plan ? planPrice(plan) : 'A confirmar'; })],
      ['Por mes', ...list.map(rankText)],
      ['Impuestos', ...list.map((service) => { const plan = cheapestOf(service); return plan ? taxText(plan) : '—'; })],
      ['Planes en Abonito', ...list.map((service) => String(visiblePlans(service).length))],
    ],
  };
  const ranked = list.filter((service) => service.rank);
  const currencies = new Set(ranked.map((service) => service.rank!.currency));
  if (ranked.length >= 2 && currencies.size === 1) {
    const sorted = [...ranked].sort((a, b) => a.rank!.minor - b.rank!.minor);
    const mixedTax = new Set(ranked.map((service) => service.rank!.withTax)).size > 1;
    answer.paragraphs.push(`Con el plan más barato de cada una, ${sorted[0].name} es la que menos sale por mes (${rankText(sorted[0])}).`);
    if (mixedTax) answer.paragraphs.push('Ojo: no todos los montos incluyen impuestos, así que la diferencia real puede ser menor o mayor.');
  } else if (currencies.size > 1) {
    answer.paragraphs.push('Algunas cobran en pesos y otras en dólares: sin un tipo de cambio no las ponemos en orden.');
  }
  const missing = list.filter((service) => !service.rank);
  if (missing.length) answer.paragraphs.push(`${joinList(missing.map((service) => service.name))} no tiene un precio publicado que podamos confirmar. No lo tomamos como gratis.`);
  answer.paragraphs.push('La comparación es sólo de precio. Revisá en cada ficha qué incluye cada plan.');
  answer.links = list.map(fichaLink);
  answer.sources = list.flatMap((service) => planSources(service, [cheapestOf(service)].filter((plan): plan is KbPlan => plan !== null)));
  answer.suggestions = list.slice(0, 2).map((service) => `Planes de ${service.name}`);
  return answer;
}

function inputFromPlan(kb: KnowledgeBase, plan: KbPlan, asOf: string): CalculationInput {
  return {
    label: plan.name,
    amountMinor: plan.amountMinor,
    currency: plan.currency,
    billingPeriodMonths: plan.months,
    billingIntervalDays: plan.days,
    taxInclusion: plan.tax,
    otherChargesNoted: plan.otherCharges,
    ruleIds: plan.ruleIds,
    priceVerifiedAt: plan.verifiedAt,
    priceSourceUrl: plan.sourceUrl,
    rules: kb.taxRules,
    asOf,
    fxArsPerUsdMinor: null,
    fxSource: null,
    fxVerifiedAt: null,
    flags: {},
    userReportedFinalMinor: null,
    userReportedMonths: null,
  };
}

function lineAmount(line: CalculationResult['lines'][number]): string {
  if (line.kind === 'included') return 'Incluido';
  if (line.amountMinor === null || !line.currency) return 'Sin resolver';
  return formatMinor(line.amountMinor, line.currency);
}

function resultTable(result: CalculationResult, caption: string): Answer['table'] {
  return { caption, head: ['Concepto', 'Importe'], rows: result.lines.map((line) => [line.label, lineAmount(line)]) };
}

function ruleSources(kb: KnowledgeBase, ids: string[]): AnswerSource[] {
  return kb.taxRules.filter((rule) => ids.includes(rule.id)).map((rule) => ({ label: rule.label, href: rule.sourceUrl, reviewedAt: rule.verifiedAt }));
}

export function taxAnswer(kb: KnowledgeBase, service: KbService | null, asOf: string): Answer {
  const answer = base('impuestos', service ? [service.id] : []);
  answer.links.push({ label: 'Cómo calculamos', href: '/como-calculamos/' });
  if (!service) {
    const iva = kb.taxRules.find((rule) => rule.chargeType === 'iva-digital');
    const perception = kb.taxRules.find((rule) => rule.chargeType === 'percepcion-ganancias-bienes');
    if (iva?.rateBasisPoints) answer.paragraphs.push(`${iva.label}: ${iva.rateBasisPoints / 100}% sobre servicios digitales del exterior. Lo sumamos sólo cuando la plataforma publica el precio sin impuestos; si ya lo incluye, no se suma de nuevo.`);
    if (perception?.rateBasisPoints) answer.paragraphs.push(`${perception.label}: ${perception.rateBasisPoints / 100}% en ciertos pagos con tarjeta en pesos que acceden al mercado de cambios. Depende de tu medio de pago y del prestador, así que la mostramos como «sin resolver» en vez de sumarla.`);
    answer.paragraphs.push('Tu banco o tu provincia pueden sumar otros cargos que no calculamos.');
    answer.sources = kb.taxRules.map((rule) => ({ label: rule.label, href: rule.sourceUrl, reviewedAt: rule.verifiedAt }));
    answer.suggestions = ['¿Netflix incluye impuestos?', 'USD 10 sin IVA a 1.450', 'Cotización del dólar'];
    return answer;
  }
  const plan = service.plans.find((item) => item.id === service.cheapestPlanId);
  if (!plan || plan.amountMinor === null || !plan.currency) {
    answer.answered = false;
    answer.paragraphs.push(`No hay un precio publicado de ${service.name} que podamos confirmar, así que no podemos decir qué impuestos se suman.`);
    answer.links.unshift(fichaLink(service));
    return answer;
  }
  if (plan.currency === 'USD') {
    answer.paragraphs.push(`${service.name} publica el precio en dólares (${planPrice(plan)}). El total en pesos depende del tipo de cambio y de los impuestos que aplique tu medio de pago.`);
  } else if (plan.tax === 'excluded') {
    answer.paragraphs.push(`${service.name} publica el plan ${plan.name} sin impuestos incluidos (${planPrice(plan)}).`);
  } else if (plan.tax === 'included') {
    answer.paragraphs.push(`${service.name} publica el plan ${plan.name} con impuestos incluidos (${planPrice(plan)}).${plan.otherCharges ? ' Avisa que puede haber otros cargos.' : ''}`);
  } else {
    answer.paragraphs.push(`La página oficial de ${service.name} no aclara si el precio del plan ${plan.name} incluye impuestos.`);
  }
  const result = calculate(inputFromPlan(kb, plan, asOf));
  if (result.lines.length > 1) answer.table = resultTable(result, `Cálculo del plan ${plan.name}`);
  if (result.periodTotalMinor !== null && result.currency === 'ARS' && plan.currency === 'ARS') {
    answer.paragraphs.push(`Total estimado: ${formatMinor(result.periodTotalMinor, 'ARS')} ${periodText(plan)}${result.status === 'partial' ? ', parcial' : ''}.`);
  }
  for (const missing of result.missing) answer.paragraphs.push(missing);
  answer.links.unshift(fichaLink(service));
  answer.sources = [...planSources(service, [plan]), ...ruleSources(kb, plan.ruleIds)];
  answer.suggestions = serviceSuggestions(service, 'impuestos');
  return answer;
}

export function calcAnswer(kb: KnowledgeBase, query: AmountQuery, asOf: string, original: string): Answer {
  const answer = base('calcular');
  const amount = formatPrice(query.minor, query.currency);
  const ruleIds = query.tax === 'excluded' ? ['ar-iva-digital-21', 'ar-percepcion-rg5617'] : ['ar-percepcion-rg5617'];
  const input: CalculationInput = {
    label: 'Estimación del chat',
    amountMinor: query.minor,
    currency: query.currency,
    billingPeriodMonths: query.months,
    taxInclusion: query.tax,
    otherChargesNoted: query.tax !== 'included',
    ruleIds,
    priceVerifiedAt: asOf,
    priceSourceUrl: null,
    rules: kb.taxRules,
    asOf,
    fxArsPerUsdMinor: query.currency === 'USD' ? query.fxMinor : null,
    fxSource: query.currency === 'USD' && query.fxMinor ? 'user' : null,
    fxVerifiedAt: asOf,
    flags: {},
    userReportedFinalMinor: null,
    userReportedMonths: null,
    manual: true,
  };
  const result = calculate(input);
  const period = query.months === 1 ? 'por mes' : query.months === 12 ? 'por año' : `cada ${query.months} meses`;
  const taxNote = query.tax === 'excluded' ? 'sin impuestos' : query.tax === 'included' ? 'con impuestos incluidos' : 'sin aclarar si incluye impuestos';
  answer.paragraphs.push(`Tomé ${amount} ${period}, ${taxNote}${query.currency === 'USD' && query.fxMinor ? `, con el dólar a ${formatPrice(query.fxMinor, 'ARS')} que indicaste` : ''}.`);
  answer.table = resultTable(result, 'Estimación');
  if (result.periodTotalMinor !== null && result.currency === 'ARS') {
    const monthly = result.monthly ? divHalfUp(result.monthly.n, result.monthly.d) : null;
    answer.paragraphs.push(`Total estimado: ${formatMinor(result.periodTotalMinor, 'ARS')} ${period}${query.months > 1 && monthly !== null ? ` (unos ${formatMinor(monthly, 'ARS')} por mes)` : ''}${result.status === 'partial' ? '. Es parcial' : ''}.`);
  }
  const needsFx = query.currency === 'USD' && !query.fxMinor;
  for (const missing of result.missing) {
    if (!(needsFx && missing.includes('tipo de cambio'))) answer.paragraphs.push(missing);
  }
  answer.paragraphs.push('Es una estimación: no reemplaza el resumen de tu banco.');
  if (needsFx) {
    answer.paragraphs.push('Para pasarlo a pesos necesito un tipo de cambio. Abonito no guarda una cotización propia: escribila vos, por ejemplo «USD 10 a 1.450».');
    answer.links.push({ label: 'Ver cotizaciones del dólar', href: '/cotizaciones/' });
  }
  answer.links.push({ label: 'Abrir la calculadora', href: '/calculadora/' });
  answer.sources = ruleSources(kb, ruleIds);
  const clean = original.replace(/\b(sin|con) (iva|impuestos)\b|iva incluido|\+\s*iva/gi, '').replace(/\s+/g, ' ').trim();
  if (query.tax === 'unknown') answer.suggestions = [`${clean} sin IVA`, `${clean} con IVA incluido`];
  return answer;
}

export function dollarAnswer(kb: KnowledgeBase, quotes: DollarQuote[] | null, kind: string | null): Answer {
  const answer = base('dolar');
  answer.links.push({ label: 'Ver cotizaciones del dólar', href: '/cotizaciones/' });
  if (!quotes || quotes.length === 0) {
    answer.answered = false;
    answer.paragraphs.push('No pude cargar las cotizaciones en este momento. Probá de nuevo en un rato o abrí la página de cotizaciones.');
    return answer;
  }
  const chosen = kind ? quotes.filter((quote) => quote.origin === kind) : [];
  const shown = chosen.length ? chosen : quotes.slice(0, 6);
  answer.table = {
    caption: 'Cotizaciones del dólar',
    head: ['Dólar', 'Compra', 'Venta'],
    rows: shown.map((quote) => [quoteShortName[quote.origin] ?? quote.name, quote.buy > 0 ? formatQuote(quote.buy) : '—', formatQuote(quote.sell)]),
  };
  const updated = shown.map((quote) => formatUpdated(quote.updatedAt)).find(Boolean);
  answer.paragraphs.push(`Cotizaciones públicas de referencia${updated ? ` (actualizadas: ${updated})` : ''}. No es la cotización de tu banco.`);
  answer.paragraphs.push('Abonito no usa estas cotizaciones para calcular: en la calculadora y en el chat el tipo de cambio lo indicás vos.');
  answer.paragraphs.push(kb.fx.basis);
  answer.sources = [{ label: 'Tipo de cambio para el IVA digital', href: kb.fx.sourceUrl, reviewedAt: null }];
  answer.suggestions = ['USD 10 sin IVA a 1.450', '¿Qué impuestos se pagan?'];
  return answer;
}

export function cancelAnswer(kb: KnowledgeBase, service: KbService | null, managed: KbService[]): Answer {
  const answer = base('cancelar', service ? [service.id] : []);
  if (!service) {
    answer.paragraphs.push('¿Qué suscripción querés cancelar? Tenemos guías paso a paso para estas plataformas, y guías para lo que cobra Apple o Google Play.');
    answer.links.push({ label: 'Gestionar suscripciones', href: '/gestionar-suscripciones/' });
    answer.links.push({ label: 'Suscripciones de Apple', href: kb.billingGuides.apple });
    answer.links.push({ label: 'Suscripciones de Google Play', href: kb.billingGuides.googlePlay });
    answer.suggestions = managed.slice(0, 4).map((item) => `¿Cómo cancelo ${item.name}?`);
    return answer;
  }
  if (service.guide) {
    answer.paragraphs.push(`Para cancelar ${service.name}, primero fijate quién te cobra: ${joinList(service.guide.billers, 'o')}.`);
    answer.paragraphs.push(service.guide.billerCheck.text);
    answer.paragraphs.push('La guía te muestra los pasos para tu caso y te lleva al sitio oficial. Abonito no cancela nada por vos.');
    answer.links.push({ label: `Cómo cancelar ${service.name}`, href: service.guide.cancelHref });
    answer.links.push({ label: service.guide.billerCheck.label, href: service.guide.billerCheck.url });
  } else {
    answer.paragraphs.push(`Todavía no tenemos una guía paso a paso para ${service.name}.`);
    answer.paragraphs.push('Si te suscribiste desde el iPhone o con Google Play, la baja se hace en la tienda. Si le pagás directamente, buscá la opción en tu cuenta en el sitio oficial.');
    answer.links.push({ label: 'Suscripciones de Apple', href: kb.billingGuides.apple });
    answer.links.push({ label: 'Suscripciones de Google Play', href: kb.billingGuides.googlePlay });
    answer.links.push({ label: `Sitio oficial de ${service.name}`, href: service.officialUrl });
  }
  answer.suggestions = serviceSuggestions(service, 'cancelar');
  return answer;
}

export function saveAnswer(service: KbService | null): Answer {
  const answer = base('pagar_menos', service ? [service.id] : []);
  if (!service) {
    answer.paragraphs.push('Para pagar menos podés pasar a un plan más barato o dar de baja lo que no usás. Con Simular un cambio ves cuánto ahorrarías con tu lista, sin modificarla.');
    answer.links.push({ label: 'Simular un cambio', href: '/simular-ahorro/' });
    answer.links.push({ label: 'Gestionar suscripciones', href: '/gestionar-suscripciones/' });
    answer.suggestions = ['¿Cuál es el streaming más barato?', '¿Cómo pago menos en Spotify?'];
    return answer;
  }
  const cheapest = cheapestPlanAnswer(service);
  answer.paragraphs.push(...cheapest.paragraphs);
  const priced = visiblePlans(service).filter((plan) => plan.amountMinor !== null);
  if (priced.length > 1) {
    answer.table = { caption: `Planes de ${service.name}`, head: ['Plan', 'Precio publicado', 'Impuestos'], rows: priced.map((plan) => [plan.name, planPrice(plan), taxText(plan)]) };
  }
  if (service.guide) {
    answer.paragraphs.push('Cómo cambiar de plan depende de quién te cobra. La guía te muestra el camino para tu caso.');
    answer.links.push({ label: `Pagar menos en ${service.name}`, href: service.guide.saveHref });
  }
  answer.links.push({ label: 'Simular un cambio', href: '/simular-ahorro/' });
  answer.links.push(fichaLink(service));
  answer.sources = cheapest.sources;
  answer.answered = cheapest.answered || Boolean(service.guide);
  answer.suggestions = serviceSuggestions(service, 'pagar_menos');
  return answer;
}

export function categoryAnswer(kb: KnowledgeBase, categoryId: CategoryId | null, cheapest: boolean): Answer {
  const answer = base('categoria');
  const category = kb.categories.find((item) => item.id === categoryId);
  if (!category) {
    answer.paragraphs.push(`¿De qué tipo de servicio? Tenemos ${kb.categories.length} categorías.`);
    answer.links.push({ label: 'Todas las plataformas', href: '/plataformas/' });
    answer.suggestions = kb.categories.slice(0, 4).map((item) => cheapest ? `¿Qué es lo más barato en ${item.label}?` : `¿Qué hay en ${item.label}?`);
    return answer;
  }
  const members = kb.services.filter((service) => service.category === category.id || service.secondary.includes(category.id));
  const order = (service: KbService) => (service.rank ? (service.rank.currency === 'ARS' ? 0 : 1) : 2);
  const sorted = [...members].sort((a, b) => order(a) - order(b) || (a.rank?.minor ?? 0) - (b.rank?.minor ?? 0));
  answer.paragraphs.push(`En ${category.label} hay ${members.length} ${members.length === 1 ? 'plataforma' : 'plataformas'} en Abonito.`);
  if (cheapest) {
    const ars = sorted.find((service) => service.rank?.currency === 'ARS');
    const usd = sorted.find((service) => service.rank?.currency === 'USD');
    if (ars) answer.paragraphs.push(`La más barata en pesos es ${ars.name}: ${rankText(ars)}${ars.rank!.withTax ? '' : ' (todavía faltan impuestos)'}.`);
    if (usd) answer.paragraphs.push(`${ars ? 'Entre las que cobran en dólares, la más barata' : 'La más barata'} es ${usd.name}: ${rankText(usd)}.`);
    answer.paragraphs.push('Comparamos el plan más barato publicado de cada una, sin promociones.');
  }
  answer.table = {
    caption: category.label,
    head: ['Plataforma', 'Desde', 'Por mes'],
    rows: sorted.slice(0, 12).map((service) => [service.name, service.priceShort ?? 'A confirmar', rankText(service)]),
  };
  if (sorted.length > 12) answer.paragraphs.push(`Muestro 12 de ${sorted.length}. El resto está en el catálogo.`);
  answer.links.push({ label: `Ver ${category.label}`, href: `/plataformas/?categoria=${category.id}` });
  answer.suggestions = sorted.length >= 2 ? [`Compará ${sorted[0].name} y ${sorted[1].name}`, `Planes de ${sorted[0].name}`] : [];
  return answer;
}

const featureNames: Record<Feature, string> = {
  ads: 'Anuncios',
  resolution: 'Resolución máxima',
  screens: 'Pantallas a la vez',
  downloads: 'Descargas',
  members: 'Personas',
  storage: 'Almacenamiento',
};

function featureValue(plan: KbPlan, feature: Feature): string | null {
  switch (feature) {
    case 'ads': return plan.ads === null ? null : plan.ads ? 'Con anuncios' : 'Sin anuncios';
    case 'resolution': return plan.resolution;
    case 'screens': return plan.screens === null ? null : String(plan.screens);
    case 'downloads': return plan.downloads;
    case 'members': return plan.members === null ? null : String(plan.members);
    case 'storage': return plan.storage;
  }
}

export function featureAnswer(service: KbService, feature: Feature, faq: { q: string; a: string } | null): Answer {
  const answer = base('caracteristica', [service.id]);
  const plans = visiblePlans(service);
  const values = plans.map((plan) => featureValue(plan, feature));
  if (values.some((value) => value !== null)) {
    answer.table = {
      caption: `${featureNames[feature]} en ${service.name}`,
      head: ['Plan', featureNames[feature], 'Precio publicado'],
      rows: plans.map((plan, index) => [plan.name, values[index] ?? 'No figura', planPrice(plan)]),
    };
    answer.paragraphs.push(`Esto es lo que figura en la página oficial que revisamos de ${service.name}.`);
  } else if (!faq) {
    answer.answered = false;
    answer.paragraphs.push(`La página oficial que revisamos de ${service.name} no detalla eso por plan.`);
  }
  if (faq) answer.paragraphs.unshift(faq.a);
  answer.links.push(fichaLink(service));
  answer.sources = planSources(service, plans);
  answer.suggestions = serviceSuggestions(service, 'caracteristica');
  return answer;
}

export function greetingAnswer(thanks: boolean): Answer {
  const answer = base('saludo');
  answer.paragraphs.push(thanks
    ? 'De nada. Si querés, seguí preguntando.'
    : 'Hola, soy el Chat de Abonito. Respondo con lo que está publicado en el sitio: precios y planes, impuestos, comparaciones, cómo cancelar y cotizaciones del dólar.');
  answer.suggestions = exampleQuestions.slice(0, 4);
  return answer;
}

export const exampleQuestions = [
  '¿Cuánto sale Netflix?',
  'Compará Spotify y YouTube Music',
  '¿Cómo cancelo Disney+?',
  'USD 20 sin IVA a 1.450',
  '¿Cuál es el streaming más barato?',
  'Cotización del dólar blue',
];

export function helpAnswer(): Answer {
  const answer = base('ayuda');
  answer.paragraphs.push('Abonito muestra cuánto pagás por tus suscripciones en Argentina: el precio publicado por cada plataforma, los impuestos y el total estimado en pesos. Puedo responder con esos datos:');
  answer.paragraphs.push('• Precio y planes de cada plataforma, con la fecha de revisión.');
  answer.paragraphs.push('• Si el precio incluye impuestos y cuánto queda con IVA.');
  answer.paragraphs.push('• Comparar plataformas y buscar la más barata de una categoría.');
  answer.paragraphs.push('• Calcular un monto, por ejemplo «USD 10 sin IVA a 1.450».');
  answer.paragraphs.push('• Cómo cancelar o pagar menos, según quién te cobra.');
  answer.paragraphs.push('No tengo acceso a tu cuenta ni a tu lista, y no invento datos que no estén publicados.');
  answer.suggestions = exampleQuestions;
  return answer;
}

export function clarifyServiceAnswer(intent: Intent): Answer {
  const answer = base(intent);
  answer.paragraphs.push('¿De qué plataforma? Escribí el nombre, por ejemplo «planes de Spotify».');
  answer.links.push({ label: 'Todas las plataformas', href: '/plataformas/' });
  answer.suggestions = ['Planes de Netflix', '¿Cuánto sale ChatGPT?', '¿Cuánto sale Spotify?'];
  return answer;
}

export function searchAnswer(hit: { title: string; text: string; href: string; linkLabel: string }, serviceId: string | null): Answer {
  const answer = base('busqueda', serviceId ? [serviceId] : []);
  answer.paragraphs.push(hit.title.endsWith('?') ? `«${hit.title}»` : hit.title);
  answer.paragraphs.push(hit.text);
  answer.links.push({ label: hit.linkLabel, href: hit.href });
  return answer;
}

export function noAnswer(): Answer {
  const answer = base('sin_respuesta');
  answer.answered = false;
  answer.paragraphs.push('No tengo ese dato publicado en Abonito. Respondo sólo con lo que está en el sitio: precios, planes, impuestos, cómo cancelar y cotizaciones.');
  answer.paragraphs.push('Probá nombrando una plataforma o una categoría.');
  answer.links.push({ label: 'Todas las plataformas', href: '/plataformas/' });
  answer.links.push({ label: 'Gestionar suscripciones', href: '/gestionar-suscripciones/' });
  answer.suggestions = exampleQuestions.slice(0, 3);
  return answer;
}