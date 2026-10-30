import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const roles = vi.hoisted(() => ({ current: ['CUSTOMER'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) => selector({ roles: roles.current }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useLocation: () => ({ pathname: '/client/assets' }) }));
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
vi.mock('@/features/inspections/hooks/useRecurringSchedules', () => ({
  useRecurringSchedules: () => ({ data: { items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 1 }, isLoading: false, error: null }),
  useRecurringSchedule: () => ({ data: null, isLoading: false, error: null }),
  useCreateRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  usePauseRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useEndRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryScheduleOccurrence: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipScheduleOccurrence: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: () => ({ data: { items: [], totalCount: 0, page: 1, pageSize: 100, totalPages: 1 }, isLoading: false, error: null }),
  useInspection: () => ({ data: null, isLoading: false, isError: false }),
  useCreateInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
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

  it('exposes the Drones tab to CUSTOMER and does not include Permits tab', () => {
    roles.current = ['CUSTOMER'];
    render(<AssetsPage />);
    expect(screen.getByRole('tab', { name: 'Assets' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Drones' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Permits' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Drones' }));
    expect(screen.getByText('No drones registered')).toBeTruthy();
  });

  it('does not expose resource tabs to ADMIN', () => {
    roles.current = ['ADMIN'];
    render(<AssetsPage />);
    expect(screen.queryByRole('tab', { name: 'Assets' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Drones' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Permits' })).toBeNull();
  });
});
