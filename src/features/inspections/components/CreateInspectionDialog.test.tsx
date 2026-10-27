import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCreateInspection = vi.fn();
const mockCreateRecurringSchedule = vi.fn();
let mockActiveSchedules: { id: string; assetId: string; status: string }[] = [];

vi.mock('../hooks/useInspections', () => ({
  useCreateInspection: () => ({
    mutate: mockCreateInspection,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useRecurringSchedules', () => ({
  useCreateRecurringSchedule: () => ({
    mutate: mockCreateRecurringSchedule,
    isPending: false,
    isError: false,
    error: null,
  }),
  useRecurringSchedules: () => ({
    data: { items: mockActiveSchedules, total: mockActiveSchedules.length },
    isLoading: false,
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
    mockActiveSchedules = [];
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

    fireEvent.change(screen.getByLabelText(/Planned Start/), {
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

  it('switches to recurring schedule and shows recurrence options', async () => {
    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
      />,
    );

    expect(screen.getByLabelText(/One-off/i)).toBeTruthy();
    const recurringRadio = screen.getByLabelText(/Recurring schedule/i);
    expect(recurringRadio).toBeTruthy();

    fireEvent.click(recurringRadio);

    expect(screen.getByLabelText(/Recurrence Frequency/i)).toBeTruthy();
    expect(screen.getByLabelText(/Repeat Interval/i)).toBeTruthy();
    expect(screen.getByLabelText(/Timezone Anchor/i)).toBeTruthy();
    expect(screen.getByLabelText(/First Inspection Date/i)).toBeTruthy();
    expect(screen.getByLabelText(/Reminder Days/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create Schedule/i })).toBeTruthy();
  });

  it('submits recurring schedule with direct inspector and drone, anchor, interval, frequency, and reminder days', async () => {
    mockCreateRecurringSchedule.mockImplementation((_payload, { onSuccess }) => {
      onSuccess?.({ id: 'sched-101' });
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

    const recurringRadio = screen.getByLabelText(/Recurring schedule/i);
    fireEvent.click(recurringRadio);

    fireEvent.mouseDown(screen.getByLabelText(/Inspector/));
    fireEvent.click(await screen.findByRole('option', { name: /Inspector Alice/ }));

    fireEvent.mouseDown(screen.getByLabelText(/Drone/));
    fireEvent.click(await screen.findByRole('option', { name: /DJI-001/ }));

    const anchorInput = screen.getByLabelText(/First Inspection Date/i);
    fireEvent.change(anchorInput, { target: { value: '2026-11-01' } });

    const intervalInput = screen.getByLabelText(/Repeat Interval/i);
    fireEvent.change(intervalInput, { target: { value: '2' } });

    const reminderInput = screen.getByLabelText(/Reminder Days/i);
    fireEvent.change(reminderInput, { target: { value: '5' } });

    const submitBtn = screen.getByRole('button', { name: /Create Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateRecurringSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-1',
          anchor: '2026-11-01T08:00:00',
          interval: 2,
          reminderDays: 5,
          durationSeconds: expect.any(Number),
          inspectorId: 'insp-1',
          droneId: 'drone-1',
        }),
        expect.anything(),
      );
    });

    expect(handleSuccess).toHaveBeenCalledWith('sched-101');
    expect(handleClose).toHaveBeenCalled();
  });

  it('submits recurring schedule with selected inspector and drone', async () => {
    mockCreateRecurringSchedule.mockImplementation((_payload, { onSuccess }) => {
      onSuccess?.({ id: 'sched-102' });
    });

    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
      />,
    );

    const recurringRadio = screen.getByLabelText(/Recurring schedule/i);
    fireEvent.click(recurringRadio);

    fireEvent.mouseDown(screen.getByLabelText(/Inspector/));
    fireEvent.click(await screen.findByRole('option', { name: /Inspector Bob/ }));

    fireEvent.mouseDown(screen.getByLabelText(/Drone/));
    fireEvent.click(await screen.findByRole('option', { name: /DJI-002/ }));

    const anchorInput = screen.getByLabelText(/First Inspection Date/i);
    fireEvent.change(anchorInput, { target: { value: '2026-12-01' } });

    const submitBtn = screen.getByRole('button', { name: /Create Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateRecurringSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-1',
          anchor: '2026-12-01T08:00:00',
          inspectorId: 'insp-2',
          droneId: 'drone-2',
        }),
        expect.anything(),
      );
    });
  });

  it('disables submit and shows warning alert when asset already has an active recurring schedule', () => {
    mockActiveSchedules = [
      {
        id: 'sched-existing',
        assetId: 'asset-1',
        status: 'ACTIVE',
      },
    ];

    renderWithClient(
      <CreateInspectionDialog
        open={true}
        onClose={vi.fn()}
        preselectedAssetId="asset-1"
        initialScheduleMode="RECURRING"
      />,
    );

    expect(
      screen.getByText(/This asset already has an active recurring inspection schedule/i),
    ).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: /Create Schedule/i });
    expect(submitBtn).toHaveProperty('disabled', true);
  });
});
