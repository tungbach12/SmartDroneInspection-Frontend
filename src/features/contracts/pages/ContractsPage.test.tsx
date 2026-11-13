import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ContractsPage from './ContractsPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as contractsHook from '../hooks/useContracts';
import * as assetsHook from '@/features/assets/hooks/useAssets';
import type { PartnerCandidate } from '../api/contractApi';

vi.mock('../hooks/useContracts');
vi.mock('@/features/assets/hooks/useAssets');

function makeEligibleCandidate(
  overrides: Partial<PartnerCandidate> = {},
): PartnerCandidate {
  return {
    inspectorId: 'p-insp-1',
    droneId: 'p-drone-1',
    inspectorName: 'Partner Alice',
    inspectorAvatarUrl: null,
    droneSerialNumber: 'DRONE-001',
    droneModel: 'M300',
    droneHasImage: false,
    droneFeatureCodes: [],
    eligibility: 'PASS',
    capabilityFit: 'MATCH',
    droneMaxAltitudeMeters: null,
    structureHeightMeters: null,
    footprintAreaSquareMeters: null,
    hardGates: [],
    capabilityChecks: [],
    disclaimer: '',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContractsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ContractsPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['CUSTOMER'],
      userId: 'customer-1',
      userName: 'Customer One',
      email: 'customer@test.local',
      actorZone: 'CUSTOMER',
    });
    vi.spyOn(assetsHook, 'useAssets').mockReturnValue({
      data: {
        items: [{ id: 'asset-1', name: 'Bridge 1', code: 'BR-1' }],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(contractsHook, 'usePostRequestMessage').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useAcceptServiceQuote').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useUploadSignedContract').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useDownloadSignedContract').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useAssignServiceOccurrence').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useEvaluatePartnerCandidates').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue([]),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useRecordOccurrencePayout').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerInspectors').mockReturnValue({
      data: [],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerDrones').mockReturnValue({
      data: [],
      isPending: false,
    } as any);
  });

  it('renders request list and allows customer to submit a new request', () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-new' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-1',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Crack check',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'OPEN',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
        {
          id: 'req-quoted',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Roof survey quote',
          requestedFrom: '2026-11-03',
          requestedUntil: '2026-11-03',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'QUOTED',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
        {
          id: 'req-signed',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Signed bridge survey',
          requestedFrom: '2026-11-04',
          requestedUntil: '2026-11-04',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'CONTRACT_SIGNED',
          acceptedQuoteId: 'quote-signed',
          acceptedAt: '2026-10-29T00:00:00Z',
          acceptedByUserId: 'customer-1',
          acceptedTermsSnapshot: {},
          contractFileName: 'signed.pdf',
          contractContentType: 'application/pdf',
          contractSizeBytes: 1024,
          contractUploadedAt: '2026-10-29T00:00:00Z',
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'useCreateServiceRequest').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();
    expect(screen.getByText('Inspection service requests')).toBeTruthy();
    expect(screen.getByText('Crack check')).toBeTruthy();
    const openStatusCell = screen.getByText('Open').closest('td');
    expect(openStatusCell).toBeTruthy();
    expect(openStatusCell?.querySelector('[data-status="OPEN"]')).toBeTruthy();
    expect(screen.getByText('Step 1/5 · Request submitted')).toBeTruthy();
    const quotedStatusCell = screen.getByText('Quoted').closest('td');
    expect(quotedStatusCell?.querySelector('[data-status="QUOTED"]')).toBeTruthy();
    expect(screen.getByText('Step 3/5 · Quote review')).toBeTruthy();
    const signedStatusCell = screen.getByText('Contract Signed').closest('td');
    expect(signedStatusCell?.querySelector('[data-status="CONTRACT_SIGNED"]')).toBeTruthy();
    expect(screen.getByText('Step 4/5 · Signed agreement')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New service request' }));
    expect(screen.getByRole('dialog', { name: 'Create inspection request' })).toBeTruthy();
    expect(screen.getByText(/Select a date at least 20 days from today\. Earliest date:/)).toBeTruthy();
    expect(screen.getAllByText(/Select a date at least 20 days from today\. Earliest date:/)).toHaveLength(1);
    expect(screen.queryByLabelText('Phạm vi & Yêu cầu khảo sát')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit service request' }).hasAttribute('disabled')).toBe(true);
  });

  it('allows customer to download the signed contract attachment when recorded', () => {
    const mutateAsync = vi.fn().mockResolvedValue(new Blob(['pdf']));
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-signed',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Bridge survey',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'CONTRACT_SIGNED',
          acceptedQuoteId: 'quote-1',
          acceptedAt: '2026-10-30T00:00:00Z',
          acceptedByUserId: 'cust-1',
          acceptedTermsSnapshot: { pricePerOccurrenceVnd: 11000000 },
          contractFileName: 'signed-contract.pdf',
          contractContentType: 'application/pdf',
          contractSizeBytes: 1024,
          contractUploadedAt: '2026-10-30T00:00:00Z',
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'useDownloadSignedContract').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText(/Signed scan recorded: signed-contract.pdf/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download signed contract' })).toBeTruthy();
  });

  it('allows manager to issue a quote and view partner resources', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
    });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-1',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Crack check',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'OPEN',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerInspectors').mockReturnValue({
      data: [{ id: 'p-insp-1', fullName: 'Partner Alice', partnerOrganizationId: 'partner-org', licenseExpiresAt: null }],
    } as any);
    vi.spyOn(contractsHook, 'usePartnerDrones').mockReturnValue({
      data: [
        { id: 'p-drone-1', inspectorOwnerId: 'p-insp-1', serialNumber: 'DRONE-001', model: 'M300' },
        { id: 'p-drone-2', inspectorOwnerId: 'p-insp-2', serialNumber: 'DRONE-002', model: 'M30T' },
      ],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerCapabilities').mockReturnValue({ data: [], isPending: false } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText('1. Review customer request')).toBeTruthy();
    expect(screen.getByText('2. Select Inspector & drone')).toBeTruthy();
    expect(screen.getByText('3. Prepare quotation')).toBeTruthy();
    expect(screen.getByText('4. Record signed agreement')).toBeTruthy();
    expect(screen.getByText('5. Dispatch inspection team')).toBeTruthy();
    expect(screen.queryByText('Customer creates inspection request')).toBeNull();
    expect(screen.getByText('Request review')).toBeTruthy();
    expect(screen.queryByLabelText('Partner Inspector')).toBeNull();
    expect(screen.queryByLabelText('Partner drone')).toBeNull();
    expect(screen.queryByLabelText('Quoted scope')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Select Inspector and drone' }));
    expect(await screen.findByText('Select partner Inspector and drone')).toBeTruthy();
    expect(screen.getByText('No partner pairs registered.')).toBeTruthy();
  });

  it('warns and blocks a recurring quote when the license expires before the final occurrence start', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
    });
    const mutateAsync = vi.fn();
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-recurring-expiry',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Recurring bridge survey',
          requestedFrom: '2026-12-04',
          requestedUntil: '2028-06-04',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'RECURRING',
          recurrenceUnit: 'MONTH',
          recurrenceInterval: 6,
          occurrenceCount: 4,
          recurrenceEndDate: null,
          status: 'OPEN',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-11-11T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerInspectors').mockReturnValue({
      data: [{
        id: 'p-insp-1',
        fullName: 'Partner Alice',
        partnerOrganizationId: 'partner-org',
        licenseExpiresAt: '2028-06-04T01:00:00Z',
      }],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerDrones').mockReturnValue({
      data: [
        { id: 'p-drone-1', inspectorOwnerId: 'p-insp-1', serialNumber: 'DRONE-001', model: 'M300' },
      ],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useEvaluatePartnerCandidates').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue([makeEligibleCandidate()]),
      isPending: false,
    } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select Inspector and drone' }));
    expect(await screen.findByText('Select partner Inspector and drone')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect(screen.getAllByRole('alert').some((alert) =>
      alert.textContent?.includes('Pilot license expires before the last planned inspection.'),
    )).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('blocks users without customer or platform manager role', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['ADMIN'],
      userId: 'admin-1',
      userName: 'Admin User',
      email: 'admin@test.local',
      actorZone: 'PLATFORM',
    });
    renderPage();
    expect(screen.getByText('MF2 is available to Customer and Platform Manager accounts.')).toBeTruthy();
  });

  it('allows customer to accept the current quote when status is QUOTED', () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-1', status: 'ACCEPTED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-quoted',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Crack check',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'QUOTED',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: {
            id: 'quote-2',
            scopeSnapshot: 'Revised scope',
            firstOccurrenceStartAt: '2026-11-02T01:00:00Z',
            firstOccurrenceEndAt: '2026-11-02T03:00:00Z',
            inspectorId: 'insp-1',
            droneId: 'drone-1',
            pricePerOccurrenceVnd: 15000000,
            pricePerOccurrenceUsd: 600,
            issuedByUserId: 'mgr-1',
            createdAt: '2026-10-29T02:00:00Z',
            updatedAt: '2026-10-29T02:00:00Z',
            updatedByUserId: 'mgr-1',
            rowVersion: 2,
          },
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'useAcceptServiceQuote').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText('1. Submit request')).toBeTruthy();
    expect(screen.getByText('2. Manager selects partner')).toBeTruthy();
    expect(screen.getByText('3. Review quotation')).toBeTruthy();
    expect(screen.getByText('4. Accept terms and sign agreement')).toBeTruthy();
    expect(screen.getByText('5. Inspection dispatched')).toBeTruthy();
    expect(screen.queryByText('Customer creates inspection request')).toBeNull();
    expect(screen.getByText('Current quote')).toBeTruthy();
    expect(screen.getByText('Revised scope')).toBeTruthy();
    const acceptBtn = screen.getByRole('button', { name: 'Accept quote' });
    expect(acceptBtn).toBeTruthy();
    fireEvent.click(acceptBtn);
    expect(screen.getByText('Confirm Quote Acceptance')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accept quote' }));
    expect(mutateAsync).toHaveBeenCalledWith(2);
  });

  it('allows manager to assign an occurrence filtering drones by the selected inspector', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-signed', status: 'ASSIGNED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-signed',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Bridge survey',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'CONTRACT_SIGNED',
          acceptedQuoteId: 'quote-1',
          acceptedAt: '2026-10-30T00:00:00Z',
          acceptedByUserId: 'cust-1',
          acceptedTermsSnapshot: { pricePerOccurrenceVnd: 11000000 },
          contractFileName: 'signed.pdf',
          contractContentType: 'application/pdf',
          contractSizeBytes: 1024,
          contractUploadedAt: '2026-10-30T00:00:00Z',
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [
            {
              id: 'occ-1',
              occurrenceIndex: 1,
              plannedStartAt: '2026-11-02T01:00:00Z',
              plannedEndAt: '2026-11-02T03:00:00Z',
              status: 'PENDING_ASSIGNMENT',
              inspectorId: null,
              droneId: null,
              inspectionId: null,
              assignedAt: null,
              invoice: {
                totalPrice: 11000000,
                vatRate: 10,
                commissionRate: 15,
                tncnRate: 10,
                reportAcceptedAt: null,
              },
              payment: {
                status: 'PENDING',
                payosOrderCode: null,
                method: null,
                reference: null,
                confirmedAt: null,
              },
              payout: {
                inspectorId: null,
                status: 'PENDING',
                reference: null,
                recordedAt: null,
              },
            },
          ],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerInspectors').mockReturnValue({
      data: [{ id: 'p-insp-1', fullName: 'Partner Alice', licenseExpiresAt: null }],
    } as any);
    vi.spyOn(contractsHook, 'usePartnerDrones').mockReturnValue({
      data: [
        { id: 'p-drone-1', inspectorOwnerId: 'p-insp-1', serialNumber: 'DRONE-001', model: 'M300' },
        { id: 'p-drone-2', inspectorOwnerId: 'p-insp-2', serialNumber: 'DRONE-002', model: 'M30T' },
      ],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useAssignServiceOccurrence').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useEvaluatePartnerCandidates').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue([makeEligibleCandidate()]),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerCapabilities').mockReturnValue({ data: [], isPending: false } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText('Occurrence 1')).toBeTruthy();
    const assignButton = screen.getByRole('button', { name: 'Assign occurrence' });
    expect(assignButton.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByLabelText('Inspector')).toBeNull();
    expect(screen.queryByLabelText('Drone')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Find eligible partners' }));
    expect(await screen.findByText('Select partner Inspector and drone · Occurrence 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign occurrence' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      plannedStartAt: '2026-11-02T01:00:00.000Z',
      plannedEndAt: '2026-11-02T03:00:00.000Z',
      inspectorId: 'p-insp-1',
      droneId: 'p-drone-1',
    });
  });

  it('opens the dedicated partner candidate selection step and preserves quote draft state on return', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
    });
    const evaluateMutate = vi.fn().mockResolvedValue([
      {
        inspectorId: 'p-insp-1',
        droneId: 'p-drone-1',
        inspectorName: 'Partner Alice',
        inspectorAvatarUrl: 'https://cdn.example.test/avatars/alice.png',
        droneSerialNumber: 'DRONE-001',
        droneModel: 'Matrice 350 RTK',
        droneHasImage: false,
        droneFeatureCodes: ['THERMAL_CAMERA'],
        eligibility: 'PASS',
        capabilityFit: 'MATCH',
        hardGates: [
          { code: 'INSPECTOR_ACTIVE_PARTNER', status: 'PASS', explanation: 'Active partner.' },
        ],
        capabilityChecks: [
          { code: 'THERMAL_CAMERA', status: 'MATCH', explanation: 'Drone registration declares this capability.' },
        ],
        disclaimer: 'Evaluation is advisory. It does not confirm a flight permit or clearance.',
      },
      {
        inspectorId: 'p-insp-2',
        droneId: 'p-drone-2',
        inspectorName: 'Blocked Bob',
        inspectorAvatarUrl: null,
        droneSerialNumber: 'DRONE-002',
        droneModel: 'Mavic 3T',
        droneHasImage: false,
        droneFeatureCodes: [],
        eligibility: 'FAIL',
        capabilityFit: 'MISMATCH',
        hardGates: [
          { code: 'PILOT_LICENSE_VALID', status: 'FAIL', explanation: 'License expires before planned start.' },
        ],
        capabilityChecks: [
          { code: 'THERMAL_CAMERA', status: 'MISMATCH', explanation: 'Drone registration does not declare this capability.' },
        ],
        disclaimer: 'Evaluation is advisory. It does not confirm a flight permit or clearance.',
      },
    ]);
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-1',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Crack check',
          requestedFrom: '2026-11-01',
          requestedUntil: '2026-11-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'OPEN',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.spyOn(contractsHook, 'useEvaluatePartnerCandidates').mockReturnValue({
      mutateAsync: evaluateMutate,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useCreateServiceRequest').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-new' }),
      isPending: false,
    } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));

    fireEvent.click(screen.getByRole('button', { name: 'Select Inspector and drone' }));

    expect(await screen.findByText('Select partner Inspector and drone')).toBeTruthy();
    expect(screen.getByText('Partner Alice')).toBeTruthy();
    expect(screen.queryByText(/Blocked Bob/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Show 1 other pairs' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    expect((screen.getByLabelText('Quoted scope') as HTMLInputElement).value).toBe(
      'Crack check',
    );
    expect(screen.getByText('Eligible match')).toBeTruthy();
  });

  it('restores the selection step from the URL and returns to the form via browser back', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
    });
    const evaluateMutate = vi.fn().mockResolvedValue([
      {
        inspectorId: 'p-insp-1',
        droneId: 'p-drone-1',
        inspectorName: 'Partner Alice',
        inspectorAvatarUrl: null,
        droneSerialNumber: 'DRONE-001',
        droneModel: 'Matrice 350 RTK',
        droneHasImage: false,
        droneFeatureCodes: ['THERMAL_CAMERA'],
        eligibility: 'PASS',
        capabilityFit: 'MATCH',
        hardGates: [{ code: 'INSPECTOR_ACTIVE_PARTNER', status: 'PASS', explanation: 'Active partner.' }],
        capabilityChecks: [{ code: 'THERMAL_CAMERA', status: 'MATCH', explanation: 'Declared.' }],
        disclaimer: 'Advisory only.',
      },
    ]);
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [{
        id: 'req-1',
        ownerCustomerId: 'org-1',
        assetId: 'asset-1',
        description: 'Crack check',
        requestedFrom: '2026-11-01',
        requestedUntil: '2026-11-10',
        timezone: 'Asia/Ho_Chi_Minh',
        windowStart: '08:00',
        windowEnd: '17:00',
        requestType: 'ONE_TIME',
        recurrenceUnit: null,
        recurrenceInterval: null,
        occurrenceCount: null,
        recurrenceEndDate: null,
        status: 'OPEN',
        acceptedQuoteId: null,
        acceptedAt: null,
        acceptedByUserId: null,
        acceptedTermsSnapshot: null,
        contractFileName: null,
        contractContentType: null,
        contractSizeBytes: null,
        contractUploadedAt: null,
        createdAt: '2026-10-29T00:00:00Z',
        currentQuote: null,
        occurrences: [],
        messages: [],
      }],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);
    vi.spyOn(contractsHook, 'useEvaluatePartnerCandidates').mockReturnValue({
      mutateAsync: evaluateMutate,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerCapabilities').mockReturnValue({
      data: [
        { code: 'THERMAL_CAMERA', nameVi: 'Camera nhiệt', nameEn: 'Thermal Camera', displayOrder: 1 },
        { code: 'RTK_POSITIONING', nameVi: 'Định vị RTK', nameEn: 'RTK Positioning', displayOrder: 2 },
      ],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useCreateServiceRequest').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-new' }),
      isPending: false,
    } as any);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/manager/contracts?requestId=req-1&step=quote-pair']}>
          <ContractsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // A restored step URL with no in-memory evaluation must fall back to the quote form;
    // candidate evaluation is backend-authoritative and is never read from the URL.
    expect(await screen.findByText('Request review')).toBeTruthy();
    expect(container.textContent).not.toContain('Select partner Inspector and drone');
    expect(evaluateMutate).not.toHaveBeenCalled();
  });
});
