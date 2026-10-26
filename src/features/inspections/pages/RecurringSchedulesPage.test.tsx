import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecurringSchedulesPage from './RecurringSchedulesPage';

const mockPause = vi.fn();
const mockResume = vi.fn();
const mockEnd = vi.fn();

const mockSchedulesData = {
  items: [
    {
      id: 'sched-1',
      organizationId: 'org-1',
      assetId: 'asset-1',
      assetName: 'Solar Farm B',
      assetLocationText: 'Desert Sector',
      createdByUserId: 'user-1',
      createdByName: 'Manager Alice',
      inspectorId: 'insp-1',
      inspectorName: 'Inspector Dan',
      droneId: 'drone-1',
      droneSerialNumber: 'DJI-999',
      droneModel: 'Matrice 350',
      objective: 'Bi-weekly thermal panel inspection',
      scope: 'Thermal',
      componentScope: 'String 1-10',
      acceptanceCriteria: 'None',
      anchor: '2026-11-01T09:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      unit: 'WEEK' as const,
      interval: 2,
      durationSeconds: 7200,
      reminderDays: 3,
      endsAt: null,
      status: 'ACTIVE' as const,
      nextOccurrenceIndex: 0,
      nextDueAt: '2026-11-01T02:00:00Z',
      totalGeneratedOccurrences: 1,
      totalBlockedOccurrences: 0,
      createdAt: '2026-10-26T10:00:00Z',
      updatedAt: '2026-10-26T10:00:00Z',
    },
    {
      id: 'sched-2',
      organizationId: 'org-1',
      assetId: 'asset-2',
      assetName: 'Wind Turbine C',
      assetLocationText: 'Highlands',
      createdByUserId: 'user-1',
      createdByName: 'Manager Alice',
      inspectorId: 'insp-2',
      inspectorName: 'Inspector Eva',
      droneId: 'drone-2',
      droneSerialNumber: 'DJI-888',
      droneModel: 'Mavic 3T',
      objective: 'Monthly blade leading edge inspection',
      scope: 'Visual',
      componentScope: 'Blades',
      acceptanceCriteria: 'None',
      anchor: '2026-11-05T09:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      unit: 'MONTH' as const,
      interval: 1,
      durationSeconds: 14400,
      reminderDays: 3,
      endsAt: null,
      status: 'PAUSED' as const,
      nextOccurrenceIndex: 1,
      nextDueAt: '2026-12-05T02:00:00Z',
      totalGeneratedOccurrences: 2,
      totalBlockedOccurrences: 1,
      createdAt: '2026-10-26T10:00:00Z',
      updatedAt: '2026-10-26T10:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 2,
  totalPages: 1,
};

vi.mock('../hooks/useRecurringSchedules', () => ({
  useRecurringSchedules: () => ({
    data: mockSchedulesData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecurringSchedule: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  usePauseRecurringSchedule: () => ({
    mutate: mockPause,
    isPending: false,
  }),
  useResumeRecurringSchedule: () => ({
    mutate: mockResume,
    isPending: false,
  }),
  useEndRecurringSchedule: () => ({
    mutate: mockEnd,
    isPending: false,
  }),
  useRetryScheduleOccurrence: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useSkipScheduleOccurrence: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateRecurringSchedule: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('../hooks/useInspections', () => ({
  useCreateInspection: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: () => ({
    data: { items: [] },
    isLoading: false,
  }),
  useAssetPair: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock('@/features/assets/hooks/useDrones', () => ({
  useDroneSelection: () => ({
    data: [],
  }),
}));

vi.mock('@/features/workforce/hooks/useWorkforce', () => ({
  useWorkforceUsers: () => ({
    data: [],
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RecurringSchedulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders recurring schedules table with status chips and details', async () => {
    renderWithClient(<RecurringSchedulesPage />);

    expect(await screen.findByText('Recurring Inspection Schedules')).toBeTruthy();
    expect(screen.getByText('Solar Farm B')).toBeTruthy();
    expect(screen.getByText('Bi-weekly thermal panel inspection')).toBeTruthy();
    expect(screen.getByText('Wind Turbine C')).toBeTruthy();
    expect(screen.getByText('Monthly blade leading edge inspection')).toBeTruthy();

    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('PAUSED')).toBeTruthy();
  });

  it('pauses an active schedule from table action', async () => {
    renderWithClient(<RecurringSchedulesPage />);

    const pauseBtns = screen.getAllByRole('button', { name: /Pause/i });
    fireEvent.click(pauseBtns[0]!);

    expect(mockPause).toHaveBeenCalledWith('sched-1');
  });

  it('resumes a paused schedule from table action', async () => {
    renderWithClient(<RecurringSchedulesPage />);

    const resumeBtns = screen.getAllByRole('button', { name: /Resume/i });
    fireEvent.click(resumeBtns[0]!);

    expect(mockResume).toHaveBeenCalledWith('sched-2');
  });

  it('opens detail dialog when View Occurrences is clicked', async () => {
    renderWithClient(<RecurringSchedulesPage />);

    const viewBtns = screen.getAllByRole('button', { name: /Occurrences/i });
    fireEvent.click(viewBtns[0]!);

    // Detail dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });
});
