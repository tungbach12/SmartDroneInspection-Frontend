import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringScheduleDetailDialog } from './RecurringScheduleDetailDialog';
import type { RecurringScheduleDetail } from '../api/recurringScheduleApi';

const mockPause = vi.fn();
const mockResume = vi.fn();
const mockEnd = vi.fn();
const mockRetry = vi.fn();
const mockSkip = vi.fn();

const mockScheduleData: RecurringScheduleDetail = {
  id: 'sched-1',
  organizationId: 'org-1',
  assetId: 'asset-1',
  assetName: 'Bridge Alpha',
  assetLocationText: 'North Sector',
  createdByUserId: 'user-1',
  createdByName: 'Manager Bob',
  inspectorId: 'insp-1',
  inspectorName: 'Inspector Alice',
  droneId: 'drone-1',
  droneSerialNumber: 'DJI-001',
  droneModel: 'Matrice 300',
  objective: 'Bi-weekly Crack Survey',
  scope: 'Visual and Thermal',
  componentScope: 'Pier 1-4',
  acceptanceCriteria: 'Coverage 100%',
  anchor: '2026-11-01T09:00:00',
  timezone: 'Asia/Ho_Chi_Minh',
  unit: 'WEEK',
  interval: 2,
  durationSeconds: 7200,
  reminderDays: 3,
  endsAt: null,
  status: 'ACTIVE',
  nextOccurrenceIndex: 1,
  nextDueAt: '2026-11-15T02:00:00Z',
  totalGeneratedOccurrences: 1,
  totalBlockedOccurrences: 1,
  createdAt: '2026-10-26T10:00:00Z',
  updatedAt: '2026-10-26T10:00:00Z',
  occurrences: [
    {
      id: 'occ-1',
      scheduleId: 'sched-1',
      occurrenceIndex: 0,
      occurrenceKey: '2026-11-01T02:00:00Z',
      plannedStartAt: '2026-11-01T02:00:00Z',
      plannedEndAt: '2026-11-01T04:00:00Z',
      status: 'GENERATED',
      inspectionId: 'insp-100',
      blockedReason: null,
      retryCount: 0,
      createdAt: '2026-10-26T10:00:00Z',
      updatedAt: '2026-10-26T10:00:00Z',
    },
    {
      id: 'occ-2',
      scheduleId: 'sched-1',
      occurrenceIndex: 1,
      occurrenceKey: '2026-11-15T02:00:00Z',
      plannedStartAt: '2026-11-15T02:00:00Z',
      plannedEndAt: '2026-11-15T04:00:00Z',
      status: 'BLOCKED',
      inspectionId: null,
      blockedReason: 'Schedule conflict with inspection INSP-99',
      retryCount: 0,
      createdAt: '2026-10-26T10:00:00Z',
      updatedAt: '2026-10-26T10:00:00Z',
    },
  ],
};

let currentDetailData: RecurringScheduleDetail | null = mockScheduleData;

vi.mock('../hooks/useRecurringSchedules', () => ({
  useRecurringSchedule: () => ({
    data: currentDetailData,
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
    mutate: mockRetry,
    isPending: false,
  }),
  useSkipScheduleOccurrence: () => ({
    mutate: mockSkip,
    isPending: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RecurringScheduleDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentDetailData = mockScheduleData;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders schedule details, occurrences, and blocked reason', async () => {
    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Bi-weekly Crack Survey')).toBeTruthy();
    expect(screen.getByText(/Bridge Alpha/)).toBeTruthy();
    expect(screen.getByText(/Inspector Alice/)).toBeTruthy();
    expect(screen.getByText(/DJI-001/)).toBeTruthy();
    expect(screen.getByText(/Schedule conflict with inspection INSP-99/)).toBeTruthy();
    expect(screen.getByText('GENERATED')).toBeTruthy();
    expect(screen.getByText('BLOCKED')).toBeTruthy();
  });

  it('triggers pause schedule action when Pause is clicked', async () => {
    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    const pauseBtn = screen.getByRole('button', { name: /Pause/i });
    fireEvent.click(pauseBtn);

    expect(mockPause).toHaveBeenCalledWith('sched-1');
  });

  it('triggers resume schedule action when schedule is paused', async () => {
    currentDetailData = {
      ...mockScheduleData,
      status: 'PAUSED',
    };

    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    const resumeBtn = screen.getByRole('button', { name: /Resume/i });
    fireEvent.click(resumeBtn);

    expect(mockResume).toHaveBeenCalledWith('sched-1');
  });

  it('triggers end schedule action when End is clicked', async () => {
    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    const endBtn = screen.getByRole('button', { name: /End Schedule/i });
    fireEvent.click(endBtn);

    expect(mockEnd).toHaveBeenCalledWith('sched-1');
  });

  it('triggers retry occurrence when Retry is clicked on a blocked occurrence', async () => {
    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    expect(mockRetry).toHaveBeenCalledWith({
      scheduleId: 'sched-1',
      occurrenceId: 'occ-2',
    });
  });

  it('opens skip dialog and submits skip with reason', async () => {
    renderWithClient(
      <RecurringScheduleDetailDialog
        scheduleId="sched-1"
        open={true}
        onClose={vi.fn()}
      />,
    );

    const skipBtn = screen.getByRole('button', { name: /Skip/i });
    fireEvent.click(skipBtn);

    expect(await screen.findByText(/Skip Occurrence/i)).toBeTruthy();

    const reasonInput = screen.getByLabelText(/Skip reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Weather conditions hazardous' } });

    const confirmSkipBtn = screen.getByRole('button', { name: /Confirm Skip/i });
    fireEvent.click(confirmSkipBtn);

    expect(mockSkip).toHaveBeenCalledWith(
      {
        scheduleId: 'sched-1',
        occurrenceId: 'occ-2',
        reason: 'Weather conditions hazardous',
      },
      expect.anything(),
    );
  });
});
