import { describe, expect, it } from 'vitest';
import type { DollarQuote } from '../quotes';
import { planPrice } from './answers';
import { createAssistant, EMPTY_CONTEXT, isSafeHref, MAX_QUESTION_LENGTH } from './engine';
import { buildKnowledge } from './knowledge';
import { parseAmount } from './nlu';
import type { Answer, ChatContext, Intent } from './types';
import { validateKnowledge } from './validation';

const AS_OF = '2026-10-13';
const kb = buildKnowledge(AS_OF);
const quotes: DollarQuote[] = [
  { currency: 'USD', name: 'Dólar Blue', origin: 'BLUE', buy: 1400, sell: 1420, updatedAt: '2026-10-13T12:00:00Z', change: null },
  { currency: 'USD', name: 'Dólar Oficial', origin: 'OFICIAL', buy: 1380, sell: 1430, updatedAt: '2026-10-13T12:00:00Z', change: null },
];
const assistant = createAssistant(kb, { asOf: AS_OF, loadQuotes: async () => quotes });

async function conversation(questions: string[]): Promise<Answer> {
  let context: ChatContext = EMPTY_CONTEXT;
  let answer: Answer | null = null;
  for (const question of questions) {
    const reply = await assistant.respond(question, context);
    context = reply.context;
    answer = reply.answer;
  }
  return answer!;
}

const allText = (answer: Answer) => [
  ...answer.paragraphs,
  ...(answer.table ? [answer.table.caption, ...answer.table.head, ...answer.table.rows.flat()] : []),
  ...answer.links.map((link) => link.label),
].join('\n');

interface Case {
  q: string | string[];
  intent: Intent;
  services?: string[];
  link?: string;
  answered?: boolean;
  text?: RegExp;
}

