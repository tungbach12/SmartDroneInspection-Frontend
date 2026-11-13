import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMutate = vi.hoisted(() => vi.fn());

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
    data: { items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 },
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutate: createMutate, isPending: false, isError: false, error: null }),
  useUpdateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({
    data: [{ id: 'c1', code: 'BRIDGE', name: 'Bridge', description: null, active: true }],
  }),
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

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Asset name/), { target: { value: 'North Bridge' } });
  fireEvent.mouseDown(screen.getByLabelText(/Category/));
  fireEvent.click(screen.getByRole('option', { name: 'Bridge' }));
  fireEvent.change(screen.getByLabelText(/^Location/), { target: { value: 'Km 12+300' } });
}

describe('AssetsPage create dialog dimensions', () => {
  beforeEach(() => createMutate.mockClear());
  afterEach(() => cleanup());

  it('sends structure height and footprint area when entered', () => {
    render(<AssetsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new asset/i }));
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Structure height/), { target: { value: '42.5' } });
    fireEvent.change(screen.getByLabelText(/Footprint area/), { target: { value: '1200' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0]![0]).toMatchObject({
      name: 'North Bridge',
      structureHeightMeters: 42.5,
      footprintAreaSquareMeters: 1200,
    });
  });

  it('sends null when the optional dimensions are left blank', () => {
    render(<AssetsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new asset/i }));
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create Asset' }));

    expect(createMutate.mock.calls[0]![0]).toMatchObject({
      structureHeightMeters: null,
      footprintAreaSquareMeters: null,
    });
  });

  it('blocks submission for a negative or non-numeric dimension', () => {
    render(<AssetsPage />);
    fireEvent.click(screen.getByRole('button', { name: /new asset/i }));
    fillRequiredFields();

    fireEvent.change(screen.getByLabelText(/Structure height/), { target: { value: '-3' } });
    expect(screen.getByRole('button', { name: 'Create Asset' }).hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(/Structure height/), { target: { value: 'abc' } });
    expect(screen.getByRole('button', { name: 'Create Asset' }).hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByLabelText(/Structure height/), { target: { value: '10' } });
    expect(screen.getByRole('button', { name: 'Create Asset' }).hasAttribute('disabled')).toBe(false);
    expect(createMutate).not.toHaveBeenCalled();
  });
});
