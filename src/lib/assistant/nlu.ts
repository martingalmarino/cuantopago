import { parseLocalAmount, type Currency } from '../money';
import type { CategoryId, TaxInclusion } from '../types';
import { STOPWORDS, levenshtein, normalize } from './text';
import type { ChatContext, Intent, KnowledgeBase } from './types';

export type Feature = 'ads' | 'resolution' | 'screens' | 'downloads' | 'members' | 'storage';

export interface AmountQuery {
  minor: number;
  currency: Currency;
  fxMinor: number | null;
  tax: TaxInclusion;
  months: number;
}

export interface Parsed {
  intent: Intent;
  serviceIds: string[];
  categoryId: CategoryId | null;
  amount: AmountQuery | null;
  feature: Feature | null;
  months: number | null;
  dollarKind: string | null;
  /** Palabras que no se reconocieron como plataforma, categoría ni intención. */
  leftover: string[];
}

interface Phrase {
  tokens: string[];
  ids: string[];
  strong: boolean;
  /** Alias que también es una palabra común o el nombre de un plan («premium», «notas»): sólo cuenta si no se nombró otra plataforma. */
  generic: boolean;
}

const COMMON_WORDS = new Set([
  'notas', 'videollamadas', 'graficos', 'bolsa', 'simulador', 'optimizador', 'ping', 'lag', 'verificado', 'verificacion',
  'idiomas', 'ingles', 'programacion', 'matematica', 'ciencia', 'automatizaciones', 'personal', 'music', 'drive',
  'microsoft', 'boost', 'markdown', 'meta', 'vpn',
]);

export interface EntityIndex {
  services: Map<string, Phrase[]>;
  fuzzy: { token: string; id: string }[];
  categories: Map<string, { tokens: string[]; id: CategoryId }[]>;
}

function addPhrase<T extends { tokens: string[] }>(map: Map<string, T[]>, phrase: T): void {
  const first = phrase.tokens[0];
  if (!first) return;
  const list = map.get(first) ?? [];
  list.push(phrase);
  map.set(first, list);
}

