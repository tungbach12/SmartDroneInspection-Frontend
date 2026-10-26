import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  droneApi,
  droneKeys,
  type CreateDroneInput,
  type DroneServiceability,
} from '../api/droneApi';

export function useDrones() {
  return useQuery({
    queryKey: droneKeys.list(),
    queryFn: () => droneApi.list(),
  });
}

export function useDroneSelection() {
  return useQuery({
    queryKey: droneKeys.selection(),
    queryFn: () => droneApi.selection(),
  });
}

export function useDrone(id: string, enabled = true) {
  return useQuery({
    queryKey: droneKeys.detail(id),
    queryFn: () => droneApi.getById(id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateDrone() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: CreateDroneInput) => droneApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      showToast('Drone registered');
    },
  });
}

export function useUpdateDroneServiceability() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      id,
      serviceability,
    }: {
      id: string;
      serviceability: DroneServiceability;
    }) => droneApi.updateServiceability(id, { serviceability }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      void queryClient.invalidateQueries({
        queryKey: droneKeys.detail(variables.id),
      });
      showToast('Drone serviceability updated');
    },
  });
}
