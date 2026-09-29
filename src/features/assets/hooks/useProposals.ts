import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { proposalApi, proposalKeys, type ProposalReviewInput } from '../api/proposalApi';

export function useProposals(assetId: string) {
  return useQuery({
    queryKey: proposalKeys.forAsset(assetId),
    queryFn: () => proposalApi.listForAsset(assetId),
    enabled: Boolean(assetId),
  });
}

export function useSelectProposal(assetId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (proposalId: string) => proposalApi.select(proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: proposalKeys.forAsset(assetId) });
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
      void queryClient.invalidateQueries({ queryKey: ['inspection-schedules', assetId] });
      showToast('Schedule selected');
    },
  });
}

export function useReviewProposal(assetId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProposalReviewInput }) =>
      proposalApi.review(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: proposalKeys.forAsset(assetId) });
      showToast(
        variables.input.action === 'APPROVE' ? 'Proposal approved' : 'Proposal rejected',
      );
    },
  });
}
