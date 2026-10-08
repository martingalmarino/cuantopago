import { divHalfUp } from './money';
import { isStale, ruleIsActive } from './freshness';
import type { CalculationInput, CalculationLine, CalculationResult, TaxRule } from './types';

const PERCEPTION_MISSING =
  'La percepción del 30% de la RG 5617 no se suma: hace falta saber si el pago en pesos accede al mercado de cambios y si el prestador está fuera de la nómina de exclusión de la RG 5677.';

function emptyResult(partial: Pick<CalculationResult, 'status' | 'periodMonths'> & Partial<CalculationResult>): CalculationResult {
  return {
    status: partial.status,
    simulated: partial.simulated ?? false,
    currency: partial.currency ?? null,
    periodTotalMinor: partial.periodTotalMinor ?? null,
    periodMonths: partial.periodMonths,
    monthly: partial.monthly ?? null,
    lines: partial.lines ?? [],
    assumptions: partial.assumptions ?? [],
    missing: partial.missing ?? [],
    sources: partial.sources ?? [],
    priceVerifiedAt: partial.priceVerifiedAt ?? null,
    taxRuleVerifiedAt: partial.taxRuleVerifiedAt ?? null,
    fxVerifiedAt: partial.fxVerifiedAt ?? null,
    fxLabel: partial.fxLabel ?? null,
    stalePrice: partial.stalePrice ?? false,
    staleTax: partial.staleTax ?? false,
    staleFx: partial.staleFx ?? false,
    warnings: partial.warnings ?? [],
  };
}

export function monthlyEquivalent(total: number | null, months: number, days: number | null | undefined): CalculationResult['monthly'] {
  if (total === null) return null;
  if (days && days > 0) return { n: total * 365, d: days * 12 };
  if (months < 1) return null;
  return { n: total, d: months };
}

const DAY_ASSUMPTION = 'El equivalente mensual anualiza el ciclo con 365 días y 12 meses. No es el importe de cada renovación, y 30 días no se toman como un mes calendario.';

function flagsResolve(rule: TaxRule, flags: CalculationInput['flags']): 'match' | 'reject' | 'unknown' {
  if (rule.requiresFlags.length === 0) return 'match';
  let unknown = false;
  for (const flag of rule.requiresFlags) {
    const value = flags[flag];
    if (value === false) return 'reject';
    if (value !== true) unknown = true;
  }
  if (unknown) return 'unknown';
  return 'match';
}

function pickGroup(rules: TaxRule[]): TaxRule[] {
  const groups = new Map<string, TaxRule[]>();
  const singles: TaxRule[] = [];
  for (const rule of rules) {
    if (!rule.exclusiveGroup) {
      singles.push(rule);
      continue;
    }
    const list = groups.get(rule.exclusiveGroup) ?? [];
    list.push(rule);
    groups.set(rule.exclusiveGroup, list);
  }
  const picked: TaxRule[] = [...singles];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => b.priority - a.priority || b.effectiveFrom.localeCompare(a.effectiveFrom));
    const winner = sorted[0];
    if (winner) picked.push(winner);
  }
  return picked;
}

