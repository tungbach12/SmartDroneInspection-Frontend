import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  catalogApi,
  catalogKeys,
  type CategoryInput,
  type SuggestedFrequencyInput,
} from '../api/catalogApi';

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: () => catalogApi.listCategories(),
  });
}

export function useFrequencies(categoryId: string) {
  return useQuery({
    queryKey: catalogKeys.frequencies(categoryId),
    queryFn: () => catalogApi.listFrequencies(categoryId),
    enabled: Boolean(categoryId),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CategoryInput) => catalogApi.createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.categories() });
      showToast('Category saved');
    },
  });
}

export function useAddFrequency(categoryId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: SuggestedFrequencyInput) => catalogApi.addFrequency(categoryId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.frequencies(categoryId) });
      showToast('Suggested frequency added');
    },
  });
}

export function useDeleteFrequency(categoryId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (frequencyId: string) => catalogApi.deleteFrequency(categoryId, frequencyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.frequencies(categoryId) });
      showToast('Suggested frequency removed');
    },
  });
}
