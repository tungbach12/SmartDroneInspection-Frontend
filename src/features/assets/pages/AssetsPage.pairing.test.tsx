import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { recurringScheduleApi } from '@/features/inspections/api/recurringScheduleApi';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const roles = vi.hoisted(() => ({ current: ['ORG_MANAGER'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: roles.current }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/client/assets' }),
}));

const mockCreateAsset = vi.fn();
const mockReassignPair = vi.fn();

vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'asset-1',
          code: 'BR-01',
          name: 'Main Bridge',
          description: 'Steel bridge',
          locationText: 'District 1',
          latitude: null,
          longitude: null,
          status: 'ACTIVE',
          categoryId: 'cat-1',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateAsset: () => ({
    mutate: mockCreateAsset,
    isPending: false,
    isError: false,
    error: null,
  }),
  useAssetPair: (id: string | null) => ({
    data:
      id === 'asset-1'
        ? {
            pairAssignmentId: 'pair-1',
            inspectorUserId: 'insp-1',
            inspectorName: 'Inspector Alice',
            droneId: 'drone-1',
            droneSerialNumber: 'DJI-001',
            droneModel: 'Matrice 300',
            status: 'ACTIVE',
            validFrom: '2026-10-01T00:00:00Z',
            validUntil: null,
          }
        : null,
    isLoading: false,
  }),
  useReassignAssetPair: () => ({
    mutate: mockReassignPair,
    isPending: false,
    isError: false,
    error: null,
  }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({
    data: [{ id: 'cat-1', name: 'Bridges', active: true }],
  }),
}));

vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock('../hooks/useDrones', () => ({
  useDroneSelection: () => ({
    data: [
      {
        id: 'drone-1',
        serialNumber: 'DJI-001',
        model: 'Matrice 300',
        manufacturer: 'DJI',
        serviceability: 'ACTIVE',
      },
    ],
  }),
}));

vi.mock('@/features/workforce/hooks/useWorkforce', () => ({
  useWorkforceUsers: () => ({
    data: [
      {
        userId: 'insp-1',
        email: 'alice@example.test',
        fullName: 'Inspector Alice',
        roles: ['INSPECTOR'],
        status: 'ACTIVE',
        organizationId: 'org-1',
      },
    ],
  }),
}));

import { AssetsPage } from './AssetsPage';

describe('AssetsPage operational pairing', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    roles.current = ['ORG_MANAGER'];
    vi.spyOn(inspectionApi, 'list').mockResolvedValue({
      items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0,
    });
    vi.spyOn(recurringScheduleApi, 'list').mockResolvedValue({
      items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0,
    });
  });

  it('displays the assigned operational pair in the asset details drawer', async () => {
    renderWithClient(<AssetsPage />);

    // Click on the asset row to open drawer
    const row = await screen.findByText('Main Bridge');
    fireEvent.click(row);

    // Expect to see the Operational Pair section
    expect(await screen.findByText('Operational Pair')).toBeTruthy();
    expect(screen.getByText(/Inspector Alice/)).toBeTruthy();
    expect(screen.getByText(/DJI-001/)).toBeTruthy();
  });

  it('renders "New inspection" button on active asset row for ORG_MANAGER', async () => {
    renderWithClient(<AssetsPage />);

    const newInspectionBtn = await screen.findByRole('button', { name: 'New inspection' });
    expect(newInspectionBtn).toBeTruthy();

    fireEvent.click(newInspectionBtn);

    // Dialog opens
    expect(await screen.findByText('New Inspection')).toBeTruthy();
  });

  it('allows reassigning the default operational pair from the drawer', async () => {
    renderWithClient(<AssetsPage />);

    const row = await screen.findByText('Main Bridge');
    fireEvent.click(row);

    const reassignBtn = await screen.findByRole('button', { name: 'Reassign' });
    fireEvent.click(reassignBtn);

    expect(await screen.findByText('Reassign Operational Pair')).toBeTruthy();
  });
});
