import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  assetApi,
  assetKeys,
  type AssetListFilters,
  type AssetReviewInput,
  type CreateAssetInput,
  type ReassignPairInput,
} from '../api/assetApi';

export function useAssets(filters: AssetListFilters, enabled = true) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetApi.list(filters),
    enabled,
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

export function useAssetPair(assetId: string | null | undefined) {
  return useQuery({
    queryKey: assetKeys.pair(assetId ?? ''),
    queryFn: () => assetApi.getActivePair(assetId!),
    enabled: Boolean(assetId),
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
  });
}

export function useReassignAssetPair() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: ReassignPairInput }) =>
      assetApi.reassignPair(assetId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: assetKeys.pair(variables.assetId) });
      showToast('Asset pair reassigned successfully');
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
