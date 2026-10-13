import type { APIRoute } from 'astro';
import { categoryLabels, services, todayIso } from '../lib/catalog';
import { priceSummary } from '../lib/service-seo';
import type { CategoryId } from '../lib/types';

export const prerender = true;

function priceNote(summary: ReturnType<typeof priceSummary>): string {
  const { plan } = summary;
  if (!plan || !summary.price) return 'precio a confirmar';
  const tax = plan.currency === 'USD'
    ? 'en dólares'
    : plan.taxInclusion === 'excluded' ? 'sin impuestos' : plan.taxInclusion === 'included' ? 'con impuestos incluidos' : 'la página no aclara impuestos';
  const reviewed = summary.verifiedAt ? `, revisado el ${summary.verifiedAt}` : '';
  return `desde ${summary.price.replace(/\u00a0/g, ' ')} (${plan.name}), ${tax}${reviewed}`;
}

export const GET: APIRoute = () => {
  const site = (import.meta.env.SITE ?? 'https://www.abonito.com.ar').replace(/\/$/, '');
  const asOf = todayIso();
  const lines = [
    '# Abonito',
    '',
    '> Precios de suscripciones digitales en Argentina: el precio publicado por cada plataforma, los impuestos que se pueden calcular y el total estimado en pesos. Cada precio sale de la página oficial y lleva la fecha en que se revisó.',
    '',
    'Al citar un precio, incluí la fecha de revisión y aclará si es sin impuestos o en dólares. Un precio a confirmar no es $ 0. Las promociones no se aplican salvo que se indique.',
    '',
    '## Metodología',
    '',
    `- [Cómo calculamos](${site}/como-calculamos/): impuestos, tipo de cambio y qué queda sin confirmar`,
    `- [Calculadora](${site}/calculadora/): total estimado de cualquier suscripción`,
    `- [Cotizaciones del dólar](${site}/cotizaciones/)`,
    `- [Gestionar suscripciones](${site}/gestionar-suscripciones/): cómo cancelar o pagar menos según quién te cobra`,
    '',
  ];
  const categories = [...new Set(services.map((service) => service.category))] as CategoryId[];
  for (const category of categories) {
    lines.push(`## ${categoryLabels[category]}`, '');
    for (const service of services.filter((item) => item.category === category)) {
      lines.push(`- [${service.name}](${site}/${service.slug}/): ${priceNote(priceSummary(service, asOf))}`);
    }
    lines.push('');
  }
  return new Response(`${lines.join('\n')}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
