import type { Asset } from '@/features/assets/api/assetApi';
import { formatLocationLabel } from '@/shared/ui/formatLocation';
import type { ServiceRequest } from '../api/contractApi';

export type ContractRole = 'CUSTOMER' | 'MANAGER';

export function extractContractErrorText(
  error: unknown,
  fallback = 'Unable to complete this action.',
): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } })
      .response;
    const detail = response?.data?.detail ?? response?.data?.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getEffectiveRequestStatus(request: ServiceRequest): ServiceRequest['status'] {
  if (
    request.status === 'OPEN' &&
    request.occurrences.some(
      (occurrence) =>
        occurrence.status === 'ASSIGNED' || (occurrence.status as string) === 'COMPLETED',
    )
  ) {
    return 'ASSIGNED';
  }
  return request.status;
}

export function statusTone(
  status: ServiceRequest['status'],
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'QUOTED':
      return 'warning';
    case 'ACCEPTED':
    case 'CONTRACT_SIGNED':
      return 'info';
    case 'ASSIGNED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export function getStatusLabel(
  status: ServiceRequest['status'],
  t: (key: string) => string,
): string {
  switch (status) {
    case 'OPEN':
      return t('Open');
    case 'QUOTED':
      return t('Quoted');
    case 'ACCEPTED':
      return t('Accepted');
    case 'CONTRACT_SIGNED':
      return t('Contract Signed');
    case 'ASSIGNED':
      return t('Assigned');
    case 'CANCELLED':
      return t('Cancelled');
    default:
      return '';
  }
}

/** SRS §3.5.1 four-step lifecycle progress subtitle. */
export function getRequestStageSubtitle(
  status: ServiceRequest['status'],
  role: ContractRole,
  t: (key: string) => string,
  hasOccurrences = false,
): string {
  switch (status) {
    case 'OPEN':
      return `${t('Step')} 1/4 · ${t(role === 'MANAGER' ? 'Request review' : 'Request submitted')}`;
    case 'QUOTED':
      return `${t('Step')} 2/4 · ${t('Quote review')}`;
    case 'ACCEPTED':
      return `${t('Step')} 3/4 · ${t('Acceptance recorded')}`;
    case 'CONTRACT_SIGNED':
      return hasOccurrences
        ? `${t('Step')} 4/4 · ${t(role === 'MANAGER' ? 'Assign team' : 'Preparing schedule')}`
        : `${t('Step')} 3/4 · ${t('Signed contract')}`;
    case 'ASSIGNED':
      return `${t('Step')} 4/4 · ${t('Scheduled')}`;
    case 'CANCELLED':
      return '';
    default:
      return '';
  }
}

export function formatFlightTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export function formatFlightWindow(
  start?: string | null,
  end?: string | null,
  t?: (key: string) => string,
): string {
  const s = formatFlightTime(start) || '08:00';
  const e = formatFlightTime(end) || '17:00';
  const prefix = t ? t('Flight window') : 'Flight window';
  return `${prefix}: ${s} – ${e}`;
}

/** Compact time range for dense cards and tables that already have a Schedule label. */
export function formatFlightTimeRange(
  start?: string | null,
  end?: string | null,
): string {
  const s = formatFlightTime(start) || '08:00';
  const e = formatFlightTime(end) || '17:00';
  return `${s} – ${e}`;
}

export function formatRecurrenceUnit(
  unit: string | null | undefined,
  locale: string,
): string {
  if (!unit) return '';
  const lower = unit.toLowerCase();
  if (locale === 'vi') {
    if (lower === 'month') return 'tháng';
    if (lower === 'week') return 'tuần';
    if (lower === 'day') return 'ngày';
    if (lower === 'year') return 'năm';
  }
  return lower;
}

export function formatVndPerOccurrence(
  amount: number | string | null | undefined,
  locale: string,
): string {
  const numeric = Number(amount ?? 0);
  return `${numeric.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND / ${locale === 'vi' ? 'đợt' : 'occurrence'}`;
}

export function resolveCurrentQuote(request: ServiceRequest): ServiceRequest['currentQuote'] {
  const legacyQuotes = (request as { quotes?: ServiceRequest['currentQuote'][] }).quotes;
  return request.currentQuote ?? legacyQuotes?.[0] ?? null;
}

export function isQuoteAccepted(request: ServiceRequest): boolean {
  const currentQuote = resolveCurrentQuote(request);
  const legacyAcceptedVersion = (request as { acceptedQuoteVersion?: number | null })
    .acceptedQuoteVersion;
  return (
    (currentQuote?.id != null && request.acceptedQuoteId === currentQuote.id) ||
    request.acceptedQuoteId != null ||
    legacyAcceptedVersion != null
  );
}

