import { describe, expect, it } from 'vitest';
import { plansFor, serviceById, services } from './catalog';
import {
  DESCRIPTION_MAX,
  answerText,
  offerPlans,
  priceSummary,
  relatedServices,
  serviceDescription,
  serviceJsonLd,
  serviceTitle,
  standardFaqs,
} from './service-seo';

const AS_OF = '2026-10-12';
const service = (id: string) => serviceById(id)!;
const plain = (text: string) => text.replace(/\u00a0/g, ' ');

function ld(id: string) {
  const item = service(id);
  const summary = priceSummary(item, AS_OF);
  const faqs = [...item.faqs, ...standardFaqs(item, summary)];
  const json = serviceJsonLd({
    service: item,
    pageUrl: `https://www.abonito.com.ar/${item.slug}/`,
    title: serviceTitle(item, AS_OF),
    description: serviceDescription(item, summary),
    logoUrl: null,
    faqs,
    asOf: AS_OF,
  }) as { '@graph': Array<Record<string, any>> };
  return { graph: json['@graph'], faqs };
}

describe('metadatos de las fichas', () => {
  it('las descripciones entran en 160 caracteres y no se repiten', () => {
    const descriptions = services.map((item) => serviceDescription(item, priceSummary(item, AS_OF)));
    for (const text of descriptions) expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('el año del título sale de la última revisión', () => {
    expect(serviceTitle(service('netflix'), '2027-02-01')).toBe('¿Cuánto sale Netflix en Argentina? - Precios y Planes 2026 | Abonito');
  });

  it('sin precio publicado nunca muestra $ 0', () => {
    const item = service('prime-video');
    const summary = priceSummary(item, AS_OF);
    expect(summary.plan).toBeNull();
    for (const text of [answerText(item, summary), serviceDescription(item, summary)].map(plain)) {
      expect(text).not.toMatch(/\$\s?0(?![\d.,])/);
      expect(text).toMatch(/a confirmar|Todavía no hay un precio/);
    }
  });
});

describe('respuesta directa', () => {
  it('en pesos sin impuestos suma el IVA calculado', () => {
    const text = plain(answerText(service('netflix'), priceSummary(service('netflix'), AS_OF)));
    expect(text).toContain('desde $ 8.999 por mes');
    expect(text).toContain('sumando IVA queda en $ 10.888,79 por mes');
    expect(text).toContain('8 de octubre de 2026');
  });

  it('en dólares no inventa un total en pesos', () => {
    const item = services.find((entry) => priceSummary(entry, AS_OF).plan?.currency === 'USD')!;
    const text = plain(answerText(item, priceSummary(item, AS_OF)));
    expect(text).toContain('USD');
    expect(text).toContain('Se cobra en dólares');
    expect(text).not.toMatch(/\$ \d/);
  });

  it('no usa precios promocionales', () => {
    const item = service('dgo');
    const promos = plansFor(item.id).filter((plan) => plan.promotion).map((plan) => plan.promotion!.amountMinor);
    const summary = priceSummary(item, AS_OF);
    expect(promos.length).toBeGreaterThan(0);
    expect(promos).not.toContain(summary.plan?.amountMinor);
  });
});

describe('preguntas estándar', () => {
  it('no repite un tema que la ficha ya responde', () => {
    const item = service('netflix');
    const questions = standardFaqs(item, priceSummary(item, AS_OF)).map((faq) => faq.question);
    expect(questions.some((question) => /impuestos/.test(question))).toBe(false);
  });

  it('suma la guía para cancelar sólo donde existe', () => {
    const withGuide = standardFaqs(service('youtube-premium'), priceSummary(service('youtube-premium'), AS_OF));
    expect(withGuide.find((faq) => faq.link?.href === '/youtube-premium/cancelar/')).toBeTruthy();
    const withoutGuide = standardFaqs(service('dropbox'), priceSummary(service('dropbox'), AS_OF));
    expect(withoutGuide.some((faq) => /cancel/i.test(faq.question))).toBe(false);
  });
});

describe('datos estructurados', () => {
  it('cada oferta coincide con un plan visible y nunca tiene precio nulo o 0', () => {
    for (const item of services) {
      const product = ld(item.id).graph.find((node) => node['@type'] === 'Product');
      const visible = plansFor(item.id);
      for (const offer of product?.offers ?? []) {
        expect(Number(offer.price)).toBeGreaterThan(0);
        const plan = visible.find((entry) => entry.id === offer.sku && entry.name === offer.name);
        expect(plan, `${item.id}: ${offer.name}`).toBeTruthy();
        expect(offer.price).toBe((plan!.amountMinor! / 100).toFixed(2));
        expect(offer.priceCurrency).toBe(plan!.currency);
      }
    }
  });

  it('sin ofertas no hay Product', () => {
    const { graph } = ld('prime-video');
    expect(offerPlans('prime-video', AS_OF)).toHaveLength(0);
    expect(graph.some((node) => node['@type'] === 'Product')).toBe(false);
    expect(graph.find((node) => node['@type'] === 'WebPage')?.about).toBeUndefined();
  });

  it('los precios vencidos salen de las ofertas', () => {
    expect(offerPlans('netflix', AS_OF).length).toBeGreaterThan(0);
    expect(offerPlans('netflix', '2027-06-01')).toHaveLength(0);
  });

  it('FAQPage refleja las preguntas visibles', () => {
    const { graph, faqs } = ld('spotify');
    const faq = graph.find((node) => node['@type'] === 'FAQPage');
    expect(faq?.mainEntity.map((entry: { name: string }) => entry.name)).toEqual(faqs.map((entry) => entry.question));
  });
});

describe('relacionados', () => {
  it('muestra hasta 6 y nunca la misma ficha', () => {
    for (const item of services) {
      const related = relatedServices(item);
      expect(related.length).toBeLessThanOrEqual(6);
      expect(related.some((entry) => entry.id === item.id)).toBe(false);
    }
  });
});
