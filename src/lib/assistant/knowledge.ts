import { catalogMeta, categoryLabels, exchangeBasis, monthlyPublishedMinor, plansFor, services, taxRules, todayIso } from '../catalog';
import { answerText, priceSummary, standardFaqs } from '../service-seo';
import { channelLabel } from '../guides';
import { APPLE_GUIDE_HREF, GOOGLE_PLAY_GUIDE_HREF } from '../../data/subscription-management/billing-guides';
import { guideHref } from '../../data/subscription-management/managed';
import { platformGuides } from '../../data/subscription-management/platform-guides';
import type { CategoryId, PlanRecord, ServiceRecord } from '../types';
import type { KbCategory, KbGuide, KbPage, KbPlan, KbService, KnowledgeBase } from './types';

/** Palabras con las que la gente nombra cada categoría, además de su etiqueta. */
const categoryKeywords: Record<CategoryId, string[]> = {
  series: ['series', 'peliculas', 'pelis', 'cine', 'streaming de video', 'streaming', 'anime'],
  musica: ['musica', 'canciones', 'podcasts', 'escuchar musica'],
  almacenamiento: ['almacenamiento', 'nube', 'espacio', 'backup', 'fotos en la nube', 'storage'],
  paquetes: ['paquetes', 'combos', 'beneficios', 'bundle'],
  deportes: ['deportes', 'futbol', 'formula 1', 'basquet', 'nba', 'nfl'],
  'tv-en-vivo': ['tv en vivo', 'television', 'canales en vivo', 'cable'],
  productividad: ['productividad', 'oficina', 'office', 'videollamadas', 'notas', 'documentos', 'correo'],
  diseno: ['diseno', 'edicion de fotos', 'edicion de video', 'editar video', 'editar fotos'],
  'inteligencia-artificial': ['inteligencia artificial', 'ia', 'ai', 'chatbot', 'chatbots', 'asistente de ia'],
  'hosting-cloud': ['hosting', 'cloud', 'servidores', 'deploy', 'base de datos'],
  internet: ['internet', 'conectividad', 'fibra', 'satelital', 'wifi'],
  videojuegos: ['videojuegos', 'juegos', 'games', 'gaming', 'consola', 'consolas'],
  'redes-sociales': ['redes sociales', 'redes', 'mensajeria', 'verificado'],
  'programacion-ia': ['programacion con ia', 'programar con ia', 'codigo con ia', 'editor de codigo'],
  'creacion-apps': ['creacion de aplicaciones', 'crear apps', 'crear aplicaciones', 'sin codigo', 'no code'],
  seguridad: ['seguridad', 'vpn', 'contrasenas', 'claves', 'gestor de contrasenas'],
  'streaming-creadores': ['streaming de creadores', 'streamers', 'transmitir en vivo', 'creadores'],
  aprendizaje: ['aprendizaje', 'aprender', 'cursos', 'idiomas', 'educacion'],
};

const pages: KbPage[] = [
  { href: '/plataformas/', title: 'Plataformas', summary: 'Catálogo de suscripciones con el precio publicado y la fecha en que lo verificamos.', keywords: ['catalogo', 'todas las plataformas', 'lista de plataformas', 'servicios'] },
  { href: '/calculadora/', title: 'Calculadora', summary: 'Estimá un precio o anotá el importe final que ya te cobraron, sin volver a sumar impuestos.', keywords: ['calculadora', 'calcular', 'estimar', 'total', 'importe final'] },
  { href: '/como-calculamos/', title: 'Cómo calculamos', summary: 'De dónde salen los precios, qué impuestos se suman y qué queda sin resolver en Abonito.', keywords: ['metodologia', 'como calculan', 'de donde salen los precios', 'de donde sacan los precios', 'sacan', 'salen', 'fuentes', 'como calculamos', 'actualizan'] },
  { href: '/cotizaciones/', title: 'Cotizaciones del dólar', summary: 'Compra y venta del dólar oficial, blue, MEP, CCL y otras pizarras públicas. No es la cotización de tu banco.', keywords: ['cotizaciones', 'dolar', 'blue', 'mep', 'ccl', 'tipo de cambio'] },
  { href: '/gestionar-suscripciones/', title: 'Gestionar suscripciones', summary: 'Pasos para cancelar o pagar menos según quién te cobra el servicio.', keywords: ['gestionar', 'cancelar', 'dar de baja', 'guias'] },
  { href: '/mis-suscripciones/', title: 'Mis suscripciones', summary: 'Tu lista de suscripciones y el gasto mensual estimado. Queda guardada sólo en este navegador.', keywords: ['mis suscripciones', 'mi lista', 'cuanto gasto', 'gasto por mes', 'gasto mensual', 'gastos', 'presupuesto', 'tope', 'total mensual'] },
  { href: '/simular-ahorro/', title: 'Simular un cambio', summary: 'Compará tu lista con otro escenario, sin modificarla hasta que confirmes.', keywords: ['simular', 'ahorro', 'escenario', 'cambiar de plan'] },
  { href: '/privacidad/', title: 'Privacidad', summary: 'Abonito guarda tu lista en este navegador. No hay cuenta ni servidor de usuarios. Los anuncios de Google AdSense usan cookies.', keywords: ['privacidad', 'datos personales', 'mis datos', 'guardan', 'tarjeta', 'banco', 'cookies', 'registrarme', 'cuenta'] },
  { href: APPLE_GUIDE_HREF, title: 'Cancelar suscripciones de Apple', summary: 'Cómo cancelar una suscripción cobrada por Apple desde el iPhone, la Mac, la web o Windows, y qué hacer si no la encontrás.', keywords: ['apple', 'iphone', 'app store', 'itunes', 'ipad', 'mac'] },
  { href: GOOGLE_PLAY_GUIDE_HREF, title: 'Cancelar suscripciones de Google Play', summary: 'Cómo cancelar, pausar o cambiar una suscripción cobrada por Google Play desde Android o la computadora.', keywords: ['google play', 'android', 'play store', 'pausar'] },
];

