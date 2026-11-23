import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  inspections: [] as Array<Record<string, unknown>>,
  checkpointsLocked: false,
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: ['CUSTOMER'] }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/client/assets' }),
  useInRouterContext: () => false,
}));
vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'asset-1',
          code: 'BLD-001',
          name: 'Checkpoint Tower',
          description: 'Checkpoint UI regression fixture',
          locationText: 'Ho Chi Minh City',
          latitude: 10.7757,
          longitude: 106.7171,
          status: 'ACTIVE',
          categoryId: 'category-1',
          createdAt: '2026-11-20T00:00:00Z',
          inspectionItems: ['Roof'],
          structureHeightMeters: 30,
          footprintAreaSquareMeters: 120,
          checkpointsLocked: state.checkpointsLocked,
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateAssetInspectionItems: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
  useChecklistTemplates: () => ({ data: [] }),
}));
vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useDrones', () => ({
  useCreateDrone: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDrone: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useDrones: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateDroneServiceability: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: () => ({
    data: {
      items: state.inspections,
      totalCount: state.inspections.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  }),
  useInspection: () => ({ data: null, isLoading: false, isError: false }),
  useCreateInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useFieldSessions: () => ({ data: [], isLoading: false, isError: false }),
  useRescheduleInspection: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useCancelInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useAcceptInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDeclineInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useForceAbortFieldSession: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useReassignInspection: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useReassignCandidates: () => ({ data: [], isLoading: false, isError: false, error: null }),
}));

import { AssetsPage } from './AssetsPage';

async function openAssetDetail() {
  render(<AssetsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Detail' }));
}

describe('AssetsPage customer checkpoint management', () => {
  afterEach(() => {
    cleanup();
    state.inspections = [];
    state.checkpointsLocked = false;
  });

  it('shows the checkpoint section and edit action to the owning Customer before inspection', async () => {
    await openAssetDetail();

    expect(await screen.findByText('Inspection Checkpoints')).toBeTruthy();
    expect(screen.getByText('+ Add / Edit custom items')).toBeTruthy();
  });

  it('locks checkpoint editing after the first inspection', async () => {
    state.checkpointsLocked = true;

    await openAssetDetail();

    expect(
      await screen.findByText('Checkpoints are locked after the first inspection.'),
    ).toBeTruthy();
    expect(screen.queryByText('+ Add / Edit custom items')).toBeNull();
  });
});
