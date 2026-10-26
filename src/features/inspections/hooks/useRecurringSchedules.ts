import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  recurringScheduleApi,
  type CreateRecurringScheduleInput,
  type RecurringSchedule,
  type RecurringScheduleDetail,
  type RecurringScheduleFilters,
  type RecurringSchedulePage,
  type ScheduleOccurrence,
} from '../api/recurringScheduleApi';

export const recurringScheduleKeys = {
  all: ['recurring-schedules'] as const,
  lists: () => [...recurringScheduleKeys.all, 'list'] as const,
  list: (filters?: RecurringScheduleFilters) =>
    [...recurringScheduleKeys.lists(), filters] as const,
  details: () => [...recurringScheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...recurringScheduleKeys.details(), id] as const,
};

export function useRecurringSchedules(
  filters?: RecurringScheduleFilters,
  enabled = true,
) {
  return useQuery<RecurringSchedulePage>({
    queryKey: recurringScheduleKeys.list(filters),
    queryFn: () => recurringScheduleApi.list(filters),
    enabled,
  });
}

export function useRecurringSchedule(scheduleId: string, enabled = true) {
  return useQuery<RecurringScheduleDetail>({
    queryKey: recurringScheduleKeys.detail(scheduleId),
    queryFn: () => recurringScheduleApi.getById(scheduleId),
    enabled: Boolean(scheduleId) && enabled,
  });
}

export function useCreateRecurringSchedule() {
  const queryClient = useQueryClient();
  return useMutation<RecurringSchedule, Error, CreateRecurringScheduleInput>({
    mutationFn: (input) => recurringScheduleApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function usePauseRecurringSchedule() {
  const queryClient = useQueryClient();
  return useMutation<RecurringSchedule, Error, string>({
    mutationFn: (scheduleId) => recurringScheduleApi.pause(scheduleId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.detail(data.id) });
    },
  });
}

export function useResumeRecurringSchedule() {
  const queryClient = useQueryClient();
  return useMutation<RecurringSchedule, Error, string>({
    mutationFn: (scheduleId) => recurringScheduleApi.resume(scheduleId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.detail(data.id) });
    },
  });
}

export function useEndRecurringSchedule() {
  const queryClient = useQueryClient();
  return useMutation<RecurringSchedule, Error, string>({
    mutationFn: (scheduleId) => recurringScheduleApi.end(scheduleId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.detail(data.id) });
    },
  });
}

export function useRetryScheduleOccurrence() {
  const queryClient = useQueryClient();
  return useMutation<
    ScheduleOccurrence,
    Error,
    { scheduleId: string; occurrenceId: string }
  >({
    mutationFn: ({ scheduleId, occurrenceId }) =>
      recurringScheduleApi.retryOccurrence(scheduleId, occurrenceId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.detail(data.scheduleId) });
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function useSkipScheduleOccurrence() {
  const queryClient = useQueryClient();
  return useMutation<
    ScheduleOccurrence,
    Error,
    { scheduleId: string; occurrenceId: string; reason: string }
  >({
    mutationFn: ({ scheduleId, occurrenceId, reason }) =>
      recurringScheduleApi.skipOccurrence(scheduleId, occurrenceId, reason),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.detail(data.scheduleId) });
      void queryClient.invalidateQueries({ queryKey: recurringScheduleKeys.all });
    },
  });
}