export function calculate(input: CalculationInput): CalculationResult {
  const months = input.userReportedMonths ?? input.billingPeriodMonths;
  const days = input.billingIntervalDays ?? null;
  const sources = input.priceSourceUrl ? [{ label: 'Precio', url: input.priceSourceUrl }] : [];

  if (input.userReportedFinalMinor !== null) {
    if (!Number.isInteger(input.userReportedFinalMinor) || input.userReportedFinalMinor < 0) {
      return emptyResult({
        status: 'unavailable',
        periodMonths: months,
        missing: ['El importe que indicaste no es válido.'],
      });
    }
    return emptyResult({
      status: 'user-reported',
      currency: 'ARS',
      periodTotalMinor: input.userReportedFinalMinor,
      periodMonths: months,
      periodDays: days,
      monthly: monthlyEquivalent(input.userReportedFinalMinor, months, days),
      assumptions: days ? ['Usamos el importe final que cargaste, sin recalcular impuestos.', DAY_ASSUMPTION] : ['Usamos el importe final que cargaste, sin recalcular impuestos.'],
      lines: [
        {
          id: 'user-reported',
          label: 'Lo que te cobraron',
          kind: 'base',
          amountMinor: input.userReportedFinalMinor,
          currency: 'ARS',
          note: 'Importe final informado por vos. No se le vuelven a sumar impuestos.',
        },
      ],
      priceVerifiedAt: input.priceVerifiedAt,
    });
  }

  if (input.amountMinor === null || input.currency === null || input.billingPeriodMonths < 1) {
    return emptyResult({
      status: 'unavailable',
      periodMonths: Math.max(input.billingPeriodMonths, 1),
      missing: ['No hay un precio publicado verificado para este plan.'],
      priceVerifiedAt: input.priceVerifiedAt,
      sources,
    });
  }

  const lines: CalculationLine[] = [];
  const missing: string[] = [];
  const assumptions: string[] = [];
  if (days && days > 0) assumptions.push(DAY_ASSUMPTION);
  const warnings: string[] = [];
  let simulated = false;
  let arsBase: number | null = null;
  let fxLabel: string | null = null;
  let fxVerifiedAt: string | null = null;
  const stalePrice = isStale(input.priceVerifiedAt, 30, 'days', input.asOf);
  let staleFx = false;

  if (input.currency === 'ARS') {
    arsBase = input.amountMinor;
    lines.push({
      id: 'base',
      label: 'Precio publicado',
      kind: 'base',
      amountMinor: input.amountMinor,
      currency: 'ARS',
      note: null,
    });
  } else if (input.fxArsPerUsdMinor === null) {
    lines.push({
      id: 'base-usd',
      label: 'Precio publicado',
      kind: 'base',
      amountMinor: input.amountMinor,
      currency: 'USD',
      note: 'Sigue en dólares porque no hay un tipo de cambio para pasarlo a pesos.',
    });
    missing.push('Falta un tipo de cambio para estimar el total en pesos.');
  } else {
    if (!Number.isInteger(input.fxArsPerUsdMinor) || input.fxArsPerUsdMinor <= 0) {
      return emptyResult({
        status: 'unavailable',
        periodMonths: input.billingPeriodMonths,
        missing: ['El tipo de cambio ingresado no es válido.'],
      });
    }
    arsBase = divHalfUp(input.amountMinor * input.fxArsPerUsdMinor, 100);
    simulated = input.fxSource !== 'snapshot';
    fxLabel = input.fxSource === 'user' ? 'Tipo de cambio ingresado por vos' : 'Tipo de cambio de la cotización guardada';
    fxVerifiedAt = input.fxVerifiedAt;
    staleFx = input.fxSource === 'snapshot' && isStale(input.fxVerifiedAt, 24, 'hours', input.asOf);
    lines.push({
      id: 'base-usd',
      label: 'Precio publicado',
      kind: 'base',
      amountMinor: input.amountMinor,
      currency: 'USD',
      note: null,
    });
    lines.push({
      id: 'fx',
      label: fxLabel,
      kind: 'conversion',
      amountMinor: arsBase,
      currency: 'ARS',
      note: 'Conversión del precio publicado. No es una cotización de un banco.',
    });
    assumptions.push(
      input.fxSource === 'user'
        ? 'La conversión usa el tipo de cambio que ingresaste, no una cotización en vivo.'
        : 'La conversión usa la cotización guardada en los datos del sitio.',
    );
  }

  if (stalePrice) warnings.push('El precio publicado superó los 30 días desde la última verificación.');
  if (staleFx) warnings.push('La referencia de tipo de cambio superó las 24 horas.');

  const activeRules = input.rules.filter(
    (rule) => input.ruleIds.includes(rule.id) && ruleIsActive(rule.effectiveFrom, rule.effectiveTo, input.asOf),
  );
  let staleTax = false;
  let taxVerified: string | null = null;

  if (input.taxInclusion === 'unknown') {
    missing.push('No está confirmado si el precio publicado ya incluye impuestos.');
  }
  if (input.otherChargesNoted) {
    missing.push('La fuente advierte otros cargos del banco o de la provincia, sin una tasa única verificada.');
  }

  const applicable: TaxRule[] = [];
  for (const rule of activeRules) {
    if (rule.inclusion === 'add-when-excluded') {
      if (input.taxInclusion === 'included') {
        lines.push({
          id: `included-${rule.id}`,
          label: rule.label,
          kind: 'included',
          amountMinor: null,
          currency: 'ARS',
          note: 'Ya está incluido en el precio publicado. No se suma de nuevo.',
        });
        continue;
      }
      if (input.taxInclusion !== 'excluded') continue;
      applicable.push(rule);
      continue;
    }
    const flagState = flagsResolve(rule, input.flags);
    if (flagState === 'reject') continue;
    if (flagState === 'unknown' && rule.unresolvedIfFlagsUnknown) {
      lines.push({
        id: `unresolved-${rule.id}`,
        label: rule.label,
        kind: 'unresolved',
        amountMinor: null,
        currency: 'ARS',
        note: rule.note,
      });
      missing.push(PERCEPTION_MISSING);
      continue;
    }
    if (flagState === 'match') applicable.push(rule);
  }

  const chosen = pickGroup(applicable);
  let added = 0;
  for (const rule of chosen) {
    sources.push({ label: rule.label, url: rule.sourceUrl });
    if (taxVerified === null || rule.verifiedAt < taxVerified) taxVerified = rule.verifiedAt;
    if (isStale(rule.verifiedAt, rule.freshnessDays, 'days', input.asOf)) {
      staleTax = true;
      warnings.push(`La regla «${rule.label}» está marcada para revisión.`);
    }
    if (arsBase === null) {
      missing.push(`No se puede calcular ${rule.label} sin un importe en pesos.`);
      continue;
    }
    if (rule.rateBasisPoints === null && rule.fixedAmountMinor === null) {
      lines.push({
        id: `unresolved-rate-${rule.id}`,
        label: rule.label,
        kind: 'unresolved',
        amountMinor: null,
        currency: 'ARS',
        note: 'La regla está identificada, pero no tiene una tasa verificada. No se toma como cero.',
      });
      missing.push(`${rule.label} no tiene una tasa verificada.`);
      continue;
    }
    const charge =
      rule.fixedAmountMinor !== null
        ? rule.fixedAmountMinor
        : divHalfUp(arsBase * (rule.rateBasisPoints ?? 0), 10000);
    added += charge;
    lines.push({
      id: `added-${rule.id}`,
      label: rule.label,
      kind: 'added',
      amountMinor: charge,
      currency: 'ARS',
      note: rule.note,
    });
    assumptions.push(rule.note);
  }

  const periodTotalMinor = arsBase === null ? null : arsBase + added;
  const missingUnique = [...new Set(missing)];
  if (input.manual) simulated = true;
  let status: CalculationResult['status'] = 'complete';
  if (periodTotalMinor === null && lines.every((line) => line.amountMinor === null)) status = 'unavailable';
  else if (missingUnique.length > 0 || stalePrice || staleTax || staleFx || simulated) status = 'partial';

  return emptyResult({
    status,
    simulated,
    currency: periodTotalMinor === null ? input.currency : 'ARS',
    periodTotalMinor,
    periodMonths: input.billingPeriodMonths,
    periodDays: days,
    monthly: monthlyEquivalent(periodTotalMinor, input.billingPeriodMonths, days),
    lines,
    assumptions,
    missing: missingUnique,
    sources,
    priceVerifiedAt: input.priceVerifiedAt,
    taxRuleVerifiedAt: taxVerified,
    fxVerifiedAt,
    fxLabel,
    stalePrice,
    staleTax,
    staleFx,
    warnings,
  });
}

export function monthlyMinorDisplay(result: CalculationResult): number | null {
  if (!result.monthly) return null;
  return divHalfUp(result.monthly.n, result.monthly.d);
}
