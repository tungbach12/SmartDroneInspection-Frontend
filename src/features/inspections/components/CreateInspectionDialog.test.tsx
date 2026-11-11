import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCreateInspection = vi.fn();

vi.mock('../hooks/useInspections', () => ({
  useCreateInspection: () => ({
    mutate: mockCreateInspection,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'asset-1',
          code: 'BR-01',
          name: 'Main Bridge',
          status: 'ACTIVE',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/features/assets/hooks/useDrones', () => ({
  useDroneSelection: () => ({
    data: [
      {
        id: 'drone-1',
        serialNumber: 'DJI-001',
        model: 'Matrice 300',
        manufacturer: 'DJI',
        serviceability: 'ACTIVE',
      },
      {
        id: 'drone-2',
        serialNumber: 'DJI-002',
        model: 'Mavic 3E',
        manufacturer: 'DJI',
        serviceability: 'ACTIVE',
      },
    ],
  }),
}));

vi.mock('@/features/admin/hooks/usePlatformUsers', () => ({
  usePlatformUsers: () => ({
    data: [
      {
        id: 'insp-1',
        email: 'alice@example.test',
        fullName: 'Inspector Alice',
        roles: ['INSPECTOR'],
        status: 'ACTIVE',
      },
      {
        userId: 'insp-2',
        email: 'bob@example.test',
        fullName: 'Inspector Bob',
        roles: ['INSPECTOR'],
        status: 'ACTIVE',
      },
    ],
  }),
}));

import { CreateInspectionDialog } from './CreateInspectionDialog';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CreateInspectionDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders direct inspector and drone select dropdowns', async () => {
    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
      />,
    );

    expect(await screen.findByText('New Inspection')).toBeTruthy();
    expect(screen.getByLabelText(/Inspector/)).toBeTruthy();
    expect(screen.getByLabelText(/Drone/)).toBeTruthy();
    expect(screen.queryByText('Default Operational Pair')).toBeNull();
  });

  it('submits inspection with selected inspector and drone', async () => {
    mockCreateInspection.mockImplementation((_payload, { onSuccess }) => {
      onSuccess?.({ id: 'insp-new-1' });
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={handleClose}
        preselectedAssetId="asset-1"
        onSuccess={handleSuccess}
      />,
    );

    fireEvent.mouseDown(screen.getByLabelText(/Inspector/));
    fireEvent.click(await screen.findByRole('option', { name: /Inspector Alice/ }));

    fireEvent.mouseDown(screen.getByLabelText(/Drone/));
    fireEvent.click(await screen.findByRole('option', { name: /DJI-001/ }));

    fireEvent.change(screen.getByLabelText(/Planned Start Date/), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText(/Planned End/), {
      target: { value: '2026-11-01' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Create & Dispatch' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateInspection).toHaveBeenCalledWith(
        {
          assetId: 'asset-1',
          inspectorId: 'insp-1',
          droneId: 'drone-1',
          plannedStartAt: expect.any(String),
          plannedEndAt: expect.any(String),
        },
        expect.anything(),
      );
    });

    expect(handleSuccess).toHaveBeenCalledWith('insp-new-1');
    expect(handleClose).toHaveBeenCalled();
  });
});
