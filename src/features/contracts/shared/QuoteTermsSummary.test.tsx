import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ServiceRequest, ServiceRequestQuote } from '../api/contractApi';
import { QuoteTermsSummary } from './QuoteTermsSummary';

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({ t: (key: string) => key, locale: 'en' }),
}));

function recurringRequest(): ServiceRequest {
  return {
    id: 'req-1',
    ownerCustomerId: 'customer-1',
    assetId: 'asset-1',
    description: 'Bridge survey',
    requestedFrom: '2027-02-01',
    requestedUntil: '2027-04-01',
    timezone: 'UTC',
    windowStart: '08:00',
    windowEnd: '17:00',
    requestType: 'RECURRING',
    recurrenceUnit: 'MONTH',
    recurrenceInterval: 1,
    occurrenceCount: null,
    recurrenceEndDate: '2027-04-01',
    status: 'QUOTED',
    acceptedQuoteId: null,
    acceptedAt: null,
    acceptedByUserId: null,
    acceptedTermsSnapshot: null,
    contractFileName: null,
    contractContentType: null,
    contractSizeBytes: null,
    contractUploadedAt: null,
    createdAt: '2026-12-01T00:00:00Z',
    currentQuote: null,
    assignedManagerId: 'manager-1',
    occurrences: [],
    messages: [],
    sourceInspectionId: null,
  } as unknown as ServiceRequest;
}

function laterQuote(): ServiceRequestQuote {
  return {
    id: 'quote-1',
    scopeSnapshot: 'Bridge scope',
    firstOccurrenceStartAt: '2027-03-01T08:00:00Z',
    firstOccurrenceEndAt: '2027-03-01T10:00:00Z',
    pricePerOccurrenceVnd: 11000000,
    pricePerOccurrenceUsd: null,
    requiredDroneFeatureCodes: [],
    issuedByUserId: 'manager-1',
    rowVersion: 1,
  } as unknown as ServiceRequestQuote;
}

describe('QuoteTermsSummary', () => {
  it('recounts an end-date recurring quote from the proposed first date', () => {
    render(<QuoteTermsSummary request={recurringRequest()} quote={laterQuote()} />);

    expect(screen.getByText(/2 occurrences/)).toBeTruthy();
  });
});
