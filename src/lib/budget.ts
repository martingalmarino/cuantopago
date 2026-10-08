import { addRational, divHalfUp, zeroRational, type Rational } from './money';
import { serviceById } from './catalog';
import type { BudgetEntry, BudgetState, CalculationResult, CategoryId, PlanRecord } from './types';

export interface CategoryTotal {
  category: CategoryId | 'otro';
  monthly: Rational;
  unresolved: number;
}

export interface BudgetTotals {
  status: 'complete' | 'partial' | 'empty';
  knownMonthly: Rational;
  knownMonthlyDisplayMinor: number;
  projectionDisplayMinor: number;
  unresolvedCount: number;
  enabledCount: number;
  byCategory: CategoryTotal[];
}

function entryMonthly(entry: BudgetEntry): Rational | null {
  if (!entry.enabled) return null;
  if (entry.userReportedFinalMinor !== null) {
    if (entry.billingIntervalDays && entry.billingIntervalDays > 0) {
      return { n: entry.userReportedFinalMinor * 365, d: entry.billingIntervalDays * 12 };
    }
    const months = entry.billingIntervalMonths || entry.quote.periodMonths || 1;
    return { n: entry.userReportedFinalMinor, d: months };
  }
  if (entry.quote.monthly && entry.quote.periodTotalMinor !== null) return entry.quote.monthly;
  return null;
}

export function isUnresolved(entry: BudgetEntry): boolean {
  if (!entry.enabled) return false;
  if (entry.userReportedFinalMinor !== null) return false;
  return entry.quote.status === 'partial' || entry.quote.status === 'unavailable' || entry.quote.periodTotalMinor === null;
}

export function summarizeBudget(entries: BudgetEntry[]): BudgetTotals {
  const enabled = entries.filter((entry) => entry.enabled);
  if (enabled.length === 0) {
    return {
      status: 'empty',
      knownMonthly: zeroRational(),
      knownMonthlyDisplayMinor: 0,
      projectionDisplayMinor: 0,
      unresolvedCount: 0,
      enabledCount: 0,
      byCategory: [],
    };
  }

  let known = zeroRational();
  let unresolvedCount = 0;
  const categories = new Map<string, { monthly: Rational; unresolved: number }>();

  for (const entry of enabled) {
    const monthly = entryMonthly(entry);
    const unresolved = isUnresolved(entry);
    if (unresolved) unresolvedCount += 1;
    if (monthly) known = addRational(known, monthly);
    const bucket = categories.get(entry.category) ?? { monthly: zeroRational(), unresolved: 0 };
    if (monthly) bucket.monthly = addRational(bucket.monthly, monthly);
    if (unresolved) bucket.unresolved += 1;
    categories.set(entry.category, bucket);
  }

  const knownMonthlyDisplayMinor = divHalfUp(known.n, known.d);
  return {
    status: unresolvedCount > 0 ? 'partial' : 'complete',
    knownMonthly: known,
    knownMonthlyDisplayMinor,
    projectionDisplayMinor: divHalfUp(known.n * 12, known.d),
    unresolvedCount,
    enabledCount: enabled.length,
    byCategory: [...categories.entries()].map(([category, value]) => ({
      category: category as CategoryId | 'otro',
      monthly: value.monthly,
      unresolved: value.unresolved,
    })),
  };
}

export function cloneBudget(state: BudgetState): BudgetState {
  return structuredClone(state);
}

export function withEntryEnabled(state: BudgetState, entryId: string, enabled: boolean): BudgetState {
  const next = cloneBudget(state);
  const entry = next.entries.find((item) => item.id === entryId);
  if (entry) entry.enabled = enabled;
  return next;
}

export function withoutEntry(state: BudgetState, entryId: string): BudgetState {
  const next = cloneBudget(state);
  next.entries = next.entries.filter((item) => item.id !== entryId);
  return next;
}

export function savingsDelta(baseline: BudgetState, scenario: BudgetState): {
  baselineMinor: number;
  scenarioMinor: number;
  differenceMinor: number;
  definitive: boolean;
  unresolved: number;
} {
  const base = summarizeBudget(baseline.entries);
  const next = summarizeBudget(scenario.entries);
  const definitive = base.unresolvedCount === 0 && next.unresolvedCount === 0;
  return {
    baselineMinor: base.knownMonthlyDisplayMinor,
    scenarioMinor: next.knownMonthlyDisplayMinor,
    differenceMinor: base.knownMonthlyDisplayMinor - next.knownMonthlyDisplayMinor,
    definitive,
    unresolved: base.unresolvedCount + next.unresolvedCount,
  };
}

export function quoteChanged(entry: BudgetEntry, next: CalculationResult, revision: string): boolean {
  if (entry.userReportedFinalMinor !== null) return false;
  return entry.catalogRevision !== revision || entry.quote.priceVerifiedAt !== next.priceVerifiedAt;
}

export function overlapWarnings(entries: BudgetEntry[], plan: PlanRecord, choiceIds: string[] = []): string[] {
  const hinted = new Set((plan.entitlements ?? []).map((item) => item.serviceId).filter((id): id is string => Boolean(id)));
  for (const choiceId of choiceIds) {
    const option = (plan.choiceOptions ?? []).find((item) => item.id === choiceId);
    if (option?.serviceId) hinted.add(option.serviceId);
  }
  return entries
    .filter((entry) => entry.enabled && entry.serviceId && hinted.has(entry.serviceId))
    .map((entry) => {
      const name = serviceById(entry.serviceId ?? '')?.name ?? 'otro servicio';
      return `Ya tenés ${name} en el presupuesto. El paquete no lo borra ni lo pone en cero: los dos cargos siguen hasta que confirmes cuál te facturan.`;
    });
}

export function choicesAreValid(plan: PlanRecord, choiceIds: string[]): boolean {
  const slots = plan.choiceSlots ?? 0;
  if (slots === 0) return choiceIds.length === 0;
  const allowed = new Set((plan.choiceOptions ?? []).map((option) => option.id));
  const unique = [...new Set(choiceIds)];
  return unique.length === slots && unique.every((id) => allowed.has(id));
}

export function emptyBudget(): BudgetState {
  return { version: 1, monthlyBudgetMinor: null, entries: [] };
}
