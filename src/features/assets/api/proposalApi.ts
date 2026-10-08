import { api } from '@/shared/api/client';
import type { FrequencyUnit } from './catalogApi';

export type ProposalStatus =
  | 'GENERATED'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'ORG_ADMIN_SELECTED'
  | 'SUPERSEDED';

export interface Proposal {
  id: string;
  assetId: string;
  checklistTemplateId: string;
  frequencyUnit: FrequencyUnit;
  frequencyInterval: number;
  status: ProposalStatus;
  managerNote: string | null;
}

export interface ProposalReviewInput {
  action: 'APPROVE' | 'REJECT';
  note?: string;
  frequencyUnit?: FrequencyUnit;
  frequencyInterval?: number;
}

export const proposalKeys = {
  all: ['proposals'] as const,
  forAsset: (assetId: string) => [...proposalKeys.all, assetId] as const,
};

export const proposalApi = {
  listForAsset: (assetId: string) =>
    api.get<Proposal[]>('/schedule-proposals', { params: { assetId } }).then((r) => r.data),

  review: (proposalId: string, input: ProposalReviewInput) =>
    api.post<Proposal>(`/schedule-proposals/${proposalId}/review`, input).then((r) => r.data),

  select: (proposalId: string) =>
    api.post<Proposal>(`/schedule-proposals/${proposalId}/select`).then((r) => r.data),
};
