import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recurringScheduleApi } from '../api/recurringScheduleApi';
import {
  recurringScheduleKeys,
  useCreateRecurringSchedule,
  useEndRecurringSchedule,
  usePauseRecurringSchedule,
  useRecurringSchedule,
  useRecurringSchedules,
  useResumeRecurringSchedule,
  useRetryScheduleOccurrence,
  useSkipScheduleOccurrence,
} from './useRecurringSchedules';

vi.mock('../api/recurringScheduleApi', () => ({
  recurringScheduleApi: {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    end: vi.fn(),
    retryOccurrence: vi.fn(),
    skipOccurrence: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useRecurringSchedules hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recurring schedules list', async () => {
    const mockData = {
      items: [{ id: 'sched-1', status: 'ACTIVE' as const }],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    };
    vi.mocked(recurringScheduleApi.list).mockResolvedValueOnce(mockData as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSchedules({ status: 'ACTIVE' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(recurringScheduleApi.list).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('fetches recurring schedule detail', async () => {
    const mockDetail = {
      id: 'sched-1',
      status: 'ACTIVE' as const,
      occurrences: [],
    };
    vi.mocked(recurringScheduleApi.getById).mockResolvedValueOnce(mockDetail as any);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRecurringSchedule('sched-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDetail);
    expect(recurringScheduleApi.getById).toHaveBeenCalledWith('sched-1');
  });

  it('creates recurring schedule and invalidates cache', async () => {
    const mockCreated = { id: 'sched-2', status: 'ACTIVE' as const };
    vi.mocked(recurringScheduleApi.create).mockResolvedValueOnce(mockCreated as any);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRecurringSchedule(), { wrapper });

    result.current.mutate({
      assetId: 'asset-1',
      anchor: '2026-11-01T09:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      unit: 'WEEK',
      interval: 1,
      durationSeconds: 7200,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.create).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: recurringScheduleKeys.all });
  });

  it('pauses, resumes, and ends schedule', async () => {
    const mockSchedule = { id: 'sched-1', status: 'PAUSED' as const };
    vi.mocked(recurringScheduleApi.pause).mockResolvedValueOnce(mockSchedule as any);
    vi.mocked(recurringScheduleApi.resume).mockResolvedValueOnce({ ...mockSchedule, status: 'ACTIVE' } as any);
    vi.mocked(recurringScheduleApi.end).mockResolvedValueOnce({ ...mockSchedule, status: 'ENDED' } as any);

    const { wrapper } = createWrapper();

    const pauseHook = renderHook(() => usePauseRecurringSchedule(), { wrapper });
    pauseHook.result.current.mutate('sched-1');
    await waitFor(() => expect(pauseHook.result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.pause).toHaveBeenCalledWith('sched-1');

    const resumeHook = renderHook(() => useResumeRecurringSchedule(), { wrapper });
    resumeHook.result.current.mutate('sched-1');
    await waitFor(() => expect(resumeHook.result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.resume).toHaveBeenCalledWith('sched-1');

    const endHook = renderHook(() => useEndRecurringSchedule(), { wrapper });
    endHook.result.current.mutate('sched-1');
    await waitFor(() => expect(endHook.result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.end).toHaveBeenCalledWith('sched-1');
  });

  it('retries and skips occurrences', async () => {
    const mockOccurrence = { id: 'occ-1', scheduleId: 'sched-1', status: 'GENERATED' as const };
    vi.mocked(recurringScheduleApi.retryOccurrence).mockResolvedValueOnce(mockOccurrence as any);
    vi.mocked(recurringScheduleApi.skipOccurrence).mockResolvedValueOnce({ ...mockOccurrence, status: 'SKIPPED' } as any);

    const { wrapper } = createWrapper();

    const retryHook = renderHook(() => useRetryScheduleOccurrence(), { wrapper });
    retryHook.result.current.mutate({ scheduleId: 'sched-1', occurrenceId: 'occ-1' });
    await waitFor(() => expect(retryHook.result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.retryOccurrence).toHaveBeenCalledWith('sched-1', 'occ-1');

    const skipHook = renderHook(() => useSkipScheduleOccurrence(), { wrapper });
    skipHook.result.current.mutate({
      scheduleId: 'sched-1',
      occurrenceId: 'occ-1',
      reason: 'Bad weather',
    });
    await waitFor(() => expect(skipHook.result.current.isSuccess).toBe(true));
    expect(recurringScheduleApi.skipOccurrence).toHaveBeenCalledWith('sched-1', 'occ-1', 'Bad weather');
  });
});
