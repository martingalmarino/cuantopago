const DAY_MS = 24 * 60 * 60 * 1000;
const ZONE = '-03:00';

export function parseLocalDate(isoDate: string): number {
  return Date.parse(`${isoDate}T12:00:00${ZONE}`);
}

export function isStale(verifiedAt: string | null, windowAmount: number, unit: 'days' | 'hours', asOf: string): boolean {
  if (!verifiedAt) return false;
  const verified = Date.parse(`${verifiedAt}T12:00:00${ZONE}`);
  const now = parseLocalDate(asOf);
  if (Number.isNaN(verified) || Number.isNaN(now)) return false;
  const windowMs = unit === 'hours' ? windowAmount * 60 * 60 * 1000 : windowAmount * DAY_MS;
  return now - verified >= windowMs;
}

export function ruleIsActive(effectiveFrom: string, effectiveTo: string | null, asOf: string): boolean {
  if (asOf < effectiveFrom) return false;
  if (effectiveTo && asOf > effectiveTo) return false;
  return true;
}
