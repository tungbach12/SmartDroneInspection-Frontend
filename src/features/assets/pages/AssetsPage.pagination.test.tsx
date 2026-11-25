import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, AssetListFilters } from '../api/assetApi';

const authState = vi.hoisted(() => ({ roles: ['CUSTOMER'] as string[] }));
const useAssetsSpy = vi.hoisted(() => vi.fn());
const mockAssets: Asset[] = Array.from({ length: 10 }, (_, index) => ({
  id: `asset-${index + 1}`,
  code: `AST-${String(index + 1).padStart(3, '0')}`,
  name: `Tower Asset ${index + 1}`,
  description: null,
  locationText: `District ${(index % 5) + 1}`,
  latitude: 10.77,
  longitude: 106.7,
  status: 'ACTIVE',
  categoryId: 'cat-1',
  createdAt: '2026-10-01T00:00:00Z',
  inspectionItems: index < 3 ? ['Roof'] : [],
  structureHeightMeters: 25,
  footprintAreaSquareMeters: 400,
  checkpointsLocked: false,
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: authState.roles }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    pathname: authState.roles.includes('MANAGER') ? '/manager/assets' : '/client/assets',
  }),
  useInRouterContext: () => false,
}));
vi.mock('../hooks/useAssets', () => ({
  useAssets: (filters: AssetListFilters) => {
    useAssetsSpy(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 8;
    const search = (filters.search ?? '').trim().toLowerCase();
    const filtered = mockAssets.filter((asset) => {
      if (filters.status && asset.status !== filters.status) return false;
      if (!search) return true;
      return (
        asset.name.toLowerCase().includes(search) || asset.code.toLowerCase().includes(search)
      );
    });
    const start = (page - 1) * pageSize;
    return {
      data: {
        items: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        totalCount: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        allCount: mockAssets.length,
        activeCount: mockAssets.length,
        checkpointsConfiguredCount: 3,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateAssetInspectionItems: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({
    data: [{ id: 'cat-1', code: 'TOWER', name: 'Tower', description: null, active: true }],
  }),
  useChecklistTemplates: () => ({ data: [] }),
}));
vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: () => ({
    data: { items: [], totalCount: 0, page: 1, pageSize: 100, totalPages: 1 },
    isLoading: false,
    error: null,
  }),
  useInspection: () => ({ data: null, isLoading: false, isError: false }),
  useCreateInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useAcceptInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDeclineInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useFieldSessions: () => ({ data: [], isLoading: false, isError: false }),
  useRescheduleInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useCancelInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
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

import { AssetsPage } from './AssetsPage';

describe('AssetsPage server-backed pagination for Customer and Manager', () => {
  beforeEach(() => {
    authState.roles = ['CUSTOMER'];
    useAssetsSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('requests server-paged assets for CUSTOMER and preserves summary metrics across pages', () => {
    render(<AssetsPage />);

    expect(useAssetsSpy).toHaveBeenCalledWith({ page: 1, pageSize: 8, status: 'ACTIVE' });
    expect(screen.getByText('Showing 1–8 of 10')).toBeTruthy();
    expect(screen.getByText('Tower Asset 1')).toBeTruthy();
    expect(screen.queryByText('Tower Asset 9')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(useAssetsSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 8, status: 'ACTIVE' });
    expect(screen.getByText('Showing 9–10 of 10')).toBeTruthy();
    expect(screen.getByText('Tower Asset 9')).toBeTruthy();
    expect(screen.getByText('Tower Asset 10')).toBeTruthy();
    expect(screen.queryByText('Tower Asset 1')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/Search by id, name, or code/i), {
      target: { value: 'Tower Asset 1' },
    });

    expect(useAssetsSpy).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 8,
      search: 'Tower Asset 1',
      status: 'ACTIVE',
    });
    expect(screen.getByText('Showing 1–2 of 2')).toBeTruthy();
    expect(screen.getByText('Tower Asset 1')).toBeTruthy();
    expect(screen.getByText('Tower Asset 10')).toBeTruthy();
  });

  it('requests server-paged assets for MANAGER without customer KPI metrics', () => {
    authState.roles = ['MANAGER'];
    render(<AssetsPage />);

    expect(useAssetsSpy).toHaveBeenCalledWith({ page: 1, pageSize: 8, status: 'ACTIVE' });
    expect(screen.queryByText('Total Assets')).toBeNull();
    expect(screen.getByText('Showing 1–8 of 10')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(useAssetsSpy).toHaveBeenLastCalledWith({ page: 2, pageSize: 8, status: 'ACTIVE' });
    expect(screen.getByText('Showing 9–10 of 10')).toBeTruthy();
    expect(screen.getByText('Tower Asset 9')).toBeTruthy();
  });
});