function toKbPlan(plan: PlanRecord): KbPlan {
  return {
    id: plan.id,
    name: plan.name,
    amountMinor: plan.amountMinor,
    currency: plan.currency,
    months: plan.billingPeriodMonths,
    days: plan.billingIntervalDays ?? null,
    tax: plan.taxInclusion,
    otherCharges: plan.otherChargesNoted,
    ruleIds: plan.taxRuleIds,
    verifiedAt: plan.verifiedAt,
    sourceUrl: plan.sourceUrl,
    available: plan.availableInArgentina,
    selectable: plan.selectable !== false,
    eligibility: plan.features.eligibility,
    promo: plan.promotion
      ? { amountMinor: plan.promotion.amountMinor, currency: plan.promotion.currency, cycles: plan.promotion.durationCycles, note: plan.promotion.note }
      : null,
    ads: plan.features.ads,
    resolution: plan.features.maxResolution,
    screens: plan.features.simultaneousPlayback,
    downloads: plan.features.downloads,
    storage: plan.features.storage,
    members: plan.features.memberLimit,
  };
}

function toKbGuide(service: ServiceRecord): KbGuide | null {
  const guide = platformGuides.find((item) => item.platformId === service.id);
  const cancelHref = guideHref(service.id, 'cancelar');
  const saveHref = guideHref(service.id, 'ahorrar');
  if (!guide || !cancelHref || !saveHref) return null;
  return {
    cancelHref,
    saveHref,
    intro: guide.intro,
    billers: guide.channels.map((channel) => channelLabel(channel, guide.providerName)),
    billerCheck: { text: guide.billerCheck.text, label: guide.billerCheck.label, url: guide.billerCheck.url },
    faqs: guide.faqs.map((faq) => ({ q: faq.question, a: faq.answer, href: cancelHref, linkLabel: `Guía de ${guide.name}` })),
  };
}

function toKbService(service: ServiceRecord, asOf: string): KbService {
  const summary = priceSummary(service, asOf);
  const { plan } = summary;
  let rank: KbService['rank'] = null;
  if (plan && plan.currency) {
    const published = monthlyPublishedMinor(plan);
    if (plan.currency === 'ARS' && summary.withTaxMonthlyMinor !== null) {
      rank = { minor: summary.withTaxMonthlyMinor, currency: 'ARS', withTax: true };
    } else if (published !== null) {
      rank = { minor: published, currency: plan.currency, withTax: plan.currency === 'ARS' && plan.taxInclusion === 'included' };
    }
  }
  const faqs = [
    ...service.faqs.map((faq) => ({ q: faq.question, a: faq.answer })),
    ...standardFaqs(service, summary).map((faq) => ({ q: faq.question, a: faq.answer, href: faq.link?.href, linkLabel: faq.link?.label })),
  ];
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    aliases: service.aliases,
    tags: service.tags ?? [],
    category: service.category,
    secondary: service.secondaryCategories ?? [],
    description: service.description,
    officialUrl: service.officialUrl,
    answer: answerText(service, summary),
    cheapestPlanId: plan?.id ?? null,
    rank,
    priceShort: summary.priceShort,
    faqs,
    plans: plansFor(service.id).map(toKbPlan),
    guide: toKbGuide(service),
  };
}

export function buildKnowledge(asOf = todayIso()): KnowledgeBase {
  const categories: KbCategory[] = (Object.keys(categoryLabels) as CategoryId[])
    .filter((id) => services.some((service) => service.category === id || (service.secondaryCategories ?? []).includes(id)))
    .map((id) => ({ id, label: categoryLabels[id], keywords: categoryKeywords[id] }));
  return {
    version: 1,
    revision: catalogMeta.revision,
    builtAt: asOf,
    categories,
    services: services.map((service) => toKbService(service, asOf)),
    taxRules,
    fx: { basis: exchangeBasis.basis, sourceUrl: exchangeBasis.sourceUrl },
    billingGuides: { apple: APPLE_GUIDE_HREF, googlePlay: GOOGLE_PLAY_GUIDE_HREF },
    pages,
  };
}
