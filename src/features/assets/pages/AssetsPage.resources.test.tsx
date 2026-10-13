import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const roles = vi.hoisted(() => ({ current: ['ORG_ADMIN'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) => selector({ roles: roles.current }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({ data: { items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 }, isLoading: false }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useCatalog', () => ({ useCategories: () => ({ data: [] }) }));
vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useDrones', () => ({
  useCreateDrone: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDrone: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useDroneDocuments: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useDrones: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateDroneDocumentStatus: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateDroneServiceability: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUploadDroneDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useFlightPermits', () => ({
  useCreateFlightPermit: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, reset: vi.fn() }),
  useFlightPermits: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useReviewFlightPermit: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, reset: vi.fn() }),
}));

import { AssetsPage } from './AssetsPage';

describe('AssetsPage resource tabs', () => {
  afterEach(() => {
    cleanup();
    roles.current = ['ORG_ADMIN'];
  });

  it('exposes the Drones and Permits tabs to ORG_ADMIN', () => {
    roles.current = ['ORG_ADMIN'];
    render(<AssetsPage />);
    expect(screen.getByRole('tab', { name: 'Assets' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Drones' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Permits' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Permits' }));
    expect(screen.getByText('No permit records yet')).toBeTruthy();
  });

  it('does not expose resource tabs to ADMIN', () => {
    roles.current = ['ADMIN'];
    render(<AssetsPage />);
    expect(screen.queryByRole('tab', { name: 'Assets' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Drones' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Permits' })).toBeNull();
  });
});
