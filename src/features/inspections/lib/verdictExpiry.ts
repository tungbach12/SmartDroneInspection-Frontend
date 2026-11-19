import type { ReinspectionVerificationItem } from '../api/inspectionApi';

export interface VerdictExpiry {
  /** RESOLVED verdicts whose validity window has already lapsed. */
  expired: ReinspectionVerificationItem[];
  /** RESOLVED verdicts that are valid but lapse within the near-term warning window. */
  expiringSoon: ReinspectionVerificationItem[];
  expiredCount: number;
}

/** A verdict inside this window is worth flagging before the report stage blocks it. */
export const VERDICT_SOON_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Splits the RESOLVED verdicts of a re-inspection into those that already lapsed and those about
 * to lapse. Only RESOLVED verdicts carry a validity window; the backend blocks report authoring,
 * submission and publication with `RESOLUTION_EXPIRED` for the expired ones.
 */
export function summarizeVerdictExpiry(
  items: ReinspectionVerificationItem[] | null | undefined,
  now: number = Date.now(),
): VerdictExpiry {
  const expired: ReinspectionVerificationItem[] = [];
  const expiringSoon: ReinspectionVerificationItem[] = [];
  for (const item of items ?? []) {
    if (item.resolutionStatus !== 'RESOLVED' || !item.validUntil) {
      continue;
    }
    const expiresAt = new Date(item.validUntil).getTime();
    if (Number.isNaN(expiresAt)) {
      continue;
    }
    if (expiresAt <= now) {
      expired.push(item);
      continue;
    }
    if (expiresAt - now <= VERDICT_SOON_WINDOW_MS) {
      expiringSoon.push(item);
    }
  }
  return { expired, expiringSoon, expiredCount: expired.length };
}
