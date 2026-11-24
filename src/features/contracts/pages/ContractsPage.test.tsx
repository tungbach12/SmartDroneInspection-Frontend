import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ContractsPage from './ContractsPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as contractsHook from '../hooks/useContracts';
import * as assetsHook from '@/features/assets/hooks/useAssets';
import * as assetDocumentsHook from '@/features/assets/hooks/useAssetDocuments';
import * as catalogHook from '@/features/assets/hooks/useCatalog';
import { mf1ReviewApi } from '@/features/admin/api/mf1ReviewApi';
import { inspectorProfileApi } from '@/features/admin/api/inspectorProfileApi';
import type { PartnerCandidate } from '../api/contractApi';

vi.mock('../hooks/useContracts');
vi.mock('@/features/assets/hooks/useAssets');
vi.mock('@/features/assets/hooks/useAssetDocuments');
vi.mock('@/features/assets/hooks/useCatalog');

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

function openTrackProgress() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Track progress' }));
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
    vi.spyOn(assetsHook, 'useAsset').mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        inspectionItems: [],
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(assetDocumentsHook, 'useAssetDocuments').mockReturnValue({
      data: [],
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
    vi.spyOn(contractsHook, 'useAssignRemainingOccurrences').mockReturnValue({
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
    vi.spyOn(contractsHook, 'usePartnerCapabilities').mockReturnValue({
      data: [],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useClaimServiceRequest').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-claim' }),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useAdminReassignServiceRequest').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-admin' }),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useAdminUnassignServiceRequest').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-admin' }),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useServiceManagers').mockReturnValue({
      data: [{ id: 'manager-1', fullName: 'Manager One', email: 'manager@example.test' }],
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useUpdateServiceRequestInspectionItems').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'req-1' }),
      isPending: false,
    } as any);
    vi.spyOn(catalogHook, 'useCategories').mockReturnValue({
      data: [],
      isPending: false,
    } as any);
    vi.spyOn(catalogHook, 'useChecklistTemplates').mockReturnValue({
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
          assignedManagerId: 'manager-1',
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
          assignedManagerId: 'manager-1',
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
          assignedManagerId: 'manager-1',
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
    const quotedStatusCell = screen.getByText('Quoted').closest('td');
    expect(quotedStatusCell?.querySelector('[data-status="QUOTED"]')).toBeTruthy();
    const signedStatusCell = screen.getByText('Contract Signed').closest('td');
    expect(signedStatusCell?.querySelector('[data-status="CONTRACT_SIGNED"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New service request' }));
    expect(screen.getByRole('dialog', { name: 'Create inspection request' })).toBeTruthy();
    expect(screen.getByText(/Select a date at least 20 days from today\. Earliest date:/)).toBeTruthy();
    expect(screen.getAllByText(/Select a date at least 20 days from today\. Earliest date:/)).toHaveLength(1);
    expect(screen.queryByLabelText('Phạm vi & Yêu cầu khảo sát')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit service request' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the assigned Manager profile to the owning Customer only', () => {
    const request = {
      id: 'req-profile',
      ownerCustomerId: 'org-1',
      assetId: 'asset-1',
      description: 'Assigned bridge inspection',
      requestedFrom: '2026-12-10',
      requestedUntil: '2026-12-10',
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
      createdAt: '2026-11-14T00:00:00Z',
      currentQuote: null,
      assignedManagerId: 'manager-1',
      serviceManager: {
        id: 'manager-1',
        fullName: 'Assigned Manager',
        email: 'assigned.manager@example.test',
        phoneNumber: '+84 901 234 567',
        avatarUrl: null,
      },
      occurrences: [],
      messages: [],
    };
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [request], isPending: false, isError: false, error: null, refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manager profile' }));
    expect(screen.getByRole('dialog', { name: 'Service manager profile' })).toBeTruthy();
    expect(screen.getByText('assigned.manager@example.test')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Call' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Assigned Manager',
      email: 'assigned.manager@example.test',
    });
    cleanup();
    renderPage();
    expect(screen.queryByRole('menuitem', { name: 'Manager profile' })).toBeNull();
  });

  it('lets a Manager claim an unassigned request from the action menu', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-claim' });
    vi.spyOn(contractsHook, 'useClaimServiceRequest').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [{
        id: 'req-claim', ownerCustomerId: 'org-1', assetId: 'asset-1',
        description: 'Claimable bridge inspection', requestedFrom: '2026-12-10',
        requestedUntil: '2026-12-10', timezone: 'Asia/Ho_Chi_Minh',
        windowStart: '08:00', windowEnd: '17:00', requestType: 'ONE_TIME',
        recurrenceUnit: null, recurrenceInterval: null, occurrenceCount: null,
        recurrenceEndDate: null, status: 'OPEN', acceptedQuoteId: null,
        acceptedAt: null, acceptedByUserId: null, acceptedTermsSnapshot: null,
        contractFileName: null, contractContentType: null, contractSizeBytes: null,
        contractUploadedAt: null, createdAt: '2026-11-14T00:00:00Z',
        currentQuote: null, assignedManagerId: null, canClaim: true,
        serviceManager: null, occurrences: [], messages: [],
      }],
      isPending: false, isError: false, error: null, refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockImplementation((requestId?: string) => ({
      data:
        requestId === 'req-claim'
          ? {
              id: 'req-claim', ownerCustomerId: 'org-1', assetId: 'asset-1',
              description: 'Claimable bridge inspection', requestedFrom: '2026-12-10',
              requestedUntil: '2026-12-10', timezone: 'Asia/Ho_Chi_Minh',
              windowStart: '08:00', windowEnd: '17:00', requestType: 'ONE_TIME',
              recurrenceUnit: null, recurrenceInterval: null, occurrenceCount: null,
              recurrenceEndDate: null, status: 'OPEN', acceptedQuoteId: null,
              acceptedAt: null, acceptedByUserId: null, acceptedTermsSnapshot: null,
              contractFileName: null, contractContentType: null, contractSizeBytes: null,
              contractUploadedAt: null, createdAt: '2026-11-14T00:00:00Z',
              currentQuote: null, assignedManagerId: 'manager-1', canClaim: false,
              serviceManager: null, occurrences: [], messages: [],
            }
          : undefined,
      isFetching: false,
    }) as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Claim request' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('req-claim'));
    await waitFor(() =>
      expect(
        screen.getByText(
          'You may move the first inspection later. The Customer must accept the revised quote before it takes effect.',
        ),
      ).toBeTruthy(),
    );
  });

  it('lets ADMIN assign a manager without opening Manager request details', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['ADMIN'],
      userId: 'admin-1',
      userName: 'Platform Admin',
      email: 'admin@test.local',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-admin' });
    vi.spyOn(contractsHook, 'useAdminReassignServiceRequest').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [{
        id: 'req-admin', ownerCustomerId: 'org-1', assetId: 'asset-1',
        description: 'Admin assignment bridge', requestedFrom: '2026-12-10',
        requestedUntil: '2026-12-10', timezone: 'Asia/Ho_Chi_Minh',
        windowStart: '08:00', windowEnd: '17:00', requestType: 'ONE_TIME',
        recurrenceUnit: null, recurrenceInterval: null, occurrenceCount: null,
        recurrenceEndDate: null, status: 'OPEN', acceptedQuoteId: null,
        acceptedAt: null, acceptedByUserId: null, acceptedTermsSnapshot: null,
        contractFileName: null, contractContentType: null, contractSizeBytes: null,
        contractUploadedAt: null, createdAt: '2026-11-14T00:00:00Z',
        currentQuote: null, assignedManagerId: null, canClaim: false,
        serviceManager: null, occurrences: [], messages: [],
      }],
      isPending: false, isError: false, error: null, refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);

    renderPage();
    fireEvent.click(screen.getByText('Admin assignment bridge'));
    expect(screen.queryByText('Review request')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Assign manager' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Service manager' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Manager One · manager@example.test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      requestId: 'req-admin', managerId: 'manager-1',
    }));
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
          assignedManagerId: 'manager-1',
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
    openTrackProgress();
    expect(screen.getByText('Signed scan recorded')).toBeTruthy();
    expect(screen.getByText('signed-contract.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download signed contract' })).toBeTruthy();
  });

  it('lets a manager prepare a quote without choosing an Inspector or drone', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-1', status: 'QUOTED' });
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
          assignedManagerId: 'manager-1',
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
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();
    openTrackProgress();
    expect(screen.getByText('Review request')).toBeTruthy();
    expect(screen.getByText('Prepare quote')).toBeTruthy();
    expect(screen.queryByText('Customer creates inspection request')).toBeNull();
    expect(screen.getByText('Request review')).toBeTruthy();
    // The commercial terms form is available immediately; dispatch owns the partner pair.
    expect(screen.getByLabelText('Quoted scope')).toBeTruthy();
    expect(screen.queryByLabelText('Partner Inspector')).toBeNull();
    expect(screen.queryByLabelText('Partner drone')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select Inspector and drone' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Price per occurrence (VND)'), {
      target: { value: '11000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      scopeSnapshot: 'Crack check',
      firstOccurrenceStartAt: '2026-11-01T01:00:00.000Z',
      firstOccurrenceEndAt: '2026-11-01T03:00:00.000Z',
      pricePerOccurrenceVnd: 11000000,
      requiredDroneFeatureCodes: [],
    });
  });

  it('lets a manager propose a later first inspection date and warns that the customer must accept it', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-later', status: 'QUOTED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-later',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          description: 'Bridge survey',
          requestedFrom: '2027-02-01',
          requestedUntil: '2027-02-01',
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
          createdAt: '2026-12-29T00:00:00Z',
          currentQuote: null,
          assignedManagerId: 'manager-1',
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
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderPage();
    openTrackProgress();

    fireEvent.change(screen.getByLabelText('First occurrence start'), {
      target: { value: '2027-02-05T08:00' },
    });
    expect(
      screen.getByText(
        'Moving the first inspection from Feb 1, 2027 to Feb 5, 2027. The Customer must accept the updated quote.',
      ),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Price per occurrence (VND)'), {
      target: { value: '11000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      scopeSnapshot: 'Bridge survey',
      firstOccurrenceStartAt: '2027-02-05T01:00:00.000Z',
      firstOccurrenceEndAt: '2027-02-05T03:00:00.000Z',
      pricePerOccurrenceVnd: 11000000,
      requiredDroneFeatureCodes: [],
    });
  });

  it('saves a recurring quote without checking any Inspector license', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-recurring-expiry', status: 'QUOTED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-recurring-expiry',
          ownerCustomerId: 'org-1',
          assetId: 'asset-1',
          assignedManagerId: 'manager-1',
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
    vi.spyOn(contractsHook, 'useIssueServiceQuote').mockReturnValue({
      mutateAsync,
      isPending: false,
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

    renderPage();
    openTrackProgress();

    // A short-lived pilot license no longer blocks quote preparation: the assigned Inspector's
    // suitability for every occurrence is enforced when dispatch assigns the pair.
    expect(
      screen.queryByText('Pilot license expires before the last planned inspection.'),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText('Price per occurrence (VND)'), {
      target: { value: '11000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeSnapshot: 'Recurring bridge survey',
        pricePerOccurrenceVnd: 11000000,
      }),
    );
  });

  it('blocks users without customer, manager, or admin role', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['INSPECTOR'],
      userId: 'inspector-1',
      userName: 'Inspector One',
      email: 'inspector@test.local',
    });
    renderPage();
    expect(
      screen.getByText(/Service requests are available to Customer and Manager accounts\./),
    ).toBeTruthy();
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
    openTrackProgress();
    expect(screen.getByText('Request submitted')).toBeTruthy();
    expect(screen.getByText('Review quote')).toBeTruthy();
    expect(screen.getByText('Sign contract')).toBeTruthy();
    expect(screen.getByText('Preparing schedule')).toBeTruthy();
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
    });
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'req-signed', status: 'ASSIGNED' });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-signed',
          assignedManagerId: 'manager-1',
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
                gatewayOrderCode: null,
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
    openTrackProgress();
    expect(screen.getByText('Scheduled flight & assignment')).toBeTruthy();
    expect(screen.getByText('Inspection flight')).toBeTruthy();
    expect(screen.queryByText(/occurrences/i)).toBeNull();
    const assignButton = screen.getByRole('button', { name: 'Assign occurrence' });
    expect(assignButton.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByLabelText('Inspector')).toBeNull();
    expect(screen.queryByLabelText('Drone')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Find eligible partners' }));
    expect(await screen.findByText('Select partner Inspector and drone')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign occurrence' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      plannedStartAt: '2026-11-02T01:00:00.000Z',
      plannedEndAt: '2026-11-02T03:00:00.000Z',
      inspectorId: 'p-insp-1',
      droneId: 'p-drone-1',
    });
  });

  it('restores the selection step from the URL and returns to the form via browser back', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
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
        assignedManagerId: 'manager-1',
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

  it('shows asset, location, customer, and unclaimed status in Manager outer overview dialog', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-open-1',
          ownerCustomerId: 'customer-1',
          ownerCustomerName: 'Saigon Tower Co.',
          assetId: 'asset-1',
          assetName: 'Saigon Tower',
          assetCode: 'ST-01',
          assetLocationText: 'District 1, HCMC',
          description: 'Facade crack inspection',
          requestedFrom: '2026-12-20',
          requestedUntil: '2026-12-20',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'OPEN',
          assignedManagerId: null,
          canClaim: true,
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-11-20T00:00:00Z',
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
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Overview' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Saigon Tower · ST-01');
    expect(dialog.textContent).toContain('District 1, HCMC');
    expect(dialog.textContent).toContain('Saigon Tower Co.');
    expect(dialog.textContent).toContain('Unclaimed');
  });

  it('shows asset, quote price, review alert, and waiting manager notice in Customer outer overview dialog', async () => {
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-quoted-1',
          ownerCustomerId: 'customer-1',
          assetId: 'asset-1',
          assetName: 'Bridge 1',
          assetCode: 'BR-1',
          assetLocationText: 'Can Tho',
          description: 'Quarterly bridge check',
          requestedFrom: '2026-12-20',
          requestedUntil: '2026-12-20',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'QUOTED',
          assignedManagerId: null,
          serviceManager: null,
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-11-20T00:00:00Z',
          currentQuote: {
            id: 'q-1',
            scopeSnapshot: 'Bridge inspection',
            firstOccurrenceStartAt: '2026-12-20T01:00:00Z',
            firstOccurrenceEndAt: '2026-12-20T03:00:00Z',
            inspectorId: '',
            droneId: '',
            pricePerOccurrenceVnd: 1500000,
            pricePerOccurrenceUsd: 60,
            issuedByUserId: 'manager-1',
            createdAt: '2026-11-20T00:00:00Z',
            updatedAt: '2026-11-20T00:00:00Z',
            updatedByUserId: 'manager-1',
            rowVersion: 1,
            requiredDroneFeatureCodes: [],
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
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Actions for service request' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Overview' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Bridge 1 · BR-1');
    expect(dialog.textContent).toContain('Can Tho');
    expect(dialog.textContent).toContain('1,500,000 VND / occurrence');
    expect(dialog.textContent).toContain('Quote ready for review — open Track progress to review and accept.');
    expect(dialog.textContent).toContain('Waiting for a Service Manager to claim this request.');
  });

  it('lets a manager configure inspection checkpoints from asset suggestions, category templates, and custom items', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Manager One',
      email: 'manager@test.local',
    });
    const saveCheckpoints = vi.fn().mockResolvedValue({
      id: 'req-1',
      inspectionItems: ['Deck joints', 'Anchor bolts', 'Thermal roof sweep'],
    });
    vi.spyOn(contractsHook, 'useUpdateServiceRequestInspectionItems').mockReturnValue({
      mutateAsync: saveCheckpoints,
      isPending: false,
    } as any);
    vi.spyOn(assetsHook, 'useAsset').mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        categoryId: 'cat-1',
        inspectionItems: ['Deck joints', 'Drainage channels'],
      },
      isPending: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(catalogHook, 'useChecklistTemplates').mockReturnValue({
      data: [
        {
          id: 'tpl-1',
          templateType: 'CATEGORY_INSPECTION_ITEM',
          categoryId: 'cat-1',
          label: 'Anchor bolts',
          sortOrder: 1,
          active: true,
          required: true,
        },
        {
          id: 'tpl-2',
          templateType: 'CATEGORY_INSPECTION_ITEM',
          categoryId: 'cat-1',
          label: 'Retired template',
          sortOrder: 2,
          active: false,
          required: false,
        },
      ],
      isPending: false,
    } as any);

    const request = {
      id: 'req-1',
      ownerCustomerId: 'org-1',
      assetId: 'asset-1',
      description: 'Bridge survey',
      requestedFrom: '2027-02-01',
      requestedUntil: '2027-02-01',
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
      createdAt: '2026-10-12T00:00:00Z',
      assignedManagerId: 'manager-1',
      currentQuote: null,
      inspectionItems: [],
      occurrences: [],
      messages: [],
    };
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [request],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({
      data: request,
      isFetching: false,
    } as any);

    renderPage();
    openTrackProgress();

    fireEvent.click(screen.getByRole('button', { name: 'Configure checkpoints' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deck joints' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anchor bolts' }));
    expect(screen.queryByRole('button', { name: 'Retired template' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Add custom checkpoint'), {
      target: { value: 'Thermal roof sweep' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save checkpoints' }));

    await waitFor(() =>
      expect(saveCheckpoints).toHaveBeenCalledWith([
        'Deck joints',
        'Anchor bolts',
        'Thermal roof sweep',
      ]),
    );
  });

  it('opens inspector profile and partner drone detail dialogs when clicked on an assigned flight', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [{
        id: 'req-assigned',
        assignedManagerId: 'manager-1',
        ownerCustomerId: 'org-1',
        assetId: 'asset-1',
        description: 'Highlands survey',
        requestedFrom: '2026-12-13',
        requestedUntil: '2026-12-13',
        timezone: 'Asia/Ho_Chi_Minh',
        windowStart: '08:00',
        windowEnd: '10:00',
        requestType: 'ONE_TIME',
        recurrenceUnit: null,
        recurrenceInterval: null,
        occurrenceCount: null,
        recurrenceEndDate: null,
        status: 'ASSIGNED',
        acceptedQuoteId: 'quote-1',
        acceptedAt: '2026-11-20T00:00:00Z',
        acceptedByUserId: 'cust-1',
        acceptedTermsSnapshot: null,
        contractFileName: 'contract.pdf',
        contractContentType: 'application/pdf',
        contractSizeBytes: 1024,
        contractUploadedAt: '2026-11-20T00:00:00Z',
        createdAt: '2026-11-19T00:00:00Z',
        currentQuote: null,
        occurrences: [{
          id: 'occ-1',
          occurrenceIndex: 1,
          plannedStartAt: '2026-12-13T01:00:00Z',
          plannedEndAt: '2026-12-13T03:00:00Z',
          status: 'ASSIGNED',
          inspectorId: 'p-insp-1',
          droneId: 'p-drone-1',
          inspectionId: 'insp-9',
          assignedAt: '2026-11-20T01:00:00Z',
          assignmentStatus: 'ACCEPTED',
          paymentStatus: 'PAID',
          totalPrice: 12000000,
        }],
        messages: [],
      }],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'useServiceRequest').mockReturnValue({ data: undefined, isFetching: false } as any);
    vi.spyOn(contractsHook, 'usePartnerInspectors').mockReturnValue({
      data: [{ id: 'p-insp-1', fullName: 'Partner Alice', licenseExpiresAt: null, avatarUrl: null }],
    } as any);
    vi.spyOn(contractsHook, 'usePartnerDrones').mockReturnValue({
      data: [{ id: 'p-drone-1', inspectorOwnerId: 'p-insp-1', serialNumber: 'DJI-M30T-SG-0002', model: 'DJI Matrice 30T', hasImage: false }],
      isPending: false,
    } as any);
    vi.spyOn(mf1ReviewApi, 'droneHistory').mockResolvedValue([{
      id: 'app-1',
      inspectorUserId: 'p-insp-1',
      inspectorFullName: 'Partner Alice',
      serialNumber: 'DJI-M30T-SG-0002',
      model: 'DJI Matrice 30T',
      manufacturer: 'DJI',
      registrationNumber: 'VN-DR-0002',
      registrationFileKey: 'reg.pdf',
      registrationExpiresAt: '2027-12-31T00:00:00Z',
      ownershipFileKey: 'own.pdf',
      maxAltitudeMeters: 120,
      maxWindResistanceMps: 15,
      hasThermalCamera: true,
      hasRtk: true,
      status: 'APPROVED',
      reviewNote: null,
      droneId: 'p-drone-1',
      createdAt: '2026-11-01T00:00:00Z',
    }]);
    const getInspectorSpy = vi.spyOn(inspectorProfileApi, 'get').mockResolvedValue({
      userId: 'p-insp-1',
      email: 'alice@test.local',
      fullName: 'Partner Alice',
      phoneNumber: '0901234567',
      roles: ['INSPECTOR'],
    } as any);
    vi.spyOn(inspectorProfileApi, 'listFlightLogs').mockResolvedValue([]);

    renderPage();
    openTrackProgress();

    fireEvent.click(screen.getByRole('button', { name: 'DJI Matrice 30T (DJI-M30T-SG-0002)' }));
    expect(await screen.findByText('VN-DR-0002')).toBeTruthy();
    expect(screen.getByText('120 m')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);

    fireEvent.click(screen.getByRole('button', { name: 'Partner Alice' }));
    await waitFor(() => expect(getInspectorSpy).toHaveBeenCalledWith('p-insp-1'));
  });
});
