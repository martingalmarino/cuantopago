import { catalogMeta, serviceById } from './catalog';
import type { BudgetEntry, CalculationResult, CategoryId, PlanRecord } from './types';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function catalogEntry(
  plan: PlanRecord,
  quote: CalculationResult,
  extra: { usePromotion?: boolean; choiceIds?: string[] } = {},
): BudgetEntry {
  const service = serviceById(plan.serviceId);
  return {
    id: newId(),
    kind: 'catalog',
    serviceId: plan.serviceId,
    planId: plan.id,
    customName: null,
    category: service?.category ?? 'otro',
    quote,
    catalogRevision: catalogMeta.revision,
    billingIntervalMonths: plan.billingPeriodMonths,
    billingIntervalDays: plan.billingIntervalDays ?? null,
    usePromotion: extra.usePromotion ?? false,
    choiceIds: extra.choiceIds ?? [],
    enabled: true,
    userReportedFinalMinor: null,
    archived: plan.retired,
    addedAt: new Date().toISOString(),
  };
}

export function customEntry(input: {
  name: string;
  category: CategoryId | 'otro';
  quote: CalculationResult;
  months: number;
  userReportedFinalMinor: number | null;
}): BudgetEntry {
  return {
    id: newId(),
    kind: 'custom',
    serviceId: null,
    planId: null,
    customName: input.name,
    category: input.category,
    quote: input.quote,
    catalogRevision: catalogMeta.revision,
    billingIntervalMonths: input.months,
    enabled: true,
    userReportedFinalMinor: input.userReportedFinalMinor,
    archived: false,
    addedAt: new Date().toISOString(),
  };
}
