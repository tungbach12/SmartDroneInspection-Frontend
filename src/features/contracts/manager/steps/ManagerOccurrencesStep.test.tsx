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

  it('lets the manager open Cancel flight without a restricted-airspace banner', () => {
    const req = assignedRequest();
    req.occurrences[0] = {
      ...req.occurrences[0]!,
      assignmentStatus: 'PENDING_ACCEPTANCE',
    };
    renderOccurrencesStep(req);

    expect(screen.queryByText(/Restricted airspace:/i)).toBeNull();
    expect(screen.queryByText(/max ceiling|120\s*m/i)).toBeNull();
    const cancelBtn = screen.getByRole('button', { name: 'Cancel flight' });
    fireEvent.click(cancelBtn);
    expect(screen.getByText('Cancel scheduled flight?')).toBeTruthy();
  });

  it('renders Cancelled status and locks assignment and cancel controls on cancelled occurrences', () => {
    const req = assignedRequest();
    req.status = 'CONTRACT_SIGNED';
    req.occurrences[0] = {
      ...req.occurrences[0]!,
      status: 'CANCELLED',
    };
    renderOccurrencesStep(req);

    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.getByText('This scheduled flight has been cancelled.')).toBeTruthy();
    expect(screen.queryByText('Unassigned')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Find eligible partners' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Assign occurrence' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel flight' })).toBeNull();
  });

  it('keeps schedule fields collapsed by default and opens locked-date time editing via Adjust schedule for ONE_TIME', () => {
    const req = assignedRequest();
    req.status = 'CONTRACT_SIGNED';
    req.occurrences[0] = {
      ...req.occurrences[0]!,
      status: 'PENDING_ASSIGNMENT',
      inspectorId: null,
      droneId: null,
      inspectionId: null,
    };
    renderOccurrencesStep(req);

    expect(screen.queryByLabelText('Start time')).toBeNull();
    expect(screen.queryByLabelText('Flight start')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Adjust schedule' }));

    const dateInput = screen.getByLabelText('Flight date') as HTMLInputElement;
    expect(dateInput.readOnly).toBe(true);
    expect(dateInput.value).toBe('2026-12-01');
    expect(screen.getByText(/Contract window: 08:00–17:00/)).toBeTruthy();

    const startTimeInput = screen.getByLabelText('Start time') as HTMLInputElement;
    fireEvent.change(startTimeInput, { target: { value: '09:00' } });
    expect(screen.getByText('Adjusted')).toBeTruthy();

    fireEvent.change(startTimeInput, { target: { value: '07:00' } });
    expect(screen.getByText(/Must stay within contracted hours \(08:00–17:00\)/)).toBeTruthy();
    const findBtn = screen.getByRole('button', { name: 'Find eligible partners' }) as HTMLButtonElement;
    expect(findBtn.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText('Adjusted')).toBeNull();
    expect(findBtn.disabled).toBe(false);
  });
});
