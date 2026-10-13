import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  permitApi,
  permitKeys,
  type CreateFlightPermitInput,
  type ReviewFlightPermitInput,
} from '../api/permitApi';

export function useFlightPermits() {
  return useQuery({
    queryKey: permitKeys.list(),
    queryFn: () => permitApi.list(),
  });
}

export function useCreateFlightPermit() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: CreateFlightPermitInput) => permitApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permitKeys.all });
      showToast('Permit record created');
    },
  });
}

export function useReviewFlightPermit() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewFlightPermitInput }) =>
      permitApi.review(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permitKeys.all });
      showToast('Internal permit record updated');
    },
  });
}