const cases: Case[] = [
  { q: '¿Cuánto sale Netflix?', intent: 'precio', services: ['netflix'], link: '/netflix/' },
  { q: 'precio de spotify', intent: 'precio', services: ['spotify'] },
  { q: 'cuanto sale microsoft 365', intent: 'precio', services: ['microsoft-365'] },
  { q: 'netflx', intent: 'precio', services: ['netflix'] },
  { q: 'planes de disney plus', intent: 'planes', services: ['disney-plus'] },
  { q: '¿Netflix tiene plan anual?', intent: 'planes', services: ['netflix'] },
  { q: 'spotify duo', intent: 'planes', services: ['spotify'], text: /Duo/ },
  { q: '¿Cuál es el plan más barato de HBO Max?', intent: 'plan_mas_barato', services: ['hbo-max'] },
  { q: 'Netflix vs Disney+', intent: 'comparar', services: ['netflix', 'disney-plus'] },
  { q: 'chatgpt o claude', intent: 'comparar', services: ['chatgpt', 'claude'] },
  { q: 'Compará Spotify y YouTube Music', intent: 'comparar', services: ['spotify', 'youtube-music'] },
  { q: '¿Spotify incluye impuestos?', intent: 'impuestos', services: ['spotify'], link: '/como-calculamos/' },
  { q: '¿qué impuestos se pagan?', intent: 'impuestos', services: [], text: /IVA: 21%/ },
  { q: 'USD 20 sin IVA a 1.450', intent: 'calcular', text: /35\.090,00/ },
  { q: 'USD 10', intent: 'calcular', link: '/cotizaciones/', text: /necesito un tipo de cambio/ },
  { q: '$ 5.000 con IVA', intent: 'calcular', text: /5\.000,00/ },
  { q: 'cotización del dólar blue', intent: 'dolar', text: /Blue/ },
  { q: '¿Cómo cancelo Disney+?', intent: 'cancelar', services: ['disney-plus'], link: '/disney-plus/cancelar/' },
  { q: 'quiero darme de baja de paramount', intent: 'cancelar', services: ['paramount-plus'], link: '/paramount-plus/cancelar/' },
  { q: '¿cómo cancelo ChatGPT?', intent: 'cancelar', services: ['chatgpt'], link: '/guias/cancelar-suscripciones-apple/' },
  { q: '¿cómo cancelo?', intent: 'cancelar', services: [], link: '/gestionar-suscripciones/' },
  { q: '¿cómo pago menos en Spotify?', intent: 'pagar_menos', services: ['spotify'], link: '/spotify/cancelar/?objetivo=ahorrar' },
  { q: '¿Cuál es el streaming más barato?', intent: 'categoria', link: '/plataformas/?categoria=series' },
  { q: '¿qué apps de IA hay?', intent: 'categoria', link: '/plataformas/?categoria=inteligencia-artificial' },
  { q: 'qué VPN hay', intent: 'categoria', link: '/plataformas/?categoria=seguridad' },
  { q: '¿Netflix tiene anuncios?', intent: 'caracteristica', services: ['netflix'], text: /Sin anuncios/ },
  { q: '¿cuántas pantallas tiene disney?', intent: 'caracteristica', services: ['disney-plus'] },
  { q: 'hola', intent: 'saludo' },
  { q: 'gracias', intent: 'saludo', text: /De nada/ },
  { q: 'que podes hacer', intent: 'ayuda' },
  { q: '¿Qué es Abonito?', intent: 'ayuda' },
  { q: 'cuánto gasto por mes', intent: 'busqueda', link: '/mis-suscripciones/' },
  { q: '¿Tienen datos de mi tarjeta?', intent: 'busqueda', link: '/privacidad/' },
  { q: 'como funciona la calculadora', intent: 'busqueda', link: '/calculadora/' },
  { q: '¿de dónde sacan los precios?', intent: 'busqueda', link: '/como-calculamos/' },
  { q: '¿quién ganó el mundial?', intent: 'sin_respuesta', answered: false },
  { q: 'asdfgh qwerty', intent: 'sin_respuesta', answered: false },
  { q: '¿cuánto sale Prime Video?', intent: 'precio', services: ['prime-video'], answered: false, text: /Todavía no hay un precio/ },
  { q: ['¿Cuánto sale Netflix?', 'y cómo lo cancelo?'], intent: 'cancelar', services: ['netflix'] },
  { q: ['¿Cuánto sale Netflix?', '¿y Spotify?'], intent: 'precio', services: ['spotify'] },
  { q: ['planes de spotify', 'compará con YouTube Music'], intent: 'comparar', services: ['spotify', 'youtube-music'] },
  { q: ['¿Cuánto sale Netflix?', '¿qué impuestos se pagan?'], intent: 'impuestos', services: [] },
  { q: ['¿Cuál es el streaming más barato?', '¿cómo cancelo?'], intent: 'cancelar', services: [] },
];

describe('Chat Abonito', () => {
  it.each(cases.map((item) => [Array.isArray(item.q) ? item.q.join(' → ') : item.q, item] as const))('%s', async (_, item) => {
    const answer = await conversation(Array.isArray(item.q) ? item.q : [item.q]);
    expect(answer.intent).toBe(item.intent);
    if (item.services) expect(answer.serviceIds).toEqual(item.services);
    if (item.link) expect(answer.links.map((link) => link.href)).toContain(item.link);
    expect(answer.answered).toBe(item.answered ?? true);
    if (item.text) expect(allText(answer)).toMatch(item.text);
  });

  it('no confunde «compartir» con comparar', async () => {
    const answer = await conversation(['¿Cuánto sale Disney+?', '¿se puede compartir la cuenta de Netflix?']);
    expect(answer.intent).not.toBe('comparar');
    expect(answer.serviceIds).toEqual(['netflix']);
  });

  it('dice que no pudo cargar el dólar en vez de inventarlo', async () => {
    const offline = createAssistant(kb, { asOf: AS_OF, loadQuotes: async () => { throw new Error('sin red'); } });
    const { answer } = await offline.respond('cotización del dólar');
    expect(answer.intent).toBe('dolar');
    expect(answer.answered).toBe(false);
    expect(answer.table).toBeUndefined();
  });

  it('encuentra cada plataforma del catálogo por su nombre', () => {
    expect(validateKnowledge(kb)).toEqual([]);
  });
});

