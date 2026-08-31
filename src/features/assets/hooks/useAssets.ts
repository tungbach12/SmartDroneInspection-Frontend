import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { assetApi, assetKeys, type AssetListFilters, type CreateAssetInput } from '../api/assetApi';

export function useAssets(filters: AssetListFilters) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetApi.list(filters),
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
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      showToast('Asset created');
    },
  });
}
