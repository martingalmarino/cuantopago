import { describe, expect, it } from 'vitest';
import { divHalfUp, parseLocalAmount } from './money';

describe('parseLocalAmount', () => {
  it('lee miles argentinos y decimales', () => {
    expect(parseLocalAmount('1.234,56')).toEqual({ ok: true, minor: 123456 });
    expect(parseLocalAmount('4.499')).toEqual({ ok: true, minor: 449900 });
    expect(parseLocalAmount('10,50')).toEqual({ ok: true, minor: 1050 });
    expect(parseLocalAmount('10.5')).toEqual({ ok: true, minor: 1050 });
  });

  it('rechaza formato mixto, negativos y no finitos', () => {
    expect(parseLocalAmount('1,234.56').ok).toBe(false);
    expect(parseLocalAmount('-10').ok).toBe(false);
    expect(parseLocalAmount('Infinity').ok).toBe(false);
    expect(parseLocalAmount('NaN').ok).toBe(false);
    expect(parseLocalAmount('').ok).toBe(false);
    expect(parseLocalAmount('1.2.3').ok).toBe(false);
  });
});

describe('divHalfUp', () => {
  it('redondea el medio hacia arriba', () => {
    expect(divHalfUp(1, 2)).toBe(1);
    expect(divHalfUp(200, 12)).toBe(17);
    expect(divHalfUp(24, 12)).toBe(2);
  });
});
