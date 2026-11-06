import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  assetApi,
  assetKeys,
  type AssetListFilters,
  type CreateAssetInput,
} from '../api/assetApi';

export function useAssets(filters: AssetListFilters, enabled = true) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetApi.list(filters),
    enabled,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => assetApi.getById(id),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreateAssetInput) => assetApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      showToast('Asset created successfully');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to create asset', 'error');
    },
  });
}

export function useRetireAsset() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (assetId: string) => assetApi.retire(assetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      showToast('Asset retired and contract archived successfully');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to retire asset', 'error');
    },
  });
}

export function useUpdateAssetInspectionItems() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ assetId, inspectionItems }: { assetId: string; inspectionItems: string[] }) =>
      assetApi.updateInspectionItems(assetId, inspectionItems),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      showToast('Inspection items updated successfully');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update inspection items', 'error');
    },
  });
}
