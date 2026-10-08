import type { Currency, Rational } from './money';

export type TaxInclusion = 'included' | 'excluded' | 'unknown';
export type EstimateStatus = 'complete' | 'partial' | 'unavailable' | 'user-reported';
export type CategoryId =
  | 'series'
  | 'musica'
  | 'almacenamiento'
  | 'paquetes'
  | 'deportes'
  | 'tv-en-vivo'
  | 'productividad'
  | 'diseno'
  | 'inteligencia-artificial';
export type Channel = 'web-direct' | 'app-store' | 'google-play' | 'operator' | 'bundle';

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceRecord {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  officialUrl: string;
  logo: string | null;
  logoAltMode: 'decorative' | 'text-fallback';
  description: string;
  aliases: string[];
  overlapNote: string | null;
  sourceUrls: string[];
  verificationStatus: 'verified' | 'partial' | 'unverified';
  faqs: ServiceFaq[];
  tags?: string[];
  secondaryCategories?: CategoryId[];
  body?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface PlanEntitlement {
  serviceId: string | null;
  label: string;
  capacityGb: number | null;
}

export interface PlanChoice {
  id: string;
  label: string;
  serviceId: string | null;
}

export interface PlanPromotion {
  amountMinor: number;
  currency: Currency;
  durationCycles: number;
  note: string;
}

export interface PlanFeatures {
  ads: boolean | null;
  maxResolution: string | null;
  simultaneousPlayback: number | null;
  downloads: string | null;
  storage: string | null;
  memberLimit: number | null;
  eligibility: string | null;
}

export interface PlanRecord {
  id: string;
  serviceId: string;
  availableInArgentina: boolean | null;
  name: string;
  billingPeriodMonths: number;
  currency: Currency | null;
  amountMinor: number | null;
  taxInclusion: TaxInclusion;
  otherChargesNoted: boolean;
  taxRuleIds: string[];
  channel: Channel;
  features: PlanFeatures;
  sourceUrl: string | null;
  verifiedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  retired: boolean;
  notes: string | null;
  billingIntervalDays?: number | null;
  selectable?: boolean;
  promotion?: PlanPromotion | null;
  entitlements?: PlanEntitlement[];
  choiceSlots?: number;
  choiceOptions?: PlanChoice[];
}

export interface TaxRule {
  id: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  jurisdiction: string;
  chargeType: string;
  label: string;
  rateBasisPoints: number | null;
  fixedAmountMinor: number | null;
  inclusion: 'add-when-excluded' | 'add-when-flags-match';
  appliesToTaxInclusion: TaxInclusion[];
  requiresFlags: string[];
  unresolvedIfFlagsUnknown: boolean;
  exclusiveGroup: string | null;
  priority: number;
  sourceUrl: string;
  verifiedAt: string;
  freshnessDays: number;
  note: string;
}

export interface ExchangeSnapshot {
  id: string;
  pair: 'USDARS';
  arsPerUsdMinor: number | null;
  basis: string;
  sourceUrl: string;
  verifiedAt: string | null;
  freshnessHours: number;
}

export interface BrandAsset {
  serviceId: string;
  file: string | null;
  sourceUrl: string | null;
  retrievalDate: string | null;
  license: string | null;
  limitation: string | null;
}

export interface CalculationLine {
  id: string;
  label: string;
  kind: 'base' | 'included' | 'added' | 'conversion' | 'unresolved';
  amountMinor: number | null;
  currency: Currency | null;
  note: string | null;
}

export interface CalculationSource {
  label: string;
  url: string;
}

export interface CalculationResult {
  status: EstimateStatus;
  simulated: boolean;
  currency: Currency | null;
  periodTotalMinor: number | null;
  periodMonths: number;
  periodDays?: number | null;
  monthly: Rational | null;
  lines: CalculationLine[];
  assumptions: string[];
  missing: string[];
  sources: CalculationSource[];
  priceVerifiedAt: string | null;
  taxRuleVerifiedAt: string | null;
  fxVerifiedAt: string | null;
  fxLabel: string | null;
  stalePrice: boolean;
  staleTax: boolean;
  staleFx: boolean;
  warnings: string[];
}

export interface BudgetEntry {
  id: string;
  kind: 'catalog' | 'custom';
  serviceId: string | null;
  planId: string | null;
  customName: string | null;
  category: CategoryId | 'otro';
  quote: CalculationResult;
  catalogRevision: string;
  billingIntervalMonths: number;
  billingIntervalDays?: number | null;
  usePromotion?: boolean;
  choiceIds?: string[];
  enabled: boolean;
  userReportedFinalMinor: number | null;
  archived: boolean;
  addedAt: string;
}

export interface BudgetState {
  version: 1;
  monthlyBudgetMinor: number | null;
  entries: BudgetEntry[];
}

export interface CalculationInput {
  label: string;
  amountMinor: number | null;
  currency: Currency | null;
  billingPeriodMonths: number;
  billingIntervalDays?: number | null;
  taxInclusion: TaxInclusion;
  otherChargesNoted: boolean;
  ruleIds: string[];
  priceVerifiedAt: string | null;
  priceSourceUrl: string | null;
  rules: TaxRule[];
  asOf: string;
  fxArsPerUsdMinor: number | null;
  fxSource: 'user' | 'snapshot' | null;
  fxVerifiedAt: string | null;
  flags: Record<string, boolean | undefined>;
  userReportedFinalMinor: number | null;
  userReportedMonths: number | null;
  manual?: boolean;
}
