import { describe, expect, it } from 'vitest';
import { calculate, monthlyMinorDisplay } from './calculation';
import { choicesAreValid, overlapWarnings, savingsDelta, summarizeBudget, withEntryEnabled } from './budget';
import { plans, quotePlan, services } from './catalog';
import type { BudgetEntry, BudgetState, CalculationInput, TaxRule } from './types';

/**
 * Fixtures sintéticos. No representan precios ni alícuotas vigentes en Argentina.
 */

function rule(overrides: Partial<TaxRule> & Pick<TaxRule, 'id'>): TaxRule {
  return {
    version: 'test',
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    jurisdiction: 'XX',
    chargeType: 'vat',
    label: 'Impuesto de prueba',
    rateBasisPoints: 1000,
    fixedAmountMinor: null,
    inclusion: 'add-when-excluded',
    appliesToTaxInclusion: ['excluded'],
    requiresFlags: [],
    unresolvedIfFlagsUnknown: false,
    exclusiveGroup: 'vat',
    priority: 1,
    sourceUrl: 'https://example.test/rule',
    verifiedAt: '2026-10-01',
    freshnessDays: 30,
    note: 'Regla sintética.',
    ...overrides,
  };
}

function input(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    label: 'Plan de prueba',
    amountMinor: 10000,
    currency: 'ARS',
    billingPeriodMonths: 1,
    taxInclusion: 'excluded',
    otherChargesNoted: false,
    ruleIds: ['vat'],
    priceVerifiedAt: '2026-10-01',
    priceSourceUrl: 'https://example.test/price',
    rules: [rule({ id: 'vat' })],
    asOf: '2026-10-08',
    fxArsPerUsdMinor: null,
    fxSource: null,
    fxVerifiedAt: null,
    flags: {},
    userReportedFinalMinor: null,
    userReportedMonths: null,
    ...overrides,
  };
}

function entry(overrides: Partial<BudgetEntry> = {}): BudgetEntry {
  const quote = calculate(input());
  return {
    id: 'e1',
    kind: 'catalog',
    serviceId: 'demo',
    planId: 'demo-plan',
    customName: null,
    category: 'series',
    quote,
    catalogRevision: 'test',
    billingIntervalMonths: 1,
    enabled: true,
    userReportedFinalMinor: null,
    archived: false,
    addedAt: '2026-10-08',
    ...overrides,
  };
}

