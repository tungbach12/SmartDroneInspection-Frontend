import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  assetApi,
  assetKeys,
  type AssetListFilters,
  type AssetReviewInput,
  type CreateAssetInput,
} from '../api/assetApi';

export function useAssets(filters: AssetListFilters) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetApi.list(filters),
  });
}

export function usePendingReviewAssets(filters: AssetListFilters) {
  return useQuery({
    queryKey: assetKeys.pendingReview(),
    queryFn: () => assetApi.listPendingReview(filters),
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
      showToast('Asset submitted for review');
    },
  });
}

export function useReviewAsset() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssetReviewInput }) =>
      assetApi.review(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['proposals', variables.id] });
      showToast(
        variables.input.action === 'APPROVE'
          ? `Approved — ${data.proposalCount} proposal(s) generated`
          : 'Asset rejected',
      );
    },
  });
}
