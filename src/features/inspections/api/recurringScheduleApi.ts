import { api } from '@/shared/api/client';

export type RecurrenceUnit = 'WEEK' | 'MONTH' | 'YEAR';

export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

export type OccurrenceStatus = 'GENERATED' | 'BLOCKED' | 'SKIPPED';

export interface CreateRecurringScheduleInput {
  assetId: string;
  objective: string;
  scope?: string | null | undefined;
  componentScope?: string | null | undefined;
  acceptanceCriteria?: string | null | undefined;
  anchor: string;
  timezone: string;
  unit: RecurrenceUnit;
  interval: number;
  durationSeconds: number;
  reminderDays?: number | undefined;
  endsAt?: string | null | undefined;
  inspectorId?: string | null | undefined;
  droneId?: string | null | undefined;
}

export interface RecurringSchedule {
  id: string;
  organizationId: string;
  assetId: string;
  assetName: string | null;
  assetLocationText: string | null;
  createdByUserId: string;
  createdByName: string | null;
  inspectorId: string;
  inspectorName: string | null;
  droneId: string;
  droneSerialNumber: string | null;
  droneModel: string | null;
  objective: string;
  scope: string | null;
  componentScope: string | null;
  acceptanceCriteria: string | null;
  anchor: string;
  timezone: string;
  unit: RecurrenceUnit;
  interval: number;
  durationSeconds: number;
  reminderDays: number;
  endsAt: string | null;
  status: ScheduleStatus;
  nextOccurrenceIndex: number;
  nextDueAt: string | null;
  totalGeneratedOccurrences: number;
  totalBlockedOccurrences: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleOccurrence {
  id: string;
  scheduleId: string;
  occurrenceIndex: number;
  occurrenceKey: string;
  plannedStartAt: string;
  plannedEndAt: string;
  status: OccurrenceStatus;
  inspectionId: string | null;
  blockedReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringScheduleDetail extends RecurringSchedule {
  occurrences: ScheduleOccurrence[];
}

export interface RecurringSchedulePage {
  items: RecurringSchedule[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface RecurringScheduleFilters {
  page?: number | undefined;
  size?: number | undefined;
  assetId?: string | undefined;
  status?: ScheduleStatus | undefined;
}

export const recurringScheduleApi = {
  create: (input: CreateRecurringScheduleInput): Promise<RecurringSchedule> =>
    api.post<RecurringSchedule>('/inspection-schedules', input).then((r) => r.data),

  list: (filters?: RecurringScheduleFilters): Promise<RecurringSchedulePage> =>
    api.get<RecurringSchedulePage>('/inspection-schedules', { params: filters }).then((r) => r.data),

  getById: (scheduleId: string): Promise<RecurringScheduleDetail> =>
    api.get<RecurringScheduleDetail>(`/inspection-schedules/${scheduleId}`).then((r) => r.data),

  pause: (scheduleId: string): Promise<RecurringSchedule> =>
    api.post<RecurringSchedule>(`/inspection-schedules/${scheduleId}/pause`).then((r) => r.data),

  resume: (scheduleId: string): Promise<RecurringSchedule> =>
    api.post<RecurringSchedule>(`/inspection-schedules/${scheduleId}/resume`).then((r) => r.data),

  end: (scheduleId: string): Promise<RecurringSchedule> =>
    api.post<RecurringSchedule>(`/inspection-schedules/${scheduleId}/end`).then((r) => r.data),

  retryOccurrence: (scheduleId: string, occurrenceId: string): Promise<ScheduleOccurrence> =>
    api
      .post<ScheduleOccurrence>(`/inspection-schedules/${scheduleId}/occurrences/${occurrenceId}/retry`)
      .then((r) => r.data),

  skipOccurrence: (
    scheduleId: string,
    occurrenceId: string,
    reason: string,
  ): Promise<ScheduleOccurrence> =>
    api
      .post<ScheduleOccurrence>(`/inspection-schedules/${scheduleId}/occurrences/${occurrenceId}/skip`, {
        reason,
      })
      .then((r) => r.data),
};
