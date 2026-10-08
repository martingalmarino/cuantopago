export interface QuoteChange {
  amount: number;
  percent: number;
  referenceValue: number;
}

export interface DollarQuote {
  currency: string;
  name: string;
  origin: string;
  buy: number;
  sell: number;
  updatedAt: string;
  change: QuoteChange | null;
}

const ENDPOINT = 'https://monedapi.ar/api/v2/usd';
const TTL_MS = 5 * 60 * 1000;

const order = ['BLUE', 'OFICIAL', 'TARJETA', 'FUTURO', 'CRIPTO', 'BOLSA', 'CCL', 'MAYORISTA', 'BNA'];

export const quoteShortName: Record<string, string> = {
  BLUE: 'Blue',
  OFICIAL: 'Oficial',
  TARJETA: 'Tarjeta',
  FUTURO: 'Futuro',
  CRIPTO: 'Cripto',
  BOLSA: 'MEP',
  CCL: 'CCL',
  MAYORISTA: 'Mayorista',
  BNA: 'Banco Nación',
};

let cached: { at: number; quotes: DollarQuote[] } | null = null;
let inflight: Promise<DollarQuote[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function readQuote(value: unknown): DollarQuote | null {
  if (!isRecord(value)) return null;
  if (typeof value.sell !== 'number' || typeof value.buy !== 'number') return null;
  if (typeof value.origin !== 'string' || typeof value.name !== 'string') return null;
  const change = isRecord(value.change) && typeof value.change.percent === 'number'
    ? {
        amount: typeof value.change.amount === 'number' ? value.change.amount : 0,
        percent: value.change.percent,
        referenceValue: typeof value.change.referenceValue === 'number' ? value.change.referenceValue : value.sell,
      }
    : null;
  return {
    currency: typeof value.currency === 'string' ? value.currency : 'USD',
    name: value.name,
    origin: value.origin,
    buy: value.buy,
    sell: value.sell,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    change,
  };
}

export function sortQuotes(quotes: DollarQuote[]): DollarQuote[] {
  return [...quotes].sort((a, b) => {
    const left = order.indexOf(a.origin);
    const right = order.indexOf(b.origin);
    return (left === -1 ? order.length : left) - (right === -1 ? order.length : right);
  });
}

export function formatQuote(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChange(percent: number): string {
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(percent);
  return `${formatted} %`;
}

export function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export async function loadQuotes(): Promise<DollarQuote[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.quotes;
  if (!inflight) {
    inflight = fetch(ENDPOINT)
      .then(async (response) => {
        if (!response.ok) throw new Error('quotes');
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error('quotes');
        const quotes = sortQuotes(payload.map(readQuote).filter((item): item is DollarQuote => item !== null));
        if (quotes.length === 0) throw new Error('quotes');
        cached = { at: Date.now(), quotes };
        return quotes;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
