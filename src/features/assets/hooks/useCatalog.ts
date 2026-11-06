import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  catalogApi,
  catalogKeys,
  type CategoryInput,
  type ChecklistTemplateType,
  type CreateChecklistTemplateInput,
  type UpdateChecklistTemplateInput,
} from '../api/catalogApi';

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: () => catalogApi.listCategories(),
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

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      catalogApi.updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.categories() });
      showToast('Category updated');
    },
  });
}

export function useChecklistTemplates(
  params?: { type?: ChecklistTemplateType; categoryId?: string | null },
  enabled = true,
) {
  return useQuery({
    queryKey: catalogKeys.checklistTemplates(params?.type, params?.categoryId),
    queryFn: () => catalogApi.listChecklistTemplates(params),
    enabled,
  });
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreateChecklistTemplateInput) => catalogApi.createChecklistTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      showToast('Checklist item added');
    },
  });
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateChecklistTemplateInput }) =>
      catalogApi.updateChecklistTemplate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      showToast('Checklist item updated');
    },
  });
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteChecklistTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      showToast('Checklist item removed');
    },
  });
}
