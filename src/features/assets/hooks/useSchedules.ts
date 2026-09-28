import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { scheduleApi, scheduleKeys, type InspectionSchedule } from '../api/scheduleApi';

export function useSchedules(assetId: string) {
  return useQuery({
    queryKey: scheduleKeys.forAsset(assetId),
    queryFn: () => scheduleApi.list(assetId),
    enabled: Boolean(assetId),
  });
}

export function useToggleSchedule(assetId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (schedule: InspectionSchedule) =>
      schedule.status === 'ACTIVE'
        ? scheduleApi.pause(schedule.id)
        : scheduleApi.activate(schedule.id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.forAsset(assetId) });
      showToast(data.status === 'ACTIVE' ? 'Schedule activated' : 'Schedule paused');
    },
  });
}
