import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServiceRequest } from '../../api/contractApi';
import { ManagerOccurrencesStep } from './ManagerOccurrencesStep';

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({ t: (key: string) => key, locale: 'en' }),
}));
vi.mock('../../hooks/useContracts', () => ({
  useAssignServiceOccurrence: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignRemainingOccurrences: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelServiceOccurrence: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEvaluatePartnerCandidates: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePartnerInspectors: () => ({ data: [], isPending: false }),
  usePartnerDrones: () => ({ data: [], isPending: false }),
  usePartnerCapabilities: () => ({ data: [], isPending: false }),
}));
vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAsset: () => ({
    data: {
      id: 'asset-1',
      latitude: 10.7789,
      longitude: 106.7082,
      structureHeightMeters: 45,
    },
    isPending: false,
  }),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: () => null,
}));
vi.mock('../../shared/ContractFileBanner', () => ({
  ContractFileBanner: () => null,
}));
vi.mock('../components/OccurrenceFinanceDrawer', () => ({
  OccurrenceFinanceDrawer: () => null,
}));
vi.mock('../../components/PartnerCandidateResults', () => ({
  PartnerCandidateResults: () => null,
  isSelectablePartnerCandidate: () => false,
  getInspectorInitials: () => 'P',
}));

function assignedRequest(): ServiceRequest {
  return {
    id: 'req-1',
    ownerCustomerId: 'org-1',
    assetId: 'asset-1',
    description: 'Bridge survey',
    requestedFrom: '2026-12-01',
    requestedUntil: '2026-12-01',
    timezone: 'Asia/Ho_Chi_Minh',
    windowStart: '08:00',
    windowEnd: '17:00',
    requestType: 'ONE_TIME',
    recurrenceUnit: null,
    recurrenceInterval: null,
    occurrenceCount: null,
    recurrenceEndDate: null,
    status: 'ASSIGNED',
    acceptedQuoteId: 'quote-1',
    acceptedAt: '2026-11-20T00:00:00Z',
    acceptedByUserId: 'customer-1',
    acceptedTermsSnapshot: {},
    contractFileName: 'signed-contract.pdf',
    contractContentType: 'application/pdf',
    contractSizeBytes: 1024,
    contractUploadedAt: '2026-11-20T00:00:00Z',
    createdAt: '2026-11-19T00:00:00Z',
    currentQuote: null,
    assignedManagerId: 'manager-1',
    managerAssignedAt: '2026-11-19T00:00:00Z',
    managerAssignedByUserId: 'manager-1',
    serviceManager: null,
    occurrences: [
      {
        id: 'occ-1',
        occurrenceIndex: 1,
        plannedStartAt: '2026-12-01T01:00:00Z',
        plannedEndAt: '2026-12-01T03:00:00Z',
        status: 'ASSIGNED',
        inspectorId: 'inspector-1',
        droneId: 'drone-1',
        inspectionId: 'inspection-1',
        assignedAt: '2026-11-20T00:00:00Z',
        invoice: {
          totalPrice: 11000000,
          vatRate: 10,
          commissionRate: 15,
          tncnRate: 10,
          reportAcceptedAt: null,
        },
        payment: {
          status: 'PENDING',
          gatewayOrderCode: null,
          method: null,
          reference: null,
          confirmedAt: null,
        },
        payout: {
          inspectorId: 'inspector-1',
          status: 'PENDING',
          reference: null,
          recordedAt: null,
        },
      },
    ],
    messages: [],
    sourceInspectionId: null,
    canClaim: false,
  } as unknown as ServiceRequest;
}

function renderOccurrencesStep(req: ServiceRequest) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ManagerOccurrencesStep request={req} onChanged={vi.fn()} onError={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ManagerOccurrencesStep', () => {
  afterEach(() => cleanup());

  it('opens the inspection review at step 1 (field audit), not step 2', () => {
    renderOccurrencesStep(assignedRequest());

    const link = screen.getByRole('link', { name: 'Open review' });
    expect(link.getAttribute('href')).toBe('/manager/inspections/inspection-1/audit');
  });

  it('shows restricted airspace banner and lets manager open Cancel flight on pending occurrence', () => {
    const req = assignedRequest();
    req.occurrences[0] = {
      ...req.occurrences[0]!,
      assignmentStatus: 'PENDING_ACCEPTANCE',
    };
    renderOccurrencesStep(req);

    expect(screen.getByText(/Restricted airspace: Hành Lang An Toàn Hàng Không/i)).toBeTruthy();
    expect(screen.queryByText(/max ceiling|120\s*m/i)).toBeNull();
    const cancelBtn = screen.getByRole('button', { name: 'Cancel flight' });
    fireEvent.click(cancelBtn);
    expect(screen.getByText('Cancel scheduled flight?')).toBeTruthy();
  });
});