describe('calculate', () => {
  it('no vuelve a sumar un impuesto ya incluido', () => {
    const result = calculate(input({ taxInclusion: 'included', amountMinor: 12100 }));
    expect(result.lines.some((line) => line.kind === 'added')).toBe(false);
    expect(result.lines.some((line) => line.kind === 'included')).toBe(true);
    expect(result.periodTotalMinor).toBe(12100);
  });

  it('separa la conversión de un precio en dólares del cargo en pesos', () => {
    const ars = calculate(input({ amountMinor: 10000, currency: 'ARS' }));
    const usd = calculate(
      input({
        amountMinor: 100,
        currency: 'USD',
        fxArsPerUsdMinor: 100000,
        fxSource: 'user',
        fxVerifiedAt: '2026-10-08',
        ruleIds: [],
        rules: [],
      }),
    );
    expect(ars.periodTotalMinor).toBe(11000);
    expect(usd.fxLabel).toBe('Tipo de cambio ingresado por vos');
    expect(usd.simulated).toBe(true);
    expect(usd.lines.find((line) => line.kind === 'conversion')?.amountMinor).toBe(100000);
    expect(usd.periodTotalMinor).not.toBe(ars.periodTotalMinor);
  });

  it('no trata una tasa desconocida o vencida como cero', () => {
    const unknown = calculate(
      input({
        rules: [rule({ id: 'vat', rateBasisPoints: null })],
      }),
    );
    expect(unknown.periodTotalMinor).toBe(10000);
    expect(unknown.status).toBe('partial');
    expect(unknown.missing.length).toBeGreaterThan(0);

    const stale = calculate(
      input({
        rules: [rule({ id: 'vat', verifiedAt: '2026-01-01', rateBasisPoints: 1000 })],
        asOf: '2026-10-08',
      }),
    );
    expect(stale.lines.find((line) => line.kind === 'added')?.amountMinor).toBe(1000);
    expect(stale.staleTax).toBe(true);
    expect(stale.status).toBe('partial');
  });

  it('elige una sola regla cuando se superponen y respeta la vigencia', () => {
    const overlap = calculate(
      input({
        ruleIds: ['old', 'new'],
        rules: [
          rule({ id: 'old', priority: 1, rateBasisPoints: 1000, exclusiveGroup: 'vat' }),
          rule({ id: 'new', priority: 2, rateBasisPoints: 2000, exclusiveGroup: 'vat' }),
        ],
      }),
    );
    const added = overlap.lines.filter((line) => line.kind === 'added');
    expect(added).toHaveLength(1);
    expect(added[0]?.amountMinor).toBe(2000);

    const before = calculate(
      input({
        asOf: '2019-12-31',
        rules: [rule({ id: 'vat', effectiveFrom: '2020-01-01', effectiveTo: '2020-06-30' })],
      }),
    );
    const lastDay = calculate(
      input({
        asOf: '2020-06-30',
        priceVerifiedAt: '2020-06-30',
        rules: [rule({ id: 'vat', effectiveFrom: '2020-01-01', effectiveTo: '2020-06-30', verifiedAt: '2020-06-30' })],
      }),
    );
    const after = calculate(
      input({
        asOf: '2020-07-01',
        rules: [rule({ id: 'vat', effectiveFrom: '2020-01-01', effectiveTo: '2020-06-30' })],
      }),
    );
    expect(before.lines.some((line) => line.kind === 'added')).toBe(false);
    expect(lastDay.lines.some((line) => line.kind === 'added')).toBe(true);
    expect(after.lines.some((line) => line.kind === 'added')).toBe(false);
  });

  it('no grava de nuevo un importe final informado', () => {
    const result = calculate(input({ userReportedFinalMinor: 5000, userReportedMonths: 1 }));
    expect(result.status).toBe('user-reported');
    expect(result.periodTotalMinor).toBe(5000);
    expect(result.lines.some((line) => line.kind === 'added')).toBe(false);
  });

  it('normaliza un plan anual al mes', () => {
    const result = calculate(input({ amountMinor: 12000, billingPeriodMonths: 12, ruleIds: [], rules: [] }));
    expect(monthlyMinorDisplay(result)).toBe(1000);
    expect(result.periodTotalMinor).toBe(12000);
  });
});

describe('presupuesto', () => {
  it('redondea el total una sola vez y marca parciales', () => {
    const annual = entry({
      id: 'a',
      quote: calculate(input({ amountMinor: 100, billingPeriodMonths: 12, ruleIds: [], rules: [], taxInclusion: 'included' })),
      billingIntervalMonths: 12,
    });
    const annualTwo = entry({
      id: 'b',
      quote: calculate(input({ amountMinor: 100, billingPeriodMonths: 12, ruleIds: [], rules: [], taxInclusion: 'included' })),
      billingIntervalMonths: 12,
    });
    const totals = summarizeBudget([annual, annualTwo]);
    expect(totals.knownMonthlyDisplayMinor).toBe(17);
    expect(totals.projectionDisplayMinor).toBe(divProjection(totals));

    const partial = entry({
      id: 'p',
      quote: calculate(input({ rules: [rule({ id: 'vat', rateBasisPoints: null })] })),
    });
    const mixed = summarizeBudget([partial]);
    expect(mixed.status).toBe('partial');
    expect(mixed.unresolvedCount).toBe(1);
    expect(mixed.knownMonthlyDisplayMinor).toBe(10000);
  });

  it('no afirma un ahorro cerrado si hay datos incompletos y no muta el escenario', () => {
    const baseline: BudgetState = {
      version: 1,
      monthlyBudgetMinor: null,
      entries: [entry({ quote: calculate(input({ rules: [rule({ id: 'vat', rateBasisPoints: null })] })) })],
    };
    const scenario = withEntryEnabled(baseline, 'e1', false);
    expect(baseline.entries[0]?.enabled).toBe(true);
    expect(scenario.entries[0]?.enabled).toBe(false);
    const delta = savingsDelta(baseline, scenario);
    expect(delta.definitive).toBe(false);
  });

  it('cierra el ahorro cuando el escenario queda en cero y no hay cargos pendientes', () => {
    const baseline: BudgetState = {
      version: 1,
      monthlyBudgetMinor: null,
      entries: [entry({ userReportedFinalMinor: 1200000, quote: calculate(input({ userReportedFinalMinor: 1200000 })) })],
    };
    const scenario = withEntryEnabled(baseline, 'e1', false);
    const delta = savingsDelta(baseline, scenario);
    expect(delta.definitive).toBe(true);
    expect(delta.baselineMinor).toBe(1200000);
    expect(delta.scenarioMinor).toBe(0);
    expect(delta.differenceMinor).toBe(1200000);
    expect(baseline.entries[0]?.enabled).toBe(true);
  });
});

