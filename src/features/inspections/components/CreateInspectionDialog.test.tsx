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

vi.mock('@/features/workforce/hooks/useWorkforce', () => ({
  useWorkforceUsers: () => ({
    data: [
      {
        userId: 'insp-1',
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

  it('renders default operational pair when asset is preselected', async () => {
    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
      />,
    );

    expect(await screen.findByText('New Inspection')).toBeTruthy();
    expect(screen.getByText('Default Operational Pair')).toBeTruthy();
    expect(screen.getByText(/Inspector Alice/)).toBeTruthy();
    expect(screen.getByText(/DJI-001/)).toBeTruthy();
  });

  it('submits inspection with inherited default pair', async () => {
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

    const objectiveInput = screen.getByLabelText(/Inspection Objective/);
    fireEvent.change(objectiveInput, { target: { value: 'Annual structural check' } });

    const submitBtn = screen.getByRole('button', { name: 'Create & Dispatch' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateInspection).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-1',
          objective: 'Annual structural check',
          inspectorId: null,
          droneId: null,
        }),
        expect.anything(),
      );
    });

    expect(handleSuccess).toHaveBeenCalledWith('insp-new-1');
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows overriding the pair with a specific inspector, drone, and reason', async () => {
    mockCreateInspection.mockImplementation((_payload, { onSuccess }) => {
      onSuccess?.({ id: 'insp-new-2' });
    });

    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
      />,
    );

    const objectiveInput = screen.getByLabelText(/Inspection Objective/);
    fireEvent.change(objectiveInput, { target: { value: 'Thermal defect survey' } });

    const overrideCheckbox = screen.getByLabelText(/Reassign Inspector or Drone/);
    fireEvent.click(overrideCheckbox);

    expect(await screen.findByText('SPECIFIC MISSION ASSIGNMENT')).toBeTruthy();

    const reasonInput = screen.getByLabelText(/Reassignment Reason/);
    fireEvent.change(reasonInput, { target: { value: 'Primary drone undergoing service' } });

    const submitBtn = screen.getByRole('button', { name: 'Create & Dispatch' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateInspection).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-1',
          objective: 'Thermal defect survey',
          reassignmentReason: 'Primary drone undergoing service',
        }),
        expect.anything(),
      );
    });
  });
});
