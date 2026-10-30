import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <ContractsPage />
    </QueryClientProvider>,
  );
}

describe('ContractsPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['ORG_MANAGER'],
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
          acceptedQuoteVersion: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          quotes: [],
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
    expect(screen.getAllByText('Crack check')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeTruthy();
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
          acceptedQuoteVersion: 1,
          contractFileName: 'signed-contract.pdf',
          contractContentType: 'application/pdf',
          contractSizeBytes: 1024,
          contractUploadedAt: '2026-10-30T00:00:00Z',
          createdAt: '2026-10-29T00:00:00Z',
          quotes: [],
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
    expect(screen.getByText(/Signed scan recorded: signed-contract.pdf/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download signed contract' })).toBeTruthy();
  });

  it('allows manager to issue a quote and view partner resources', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['PLATFORM_MANAGER'],
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
          acceptedQuoteVersion: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          quotes: [],
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
    expect(screen.getByText('Issue quote version')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Issue new quote version' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByLabelText('Partner Inspector'));
    fireEvent.click(screen.getByRole('option', { name: /Partner Alice/ }));
    fireEvent.mouseDown(screen.getByLabelText('Partner drone'));
    expect(screen.getByRole('option', { name: /DRONE-001/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /DRONE-002/ })).toBeNull();
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

  it('allows customer to accept the latest quote version when status is QUOTED', () => {
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
          acceptedQuoteVersion: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-10-29T00:00:00Z',
          quotes: [
            {
              id: 'quote-2',
              versionNo: 2,
              scopeSnapshot: 'Revised scope',
              firstOccurrenceStartAt: '2026-11-02T01:00:00Z',
              firstOccurrenceEndAt: '2026-11-02T03:00:00Z',
              inspectorId: 'insp-1',
              droneId: 'drone-1',
              pricePerOccurrenceUsd: 150,
              issuedByUserId: 'mgr-1',
              createdAt: '2026-10-29T02:00:00Z',
            },
            {
              id: 'quote-1',
              versionNo: 1,
              scopeSnapshot: 'Original scope',
              firstOccurrenceStartAt: '2026-11-02T01:00:00Z',
              firstOccurrenceEndAt: '2026-11-02T03:00:00Z',
              inspectorId: 'insp-1',
              droneId: 'drone-1',
              pricePerOccurrenceUsd: 200,
              issuedByUserId: 'mgr-1',
              createdAt: '2026-10-29T01:00:00Z',
            },
          ],
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
    expect(screen.getByText('Version 2 · Latest')).toBeTruthy();
    const acceptBtn = screen.getByRole('button', { name: 'Accept latest quote' });
    expect(acceptBtn).toBeTruthy();
    fireEvent.click(acceptBtn);
    expect(mutateAsync).toHaveBeenCalledWith(2);
  });

  it('allows manager to assign an occurrence filtering drones by the selected inspector', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['PLATFORM_MANAGER'],
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
          acceptedQuoteVersion: 1,
          contractFileName: 'signed.pdf',
          contractContentType: 'application/pdf',
          contractSizeBytes: 1024,
          contractUploadedAt: '2026-10-30T00:00:00Z',
          createdAt: '2026-10-29T00:00:00Z',
          quotes: [],
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