describe('catálogo ampliado', () => {
  it('importa 22 servicios sin ids repetidos', () => {
    expect(services).toHaveLength(22);
    expect(new Set(services.map((service) => service.id)).size).toBe(22);
    expect(new Set(services.map((service) => service.slug)).size).toBe(22);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  it('cobra Flow+ una sola vez y exige exactamente dos elecciones', () => {
    const plan = plans.find((item) => item.id === 'flow-plus');
    if (!plan) throw new Error('falta flow-plus');
    const quote = quotePlan(plan, { asOf: '2026-10-08' });
    expect(quote.periodTotalMinor).toBe(8_748_000);
    expect(quote.lines.filter((line) => line.kind === 'base' || line.kind === 'added')).toHaveLength(1);
    expect(choicesAreValid(plan, ['netflix-premium', 'disney-plus-premium'])).toBe(true);
    expect(choicesAreValid(plan, ['netflix-premium', 'disney-plus-premium', 'hbo-pack'])).toBe(false);
    expect(choicesAreValid(plan, ['netflix-premium'])).toBe(false);
  });

  it('no anula un iCloud+ guardado cuando aparece Apple One', () => {
    const plan = plans.find((item) => item.id === 'apple-one-individual');
    if (!plan) throw new Error('falta apple one');
    const saved = [entry({ id: 'cloud', serviceId: 'icloud-plus', planId: 'icloud-2tb' })];
    const before = saved.map((item) => item.quote.periodTotalMinor);
    expect(overlapWarnings(saved, plan)).toHaveLength(1);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.quote.periodTotalMinor).toBe(before[0]);
    expect(saved[0]?.enabled).toBe(true);
  });

  it('muestra Microsoft Personal anual como 37.199 por año y 3.099,92 por mes, con impuesto sin resolver', () => {
    const plan = plans.find((item) => item.id === 'microsoft-365-personal-annual');
    if (!plan) throw new Error('falta el anual');
    const quote = quotePlan(plan, { asOf: '2026-10-08' });
    expect(plan.amountMinor).toBe(3_719_900);
    expect(quote.periodTotalMinor).toBe(3_719_900);
    expect(monthlyMinorDisplay(quote)).toBe(309_992);
    expect(quote.status).toBe('partial');
    expect(plan.taxInclusion).toBe('unknown');
    expect(plan.taxRuleIds).toEqual([]);
  });

  it('anualiza un ciclo sintético de 30 días y no publica ese importe', () => {
    const result = calculate(input({
      amountMinor: 300_000,
      billingPeriodMonths: 1,
      billingIntervalDays: 30,
      taxInclusion: 'included',
      ruleIds: [],
      rules: [],
    }));
    expect(monthlyMinorDisplay(result)).toBe(304_167);
    expect(result.assumptions.some((line) => line.includes('365'))).toBe(true);
    expect(plans.some((plan) => plan.amountMinor === 300_000 || plan.amountMinor === 3000)).toBe(false);
  });

  it('no convierte un precio nulo en cero ni guarda el USD 20 de ChatGPT como tarifa argentina', () => {
    const meli = plans.find((plan) => plan.id === 'meli-plus-esencial');
    expect(meli?.amountMinor).toBeNull();
    expect(meli?.amountMinor).not.toBe(0);
    expect(plans.some((plan) => plan.serviceId === 'chatgpt')).toBe(false);
    expect(plans.some((plan) => plan.currency === 'USD' && plan.amountMinor === 2000)).toBe(false);
  });

  it('no grava de nuevo un importe final de la persona', () => {
    const result = calculate(input({ userReportedFinalMinor: 1_200_000, taxInclusion: 'excluded', ruleIds: ['vat'] }));
    expect(result.periodTotalMinor).toBe(1_200_000);
    expect(result.lines.some((line) => line.kind === 'added')).toBe(false);
  });
});

function divProjection(totals: { knownMonthly: { n: number; d: number }; projectionDisplayMinor: number }): number {
  expect(totals.projectionDisplayMinor).toBe(200);
  return totals.projectionDisplayMinor;
}
