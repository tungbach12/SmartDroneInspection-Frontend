import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const roles = vi.hoisted(() => ({ current: ['CUSTOMER'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) => selector({ roles: roles.current }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/client/assets' }),
  useInRouterContext: () => false,
}));
vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({ data: { items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 }, isLoading: false }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useCatalog', () => ({ useCategories: () => ({ data: [] }) }));
vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: () => ({ data: { items: [], totalCount: 0, page: 1, pageSize: 100, totalPages: 1 }, isLoading: false, error: null }),
  useInspection: () => ({ data: null, isLoading: false, isError: false }),
  useCreateInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useFieldSessions: () => ({ data: [], isLoading: false, isError: false }),
  useRescheduleInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useCancelInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useDrones', () => ({
  useCreateDrone: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDrone: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useDrones: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateDroneServiceability: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

import { AssetsPage } from './AssetsPage';

describe('AssetsPage resource tabs', () => {
  afterEach(() => {
    cleanup();
    roles.current = ['CUSTOMER'];
  });

  it('does not expose Drones tab to CUSTOMER as drones belong to inspectors', () => {
    roles.current = ['CUSTOMER'];
    render(<AssetsPage />);
    expect(screen.queryByRole('tab', { name: 'Drones' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Permits' })).toBeNull();
  });

  it('does not expose resource tabs to ADMIN', () => {
    roles.current = ['ADMIN'];
    render(<AssetsPage />);
    expect(screen.queryByRole('tab', { name: 'Assets' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Drones' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Permits' })).toBeNull();
  });
});