describe('invariantes del Chat Abonito', () => {
  const questions = kb.services.flatMap((service) => [
    `¿Cuánto sale ${service.name}?`,
    `planes de ${service.name}`,
    `¿${service.name} incluye impuestos?`,
    `¿Cómo cancelo ${service.name}?`,
    `¿Cómo pago menos en ${service.name}?`,
  ]);

  it('nunca muestra un precio nulo como $ 0 y sólo enlaza a destinos revisados', async () => {
    for (const question of questions) {
      const { answer } = await assistant.respond(question);
      expect(allText(answer), question).not.toMatch(/\$\s0(,00)?(?![\d.,])/);
      for (const link of answer.links) expect(isSafeHref(link.href, assistant.hosts), `${question}: ${link.href}`).toBe(true);
      for (const source of answer.sources) expect(source.href, question).toMatch(/^https:\/\//);
    }
  });

  it('muestra el precio de lista, no la promoción', async () => {
    const withPromo = kb.services.filter((service) => service.plans.some((plan) => plan.promo && plan.available !== false));
    expect(withPromo.length).toBeGreaterThan(0);
    for (const service of withPromo) {
      const { answer } = await assistant.respond(`planes de ${service.name}`);
      for (const plan of service.plans.filter((item) => item.promo && item.available !== false)) {
        const listed = answer.table?.rows.some((cells) => cells[0] === plan.name && cells[1] === planPrice(plan));
        expect(listed, `${service.name} ${plan.name}`).toBe(true);
      }
      expect(answer.paragraphs.join(' ')).toMatch(/No la sumamos a ningún total/);
    }
  });

  it('rechaza destinos que no salen de los datos revisados', () => {
    expect(isSafeHref('/netflix/', assistant.hosts)).toBe(true);
    expect(isSafeHref('https://www.netflix.com/account', assistant.hosts)).toBe(true);
    expect(isSafeHref('//otro-sitio.test/', assistant.hosts)).toBe(false);
    expect(isSafeHref('javascript:alert(1)', assistant.hosts)).toBe(false);
    expect(isSafeHref('http://www.netflix.com/', assistant.hosts)).toBe(false);
    expect(isSafeHref('https://otro-sitio.test/', assistant.hosts)).toBe(false);
    expect(isSafeHref('https://usuario@www.netflix.com/', assistant.hosts)).toBe(false);
  });

  it('no toma enlaces de la pregunta y recorta textos largos', async () => {
    const { answer } = await assistant.respond('https://otro-sitio.test/ <img src=x onerror=alert(1)> netflix');
    expect(answer.links.every((link) => !link.href.includes('otro-sitio'))).toBe(true);
    const long = await assistant.respond(`netflix ${'a'.repeat(MAX_QUESTION_LENGTH * 3)}`);
    expect(long.answer.serviceIds).toEqual(['netflix']);
    const empty = await assistant.respond('   ');
    expect(empty.answer.intent).toBe('ayuda');
  });
});

describe('lectura de montos', () => {
  it('reconoce moneda, tipo de cambio, impuestos y período', () => {
    expect(parseAmount('USD 9,99 sin IVA a 1.450', new Set(), false)).toEqual({ minor: 999, currency: 'USD', fxMinor: 145000, tax: 'excluded', months: 1 });
    expect(parseAmount('10 dólares por año', new Set(), false)).toMatchObject({ minor: 1000, currency: 'USD', fxMinor: null, months: 12 });
    expect(parseAmount('$ 4.499 con IVA', new Set(), false)).toMatchObject({ minor: 449900, currency: 'ARS', tax: 'included' });
    expect(parseAmount('cada 3 meses pago 12000 pesos', new Set(), false)).toMatchObject({ minor: 1200000, currency: 'ARS', months: 3 });
    expect(parseAmount('microsoft 365', new Set(['365']), true)).toBeNull();
  });
});
