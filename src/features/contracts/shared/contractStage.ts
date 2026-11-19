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
