import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ContractsPage from './ContractsPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as contractsHook from '../hooks/useContracts';
import * as assetsHook from '@/features/assets/hooks/useAssets';

vi.mock('../hooks/useContracts');
vi.mock('@/features/assets/hooks/useAssets');

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
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
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
          organizationId: 'org-1',
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
          organizationId: 'org-1',
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
          organizationId: 'org-1',
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
    expect(screen.getByText('Step 1/4 · In progress')).toBeTruthy();
    const quotedStatusCell = screen.getByText('Quoted').closest('td');
    expect(quotedStatusCell?.querySelector('[data-status="QUOTED"]')).toBeTruthy();
    expect(screen.getByText('Step 2/4 · Quote review')).toBeTruthy();
    const signedStatusCell = screen.getByText('Contract Signed').closest('td');
    expect(signedStatusCell?.querySelector('[data-status="CONTRACT_SIGNED"]')).toBeTruthy();
    expect(screen.getByText('Step 3/4 · Signed contract')).toBeTruthy();
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
          organizationId: 'org-1',
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

  it('allows manager to issue a quote and view partner resources', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
      organizationId: null,
    });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-1',
          organizationId: 'org-1',
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

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText('1. Review customer request')).toBeTruthy();
    expect(screen.getByText('2. Prepare & discuss quote')).toBeTruthy();
    expect(screen.getByText('3. Record signed contract')).toBeTruthy();
    expect(screen.getByText('4. Assign inspection team')).toBeTruthy();
    expect(screen.queryByText('Customer creates inspection request')).toBeNull();
    expect(screen.getByText('Create quote')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save quote' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByLabelText('Partner Inspector'));
    fireEvent.click(screen.getByRole('option', { name: /Partner Alice/ }));
    fireEvent.mouseDown(screen.getByLabelText('Partner drone'));
    expect(screen.getByRole('option', { name: /DRONE-001/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /DRONE-002/ })).toBeNull();
  });

  it('warns and blocks a recurring quote when the license expires before the final occurrence start', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
      organizationId: null,
    });
    const mutateAsync = vi.fn();
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-recurring-expiry',
          organizationId: 'org-1',
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

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    fireEvent.mouseDown(screen.getByLabelText('Partner Inspector'));
    fireEvent.click(screen.getByRole('option', { name: /Partner Alice/ }));
    fireEvent.mouseDown(screen.getByLabelText('Partner drone'));
    fireEvent.click(screen.getByRole('option', { name: /DRONE-001/ }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Pilot license expires before the last planned inspection.',
    );
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
      organizationId: null,
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
          organizationId: 'org-1',
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
    expect(screen.getByText('1. Request submitted')).toBeTruthy();
    expect(screen.getByText('2. Review manager quote')).toBeTruthy();
    expect(screen.getByText('3. Accept terms & sign contract')).toBeTruthy();
    expect(screen.getByText('4. Inspection scheduled')).toBeTruthy();
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

  it('allows manager to assign an occurrence filtering drones by the selected inspector', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
      actorZone: 'PLATFORM',
      organizationId: null,
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-signed', status: 'ASSIGNED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-signed',
          organizationId: 'org-1',
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

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Track progress' }));
    expect(screen.getByText('Occurrence 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign occurrence' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByLabelText('Inspector'));
    fireEvent.click(screen.getByRole('option', { name: 'Partner Alice' }));
    fireEvent.mouseDown(screen.getByLabelText('Drone'));
    expect(screen.getByRole('option', { name: /DRONE-001/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /DRONE-002/ })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /DRONE-001/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign occurrence' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      plannedStartAt: '2026-11-02T01:00:00.000Z',
      plannedEndAt: '2026-11-02T03:00:00.000Z',
      inspectorId: 'p-insp-1',
      droneId: 'p-drone-1',
    });
  });
});
