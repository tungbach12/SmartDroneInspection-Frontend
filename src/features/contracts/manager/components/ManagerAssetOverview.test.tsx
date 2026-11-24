import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { ServiceRequest } from '../../api/contractApi';
import { RequestOverviewCard } from '../../shared/RequestOverviewCard';
import { ManagerAssetOverview } from './ManagerAssetOverview';

const useAssetMock = vi.fn();
const usePartnerDronesMock = vi.fn();
const useAssetDocumentsMock = vi.fn();
const useCategoriesMock = vi.fn();

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAsset: (id: string) => useAssetMock(id),
}));
vi.mock('@/features/assets/hooks/useAssetDocuments', () => ({
  useAssetDocuments: (id: string) => useAssetDocumentsMock(id),
}));
vi.mock('@/features/assets/hooks/useCatalog', () => ({
  useCategories: () => useCategoriesMock(),
}));
vi.mock('../../hooks/useContracts', () => ({
  usePartnerDrones: (enabled?: boolean) => usePartnerDronesMock(enabled),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="authenticated-asset-image" />
  ),
}));
vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'en',
    formatDate: (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
        value.getDate(),
      ).padStart(2, '0')}`,
  }),
}));

function assignedRequest(): ServiceRequest {
  return {
    id: 'req-1',
    ownerCustomerId: 'customer-1',
    ownerCustomerName: 'Saigon Infrastructure Co.',
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
    canClaim: false,
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
        invoice: null,
        payment: null,
        payout: null,
      },
    ],
    messages: [],
    sourceInspectionId: null,
  } as unknown as ServiceRequest;
}

describe('ManagerAssetOverview', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      userId: 'manager-1',
      userName: 'Platform Manager',
      email: 'manager@test.local',
    });
    useAssetMock.mockReturnValue({
      data: { id: 'asset-1', name: 'Bridge 1', code: 'BR-1', status: 'ACTIVE' },
      isPending: false,
    });
    usePartnerDronesMock.mockReturnValue({
      data: [{ id: 'drone-1', model: 'DJI M300', serialNumber: 'SN-001' }],
      isPending: false,
    });
    useAssetDocumentsMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    useCategoriesMock.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Bridge' }],
      isPending: false,
    });
  });

  it('hides overview details by default and shows them when toggled', () => {
    render(<ManagerAssetOverview request={assignedRequest()} />);

    expect(screen.getByText('Bridge 1')).toBeTruthy();
    expect(screen.getByText('Saigon Infrastructure Co.')).toBeTruthy();
    expect(screen.getByText('Platform Manager')).toBeTruthy();
    expect(screen.getByText('2026-12-01 · 08:00 – 17:00')).toBeTruthy();
    expect(screen.queryByText('BR-1')).toBeNull();
    expect(screen.queryByText('DJI M300 · SN-001')).toBeNull();
    expect(screen.queryByText('signed-contract.pdf')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByText('BR-1')).toBeTruthy();
    expect(screen.getByText('DJI M300 · SN-001')).toBeTruthy();
    expect(screen.getByText('signed-contract.pdf')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.queryByText('BR-1')).toBeNull();
    expect(screen.queryByText('DJI M300 · SN-001')).toBeNull();
    expect(screen.queryByText('signed-contract.pdf')).toBeNull();
  });

  it('shows asset specs, location, quote, and recurring dispatch progress for Manager', () => {
    useAssetMock.mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        locationText: '{"label":"Ninh Kieu, Can Tho","latitude":10.0341,"longitude":105.788}',
        structureHeightMeters: 42,
        footprintAreaSquareMeters: 1200,
        inspectionItems: ['Deck', 'Piers', 'Cables'],
      },
      isPending: false,
    });
    const req = assignedRequest();
    req.requestType = 'RECURRING';
    req.occurrenceCount = 2;
    req.currentQuote = {
      id: 'q-1',
      scopeSnapshot: 'Full bridge scan',
      firstOccurrenceStartAt: '2026-12-01T01:00:00Z',
      firstOccurrenceEndAt: '2026-12-01T03:00:00Z',
      inspectorId: 'inspector-1',
      droneId: 'drone-1',
      pricePerOccurrenceVnd: 2000000,
      pricePerOccurrenceUsd: 80,
      issuedByUserId: 'manager-1',
      createdAt: '2026-11-19T00:00:00Z',
      updatedAt: '2026-11-19T00:00:00Z',
      updatedByUserId: 'manager-1',
      rowVersion: 1,
      requiredDroneFeatureCodes: [],
    };
    req.occurrences = [
      {
        ...req.occurrences[0]!,
        inspectorName: 'Partner Alice',
        droneLabel: 'DJI M300 · SN-001',
      },
      {
        ...req.occurrences[0]!,
        id: 'occ-2',
        occurrenceIndex: 2,
        status: 'PENDING_ASSIGNMENT',
        inspectorId: null,
        droneId: null,
        inspectionId: null,
      },
    ];

    render(<ManagerAssetOverview request={req} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(screen.getByText('Ninh Kieu, Can Tho')).toBeTruthy();
    expect(screen.getByText('42 m · 1,200 m²')).toBeTruthy();
    expect(screen.getByText('3 checkpoints')).toBeTruthy();
    expect(screen.getByText('Asset suggested')).toBeTruthy();
    expect(screen.getByText('Partner Alice')).toBeTruthy();
    expect(screen.getByText('DJI M300 · SN-001')).toBeTruthy();
    expect(screen.getByText('1/2 occurrences assigned')).toBeTruthy();
    expect(screen.getByText(/2,000,000 VND \/ occurrence/)).toBeTruthy();
    expect(screen.getByText('signed-contract.pdf')).toBeTruthy();
  });

  it('shows customer-scoped overview fields without internal manager specs', () => {
    useAssetMock.mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        locationText: 'Can Tho Riverbank',
        structureHeightMeters: 42,
        footprintAreaSquareMeters: 1200,
        inspectionItems: ['Deck', 'Piers'],
      },
      isPending: false,
    });
    const req = assignedRequest();
    req.serviceManager = {
      id: 'manager-1',
      fullName: 'MF2 Test Manager',
      email: 'manager@test.local',
      phoneNumber: '0900000000',
      avatarUrl: null,
    };
    req.occurrences[0]!.inspectorName = 'Partner Alice';
    req.occurrences[0]!.droneLabel = 'DJI M300 · SN-001';

    render(<RequestOverviewCard request={req} role="CUSTOMER" />);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(screen.getByText('Can Tho Riverbank')).toBeTruthy();
    expect(screen.getByText('2 checkpoints')).toBeTruthy();
    expect(screen.getByText('Asset suggested')).toBeTruthy();
    expect(screen.getByText('MF2 Test Manager')).toBeTruthy();
    expect(screen.getByText('Pending quote')).toBeTruthy();
    expect(screen.getByText('Partner Alice')).toBeTruthy();
    expect(screen.getByText('DJI M300 · SN-001')).toBeTruthy();
    expect(screen.queryByText('Saigon Infrastructure Co.')).toBeNull();
    expect(screen.queryByText('Asset specs')).toBeNull();
    expect(screen.queryByText('ACTIVE')).toBeNull();
  });

  it('opens full asset details dialog when clicking the Asset field', () => {
    useAssetMock.mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        description: 'Steel cable-stayed bridge across Hau River',
        status: 'ACTIVE',
        categoryId: 'cat-1',
        locationText: '{"label":"Ninh Kieu, Can Tho","latitude":10.0341,"longitude":105.788}',
        latitude: 10.0341,
        longitude: 105.788,
        structureHeightMeters: 42,
        footprintAreaSquareMeters: 1200,
        inspectionItems: ['Deck', 'Piers'],
        checkpointsLocked: true,
        createdAt: '2026-10-01T00:00:00Z',
      },
      isPending: false,
    });
    useAssetDocumentsMock.mockReturnValue({
      data: [
        {
          id: 'doc-1',
          documentType: 'OWNERSHIP',
          fileName: 'bridge-blueprint.pdf',
          contentType: 'application/pdf',
          sizeBytes: 20480,
          checksumSha256: 'abc',
          documentDate: '2026-09-15',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ],
      isPending: false,
      isError: false,
    });

    render(<ManagerAssetOverview request={assignedRequest()} />);

    fireEvent.click(screen.getByRole('button', { name: /View full asset details/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Steel cable-stayed bridge across Hau River');
    expect(dialog.textContent).toContain('Bridge');
    expect(dialog.textContent).toContain('10.034100, 105.788000');
    expect(dialog.textContent).toContain('CLEAR_ZONE');
    expect(dialog.textContent).not.toContain('Inspection Checkpoints');
    expect(dialog.textContent).not.toContain('Checkpoints status');
    expect(dialog.textContent).toContain('bridge-blueprint.pdf');
  });

  it('prefers request-configured checkpoints over asset suggestions in the overview', () => {
    useAssetMock.mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        inspectionItems: ['Deck', 'Piers'],
      },
      isPending: false,
    });
    const req = assignedRequest();
    req.inspectionItems = ['Thermal roof sweep', 'Anchor bolts'];

    render(<ManagerAssetOverview request={req} />);
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(screen.getByText('2 checkpoints')).toBeTruthy();
    expect(screen.getByText('Thermal roof sweep')).toBeTruthy();
    expect(screen.queryByText('Asset suggested')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /View checkpoints/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Configured for this request');
    expect(dialog.textContent).toContain('Thermal roof sweep');
    expect(dialog.textContent).toContain('Anchor bolts');
  });

  it('renders the primary asset photo thumbnail in the overview header when an image document exists', () => {
    useAssetMock.mockReturnValue({
      data: {
        id: 'asset-1',
        name: 'Bridge 1',
        code: 'BR-1',
        status: 'ACTIVE',
        inspectionItems: [],
      },
      isPending: false,
    });
    useAssetDocumentsMock.mockReturnValue({
      data: [
        {
          id: 'doc-pdf',
          documentType: 'OWNERSHIP',
          fileName: 'blueprint.pdf',
          contentType: 'application/pdf',
          sizeBytes: 2048,
          checksumSha256: 'a',
          documentDate: null,
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'img-1',
          documentType: 'ASSET_PHOTO',
          fileName: 'bridge-photo.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 4096,
          checksumSha256: 'b',
          documentDate: null,
          createdAt: '2026-10-02T00:00:00Z',
        },
      ],
      isPending: false,
      isError: false,
    });

    render(<ManagerAssetOverview request={assignedRequest()} />);

    const img = screen.getByTestId('authenticated-asset-image');
    expect(img.getAttribute('src')).toBe('/assets/asset-1/documents/img-1/content');
    expect(img.getAttribute('alt')).toBe('Bridge 1');
  });
});
