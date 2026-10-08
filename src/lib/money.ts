/** Integer minor units (centavos). Half-up, away from zero on a tie. */

export type Currency = 'ARS' | 'USD';

export interface ParseResult {
  ok: true;
  minor: number;
}

export interface ParseError {
  ok: false;
  message: string;
}

export function divHalfUp(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
    throw new Error('La división monetaria pide enteros y un divisor distinto de cero.');
  }
  const sign = numerator < 0 ? -1 : 1;
  const an = Math.abs(numerator);
  const ad = Math.abs(denominator);
  return sign * Math.floor((an + Math.floor(ad / 2)) / ad);
}

export function formatMinor(minor: number, currency: Currency): string {
  const value = minor / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'USD' ? 'code' : 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMinorPlain(minor: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/**
 * Reads an es-AR amount. `1.234,56` is 1234.56. A lone dot with exactly
 * three digits (`4.499`) is a thousands separator. `1,234.56` is rejected.
 */
export function parseLocalAmount(raw: string): ParseResult | ParseError {
  const trimmed = raw.trim().replace(/\s/g, '').replace(/\$/g, '');
  if (!trimmed) return { ok: false, message: 'Ingresá un importe.' };
  if (/[eE]|infinity|nan/i.test(trimmed)) {
    return { ok: false, message: 'Ese importe no es un número válido.' };
  }
  if (trimmed.startsWith('-')) {
    return { ok: false, message: 'El importe no puede ser negativo.' };
  }
  if (!/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(trimmed) && !/^\d+(,\d{1,2})?$/.test(trimmed) && !/^\d+\.\d{1,2}$/.test(trimmed)) {
    return {
      ok: false,
      message: 'Usá el formato 1.234,56. No leemos 1,234.56 como pesos.',
    };
  }

  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes(',')) {
    normalized = trimmed.replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = trimmed;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, message: 'Ese importe no es un número válido.' };
  }
  const minor = divHalfUp(Math.round(value * 10000), 100);
  if (minor < 0) return { ok: false, message: 'El importe no puede ser negativo.' };
  return { ok: true, minor };
}

export interface Rational {
  n: number;
  d: number;
}

export function addRational(a: Rational, b: Rational): Rational {
  return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
}

export function zeroRational(): Rational {
  return { n: 0, d: 1 };
}
