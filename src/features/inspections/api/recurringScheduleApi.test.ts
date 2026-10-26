import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api } from '@/shared/api/client';
import {
  recurringScheduleApi,
  type CreateRecurringScheduleInput,
  type RecurringScheduleFilters,
} from './recurringScheduleApi';

vi.mock('@/shared/api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('recurringScheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates recurring schedule via POST /inspection-schedules', async () => {
    const mockSchedule = {
      id: 'sched-1',
      organizationId: 'org-1',
      assetId: 'asset-1',
      objective: 'Weekly structural survey',
      anchor: '2026-11-01T09:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      unit: 'WEEK',
      interval: 1,
      durationSeconds: 7200,
      reminderDays: 3,
      status: 'ACTIVE',
    };

    vi.mocked(api.post).mockResolvedValueOnce({ data: mockSchedule });

    const input: CreateRecurringScheduleInput = {
      assetId: 'asset-1',
      objective: 'Weekly structural survey',
      anchor: '2026-11-01T09:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      unit: 'WEEK',
      interval: 1,
      durationSeconds: 7200,
      reminderDays: 3,
    };

    const result = await recurringScheduleApi.create(input);
    expect(api.post).toHaveBeenCalledWith('/inspection-schedules', input);
    expect(result).toEqual(mockSchedule);
  });

  it('lists recurring schedules via GET /inspection-schedules with query params', async () => {
    const mockPage = {
      items: [{ id: 'sched-1', status: 'ACTIVE' }],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPage });

    const filters: RecurringScheduleFilters = {
      page: 1,
      size: 20,
      status: 'ACTIVE',
      assetId: 'asset-1',
    };

    const result = await recurringScheduleApi.list(filters);
    expect(api.get).toHaveBeenCalledWith('/inspection-schedules', { params: filters });
    expect(result).toEqual(mockPage);
  });

  it('retrieves recurring schedule detail via GET /inspection-schedules/{scheduleId}', async () => {
    const mockDetail = {
      id: 'sched-1',
      status: 'ACTIVE',
      occurrences: [
        {
          id: 'occ-1',
          scheduleId: 'sched-1',
          occurrenceIndex: 0,
          status: 'GENERATED',
          inspectionId: 'insp-1',
        },
      ],
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: mockDetail });

    const result = await recurringScheduleApi.getById('sched-1');
    expect(api.get).toHaveBeenCalledWith('/inspection-schedules/sched-1');
    expect(result).toEqual(mockDetail);
  });

  it('pauses a recurring schedule via POST /inspection-schedules/{scheduleId}/pause', async () => {
    const mockPaused = { id: 'sched-1', status: 'PAUSED' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockPaused });

    const result = await recurringScheduleApi.pause('sched-1');
    expect(api.post).toHaveBeenCalledWith('/inspection-schedules/sched-1/pause');
    expect(result).toEqual(mockPaused);
  });

  it('resumes a recurring schedule via POST /inspection-schedules/{scheduleId}/resume', async () => {
    const mockResumed = { id: 'sched-1', status: 'ACTIVE' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockResumed });

    const result = await recurringScheduleApi.resume('sched-1');
    expect(api.post).toHaveBeenCalledWith('/inspection-schedules/sched-1/resume');
    expect(result).toEqual(mockResumed);
  });

  it('ends a recurring schedule via POST /inspection-schedules/{scheduleId}/end', async () => {
    const mockEnded = { id: 'sched-1', status: 'ENDED' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockEnded });

    const result = await recurringScheduleApi.end('sched-1');
    expect(api.post).toHaveBeenCalledWith('/inspection-schedules/sched-1/end');
    expect(result).toEqual(mockEnded);
  });

  it('retries a blocked occurrence via POST /inspection-schedules/{scheduleId}/occurrences/{occurrenceId}/retry', async () => {
    const mockOccurrence = {
      id: 'occ-1',
      scheduleId: 'sched-1',
      status: 'GENERATED',
      inspectionId: 'insp-2',
      retryCount: 1,
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockOccurrence });

    const result = await recurringScheduleApi.retryOccurrence('sched-1', 'occ-1');
    expect(api.post).toHaveBeenCalledWith(
      '/inspection-schedules/sched-1/occurrences/occ-1/retry',
    );
    expect(result).toEqual(mockOccurrence);
  });

  it('skips a blocked occurrence via POST /inspection-schedules/{scheduleId}/occurrences/{occurrenceId}/skip', async () => {
    const mockOccurrence = {
      id: 'occ-1',
      scheduleId: 'sched-1',
      status: 'SKIPPED',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: mockOccurrence });

    const result = await recurringScheduleApi.skipOccurrence('sched-1', 'occ-1', 'Asset under unscheduled repair');
    expect(api.post).toHaveBeenCalledWith(
      '/inspection-schedules/sched-1/occurrences/occ-1/skip',
      { reason: 'Asset under unscheduled repair' },
    );
    expect(result).toEqual(mockOccurrence);
  });
});