export function buildEntityIndex(kb: KnowledgeBase): EntityIndex {
  const planWords = new Set(kb.services.flatMap((service) => service.plans.flatMap((plan) => normalize(plan.name).split(' '))));
  const byKey = new Map<string, Phrase>();
  for (const service of kb.services) {
    const strong = [service.name, service.slug.replace(/-/g, ' ')];
    for (const [raw, isStrong] of [...strong.map((value) => [value, true] as const), ...service.aliases.map((value) => [value, false] as const)]) {
      const key = normalize(raw);
      if (key.length < 2) continue;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.ids.includes(service.id)) existing.ids.push(service.id);
        existing.strong = existing.strong || isStrong;
      } else {
        byKey.set(key, { tokens: key.split(' '), ids: [service.id], strong: isStrong, generic: false });
      }
    }
  }
  for (const [key, phrase] of byKey) {
    phrase.generic = !phrase.strong && !key.includes(' ') && (planWords.has(key) || COMMON_WORDS.has(key));
  }
  const services = new Map<string, Phrase[]>();
  for (const phrase of byKey.values()) addPhrase(services, phrase);
  for (const list of services.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  const fuzzy = [...byKey.entries()]
    .filter(([key, phrase]) => !key.includes(' ') && key.length >= 5 && phrase.ids.length === 1 && !/\d/.test(key))
    .map(([token, phrase]) => ({ token, id: phrase.ids[0] }));

  const categories = new Map<string, { tokens: string[]; id: CategoryId }[]>();
  for (const category of kb.categories) {
    for (const raw of [category.label, ...category.keywords]) {
      const key = normalize(raw);
      if (key) addPhrase(categories, { tokens: key.split(' '), id: category.id });
    }
  }
  for (const list of categories.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  return { services, fuzzy, categories };
}

const INTENT_WORDS: [Intent | 'feature' | 'greet' | 'thanks' | 'calc', RegExp][] = [
  ['greet', /^(hola|buenas|buen dia|buenas tardes|buenas noches|hey|que tal|holis)\b/],
  ['thanks', /\b(gracias|genial|perfecto|joya|buenisimo)\b/],
  ['ayuda', /\b(que (podes|puedo|sabes) (hacer|preguntar(te)?)|ayuda|como funcionas|como funciona (esto|el chat)|quien sos|que sos|para que servis|que es abonito|quienes son)\b/],
  ['cancelar', /\b(cancel\w*|dar(me|lo|la)? de baja|darme de baja|la baja|desuscrib\w*|anular\w*|desactiv\w*|cortar|dejar de pagar)\b/],
  ['pagar_menos', /\b(pag(o|ar|ue|amos|ar) menos|ahorr\w*|bajar(me)? (de|el) plan|bajar de plan|gastar menos|reducir|economizar|cambiar (a un |de )?plan|downgrade)\b/],
  ['plan_mas_barato', /\b(mas barat\w*|mas economic\w*|menor precio|mas accesible|el que menos (sale|cuesta)|mas conveniente)\b/],
  ['comparar', /\b(vs|versus|compar(a|e|o|ar|ame|amelas|alas|alos|acion|ativa|emos)|diferencia\w*|conviene|mejor)\b/],
  ['dolar', /\b(dolar(es)?|cotizacion\w*|blue|mep|ccl|tipo de cambio|cambio hoy)\b/],
  ['impuestos', /\b(impuesto\w*|iva|percepcion\w*|rg 5617|5617|ganancias|recargo\w*|incluye\w*|incluido|retencion\w*|afip|arca)\b/],
  ['feature', /\b(anuncio\w*|publicidad\w*|4k|hd|full hd|uhd|resolucion|calidad|pantalla\w*|dispositivo\w*|simultane\w*|descarga\w*|offline|miembro\w*|integrantes|perfiles|almacenamiento|gb|tb|espacio)\b/],
  ['planes', /\b(planes|plan|opciones|tipos|modalidad\w*|anual(es)?|mensual(es)?|familiar|estudiante\w*|individual)\b/],
  ['precio', /\b(cuanto|precio\w*|sale|salen|cuesta|cuestan|vale|valen|valor|tarifa\w*|costo\w*|abono|pago|pagar)\b/],
  ['calc', /\b(calcul\w*|total|cuanto (queda|quedaria|seria|pagaria|pago))\b/],
];

const INHERITABLE = new Set<string>(['cancelar', 'pagar_menos', 'plan_mas_barato', 'comparar', 'impuestos', 'planes', 'precio']);
/** Intenciones que se repiten con otra plataforma en «¿y Spotify?». */
const INHERITED_INTENTS = new Set<Intent>(['precio', 'planes', 'plan_mas_barato', 'impuestos', 'cancelar', 'pagar_menos']);

const FEATURES: [Feature, RegExp][] = [
  ['ads', /\b(anuncio\w*|publicidad\w*)\b/],
  ['resolution', /\b(4k|hd|full hd|uhd|resolucion|calidad)\b/],
  ['screens', /\b(pantalla\w*|dispositivo\w*|simultane\w*)\b/],
  ['downloads', /\b(descarga\w*|offline)\b/],
  ['members', /\b(miembro\w*|integrantes|perfiles|personas|familiar)\b/],
  ['storage', /\b(almacenamiento|gb|tb|espacio)\b/],
];

const INTENT_VOCABULARY = new Set(
  'cancelar cancelo cancela baja anular pagar menos ahorrar barato barata economico comparar diferencia conviene mejor dolar dolares cotizacion impuestos impuesto iva incluye anuncios publicidad pantallas descargas miembros planes plan anual mensual precio precios cuanto sale cuesta vale valor costo calcular total queda seria plataforma plataformas suscripcion suscripciones servicio servicios app apps aplicacion'.split(' '),
);

const NUMBER = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;

function parseNumber(raw: string): number | null {
  const parsed = parseLocalAmount(raw);
  return parsed.ok && parsed.minor > 0 ? parsed.minor : null;
}

/** Lee «USD 10», «10 dólares», «$ 5.000», «5000 pesos» y, si hay, el tipo de cambio («a 1.450»). */
export function parseAmount(raw: string, numbersToIgnore: Set<string>, calcWord: boolean): AmountQuery | null {
  const text = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const patterns: { re: RegExp; currency: Currency; group: number }[] = [
    { re: new RegExp(String.raw`(?:usd|u\$s|us\$|u\$d)\s*${NUMBER}`), currency: 'USD', group: 1 },
    { re: new RegExp(String.raw`${NUMBER}\s*(?:usd|u\$s|us\$|dolares|dolar|dls)\b`), currency: 'USD', group: 1 },
    { re: new RegExp(String.raw`(?:ars|\$)\s*${NUMBER}`), currency: 'ARS', group: 1 },
    { re: new RegExp(String.raw`${NUMBER}\s*(?:pesos|ars)\b`), currency: 'ARS', group: 1 },
  ];
  let found: { minor: number; currency: Currency; index: number; length: number } | null = null;
  for (const pattern of patterns) {
    const match = pattern.re.exec(text);
    if (!match) continue;
    const minor = parseNumber(match[pattern.group]);
    if (minor === null) continue;
    found = { minor, currency: pattern.currency, index: match.index, length: match[0].length };
    break;
  }
  if (!found && calcWord) {
    const re = new RegExp(NUMBER, 'g');
    for (const match of text.matchAll(re)) {
      if (numbersToIgnore.has(match[1])) continue;
      const minor = parseNumber(match[1]);
      if (minor === null) continue;
      found = { minor, currency: 'ARS', index: match.index ?? 0, length: match[0].length };
      break;
    }
  }
  if (!found) return null;

  const rest = text.slice(0, found.index) + ' '.repeat(found.length) + text.slice(found.index + found.length);
  let fxMinor: number | null = null;
  if (found.currency === 'USD') {
    const fx = new RegExp(String.raw`(?:\ba\b|cambio(?: de)?|cotizacion(?: de)?|dolar(?: a| de)?|con el dolar a|\$)\s*\$?\s*${NUMBER}`).exec(rest);
    if (fx) fxMinor = parseNumber(fx[1]);
  }
  let tax: TaxInclusion = 'unknown';
  if (/\b(sin (iva|impuestos)|mas iva|neto|antes de impuestos)\b|\+\s*iva/.test(text)) tax = 'excluded';
  else if (/\b(con (iva|impuestos)|iva incluido|impuestos incluidos|final)\b/.test(text)) tax = 'included';
  let months = 1;
  const every = /\bcada (\d{1,2}) meses\b/.exec(text);
  if (every) months = Math.max(1, Number(every[1]));
  else if (/\b(por ano|al ano|anual)\b/.test(normalize(text))) months = 12;
  return { minor: found.minor, currency: found.currency, fxMinor, tax, months };
}

function matchEntities(words: string[], index: EntityIndex) {
  const consumed = new Array(words.length).fill(false);
  const matches: { ids: string[]; generic: boolean; start: number; length: number }[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const candidates = index.services.get(words[i]) ?? [];
    const hit = candidates.find((phrase) => phrase.tokens.every((token, offset) => words[i + offset] === token));
    if (hit) {
      matches.push({ ids: hit.ids, generic: hit.generic, start: i, length: hit.tokens.length });
      for (let k = 0; k < hit.tokens.length; k += 1) consumed[i + k] = true;
      i += hit.tokens.length - 1;
      continue;
    }
    const word = words[i];
    if (word.length >= 4 && !STOPWORDS.has(word) && !INTENT_VOCABULARY.has(word) && !/\d/.test(word)) {
      const max = word.length >= 8 ? 2 : 1;
      const close = index.fuzzy.find((item) => levenshtein(word, item.token, max) <= max);
      if (close) {
        matches.push({ ids: [close.id], generic: false, start: i, length: 1 });
        consumed[i] = true;
      }
    }
  }
  let kept = matches;
  if (matches.some((match) => !match.generic)) {
    kept = matches.filter((match) => !match.generic);
    for (const match of matches.filter((item) => item.generic)) {
      for (let k = 0; k < match.length; k += 1) consumed[match.start + k] = false;
    }
  }
  const serviceIds = [...new Set(kept.flatMap((match) => match.ids))];

  // «¿qué VPN hay?»: si sólo hubo alias genéricos y esa palabra nombra una categoría, gana la categoría.
  const onlyGeneric = kept.length > 0 && kept.every((match) => match.generic);
  const genericPositions = new Set(onlyGeneric ? kept.flatMap((match) => Array.from({ length: match.length }, (_, k) => match.start + k)) : []);
  let categoryId: CategoryId | null = null;
  for (let i = 0; i < words.length && !categoryId; i += 1) {
    if (consumed[i] && !genericPositions.has(i)) continue;
    const candidates = index.categories.get(words[i]) ?? [];
    const hit = candidates.find((phrase) => phrase.tokens.every((token, offset) => words[i + offset] === token && (!consumed[i + offset] || genericPositions.has(i + offset))));
    if (hit) {
      categoryId = hit.id;
      for (let k = 0; k < hit.tokens.length; k += 1) consumed[i + k] = true;
    }
  }
  if (categoryId && onlyGeneric) return { serviceIds: [], categoryId, consumed };
  return { serviceIds, categoryId, consumed };
}

export function parse(raw: string, index: EntityIndex, context: ChatContext): Parsed {
  const text = normalize(raw);
  const words = text ? text.split(' ') : [];
  const { serviceIds: found, categoryId, consumed } = matchEntities(words, index);
  const hits = new Set(INTENT_WORDS.filter(([, re]) => re.test(text)).map(([name]) => name));
  const serviceNumbers = new Set(words.filter((word, i) => consumed[i] && /^\d+$/.test(word)));
  const amount = parseAmount(raw, serviceNumbers, hits.has('calc'));
  const feature = FEATURES.find(([, re]) => re.test(text))?.[0] ?? null;
  const months = /\b(anual(es)?|por ano|al ano)\b/.test(text) ? 12 : /\bmensual(es)?\b/.test(text) ? 1 : null;
  const dollarKind = /\bblue\b/.test(text) ? 'BLUE' : /\bmep\b/.test(text) ? 'BOLSA' : /\bccl\b/.test(text) ? 'CCL' : /\btarjeta\b/.test(text) ? 'TARJETA' : /\boficial\b/.test(text) ? 'OFICIAL' : /\bcripto\b/.test(text) ? 'CRIPTO' : null;
  const leftover = words.filter((word, i) => !consumed[i] && !STOPWORDS.has(word) && !INTENT_VOCABULARY.has(word));

  // Un seguimiento corto («¿y Spotify?», «¿y cómo lo cancelo?») hereda lo que falte de la pregunta anterior.
  const wantsComparison = hits.has('comparar');
  const refersBack = /^y\b/.test(text) || /\b(lo|eso|ese|esa|este|esta|ahi|alli|con)\b/.test(text) || words.length <= 3;
  const followUp = found.length === 0 && !categoryId && !amount && !hits.has('dolar') && context.serviceIds.length > 0 && refersBack
    && ([...hits].some((hit) => INHERITABLE.has(hit)) || feature !== null);
  let serviceIds = found;
  if (followUp) {
    serviceIds = context.serviceIds.slice(0, wantsComparison ? 4 : 1);
  } else if (found.length > 0 && wantsComparison && found.length === 1 && context.serviceIds.length > 0 && !context.serviceIds.includes(found[0])) {
    serviceIds = [context.serviceIds[0], found[0]];
  }
  const inherited = found.length > 0 && hits.size === 0 && !feature && !amount && !categoryId && leftover.length <= 1 ? context.intent : null;

  let intent: Intent;
  if (amount && !(hits.has('dolar') && !hits.has('calc') && amount.currency === 'ARS' && !hits.has('impuestos'))) intent = 'calcular';
  else if (hits.has('cancelar')) intent = 'cancelar';
  else if (hits.has('pagar_menos')) intent = 'pagar_menos';
  else if (serviceIds.length >= 2) intent = 'comparar';
  else if (hits.has('dolar') && serviceIds.length === 0) intent = 'dolar';
  else if (feature && serviceIds.length > 0) intent = 'caracteristica';
  else if (hits.has('impuestos')) intent = 'impuestos';
  else if (hits.has('plan_mas_barato')) intent = serviceIds.length > 0 ? 'plan_mas_barato' : 'categoria';
  else if (hits.has('planes') && serviceIds.length > 0) intent = 'planes';
  else if (hits.has('precio') && serviceIds.length > 0) intent = 'precio';
  else if (categoryId) intent = 'categoria';
  else if (inherited && INHERITED_INTENTS.has(inherited)) intent = inherited;
  else if (serviceIds.length > 0) intent = 'precio';
  else if (hits.has('greet') || hits.has('thanks')) intent = 'saludo';
  else if (hits.has('ayuda')) intent = 'ayuda';
  else intent = 'busqueda';

  return { intent, serviceIds, categoryId, amount, feature, months, dollarKind, leftover };
}