export function resolveActiveStepIndex(status: string, hasOccurrences = false): number {
  switch (status) {
    case 'OPEN':
      return 0;
    case 'QUOTED':
      return 1;
    case 'ACCEPTED':
      return 2;
    case 'CONTRACT_SIGNED':
      return hasOccurrences ? 3 : 2;
    case 'ASSIGNED':
      return 3;
    default:
      return 0;
  }
}

export function resolveAssetDisplay(request: ServiceRequest, asset?: Asset | null) {
  const rawLocation = asset?.locationText || request.assetLocationText || null;
  const requestCheckpoints = (request.inspectionItems ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const assetSuggestedCheckpoints = (asset?.inspectionItems ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  const hasRequestCheckpoints = requestCheckpoints.length > 0;
  const checkpointLabels = hasRequestCheckpoints ? requestCheckpoints : assetSuggestedCheckpoints;
  const checkpointsSource: 'REQUEST' | 'ASSET_SUGGESTED' = hasRequestCheckpoints
    ? 'REQUEST'
    : 'ASSET_SUGGESTED';
  return {
    name: asset?.name || request.assetName || '—',
    code: asset?.code || request.assetCode || null,
    location: rawLocation ? formatLocationLabel(rawLocation) : null,
    status: asset?.status || null,
    checkpointCount:
      hasRequestCheckpoints || asset?.inspectionItems ? checkpointLabels.length : null,
    checkpointLabels,
    checkpointsSource,
    heightMeters: asset?.structureHeightMeters ?? null,
    footprintAreaSquareMeters: asset?.footprintAreaSquareMeters ?? null,
  };
}

export function formatRequestScheduleSummary(
  request: ServiceRequest,
  formatDate: (date: Date) => string,
  locale: string,
  t: (key: string) => string,
): string {
  const startLabel = formatDate(new Date(`${request.requestedFrom}T00:00:00`));
  const endLabel = request.requestedUntil
    ? formatDate(new Date(`${request.requestedUntil}T00:00:00`))
    : startLabel;
  const datePart =
    request.requestType === 'ONE_TIME' || !request.requestedUntil || request.requestedUntil === request.requestedFrom
      ? startLabel
      : `${startLabel} – ${endLabel}`;
  const timePart = formatFlightTimeRange(request.windowStart, request.windowEnd);
  if (request.requestType !== 'RECURRING') {
    return `${datePart} · ${timePart}`;
  }
  const count = request.occurrenceCount ?? request.occurrences.length;
  const countPart = count > 0 ? ` · ${count} ${locale === 'vi' ? 'đợt' : t('occurrences')}` : '';
  return `${datePart} · ${timePart}${countPart}`;
}

export function formatQuotedPriceSummary(
  request: ServiceRequest,
  locale: string,
): string | null {
  const quote = resolveCurrentQuote(request);
  if (!quote) return null;
  const unitPrice = Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd ?? 0);
  const base = formatVndPerOccurrence(unitPrice, locale);
  if (request.requestType !== 'RECURRING') {
    return base;
  }
  const count = request.occurrenceCount ?? request.occurrences.length;
  if (!count || count <= 1) return base;
  const total = (unitPrice * count).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  return `${base} (${count} ${locale === 'vi' ? 'đợt' : 'occurrences'} · ${total} VND)`;
}

export function summarizeDispatchProgress(
  request: ServiceRequest,
  locale: string,
  t: (key: string) => string,
  fallbackDrones?: Array<{ id: string; model?: string | null; serialNumber?: string | null }>,
): string {
  const occurrences = request.occurrences ?? [];
  const activeOccurrences = occurrences.filter((occ) => occ.status !== 'CANCELLED');
  const assignedOccurrences = activeOccurrences.filter(
    (occ) => occ.status === 'ASSIGNED' || Boolean(occ.inspectorId) || Boolean(occ.droneId),
  );
  if (assignedOccurrences.length === 0) {
    return t('Not dispatched yet');
  }
  const primary = assignedOccurrences[0];
  if (!primary) {
    return t('Not dispatched yet');
  }
  let droneLabel = primary.droneLabel?.trim() || '';
  if (!droneLabel && primary.droneId && fallbackDrones?.length) {
    const matched = fallbackDrones.find((d) => d.id === primary.droneId);
    if (matched) {
      droneLabel = [matched.model, matched.serialNumber].filter(Boolean).join(' · ');
    }
  }
  const partnerLabel = [primary.inspectorName?.trim(), droneLabel].filter(Boolean).join(' · ');

  if (request.requestType === 'RECURRING' && activeOccurrences.length > 1) {
    const progress =
      locale === 'vi'
        ? `${assignedOccurrences.length}/${activeOccurrences.length} đợt đã gán`
        : `${assignedOccurrences.length}/${activeOccurrences.length} ${t('occurrences assigned')}`;
    return partnerLabel ? `${progress} · ${partnerLabel}` : progress;
  }

  return partnerLabel || t('Assigned');
}
