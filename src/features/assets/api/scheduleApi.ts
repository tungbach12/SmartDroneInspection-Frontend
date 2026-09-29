import { api } from '@/shared/api/client';
import type { FrequencyUnit } from './catalogApi';

export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface InspectionSchedule {
  id: string;
  assetId: string;
  checklistTemplateId: string;
  frequencyUnit: FrequencyUnit;
  frequencyInterval: number;
  nextDueAt: string;
  status: ScheduleStatus;
}

export const scheduleKeys = {
  all: ['inspection-schedules'] as const,
  forAsset: (assetId: string) => [...scheduleKeys.all, assetId] as const,
};

export const scheduleApi = {
  list: (assetId: string) =>
    api
      .get<InspectionSchedule[]>('/inspection-schedules', { params: { assetId } })
      .then((r) => r.data),

  pause: (scheduleId: string) =>
    api.post<InspectionSchedule>(`/inspection-schedules/${scheduleId}/pause`).then((r) => r.data),

  activate: (scheduleId: string) =>
    api
      .post<InspectionSchedule>(`/inspection-schedules/${scheduleId}/activate`)
      .then((r) => r.data),
};
