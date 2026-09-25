import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inspectionApi,
  type ManualFindingInput,
  type ReviewCandidateInput,
} from '../api/inspectionApi';

export const inspectionKeys = {
  all: ['inspections'] as const,
  assignments: () => [...inspectionKeys.all, 'assignments'] as const,
  checklist: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'checklist'] as const,
  evidence: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence'] as const,
  candidates: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'candidates'] as const,
};

export function useInspectionAssignments(enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.assignments(),
    queryFn: inspectionApi.listAssignments,
    enabled,
  });
}

export function useInspectionChecklist(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.checklist(inspectionId ?? ''),
    queryFn: () => inspectionApi.checklist(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useInspectionEvidence(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.evidence(inspectionId ?? ''),
    queryFn: () => inspectionApi.listEvidence(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useFindingCandidates(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.candidates(inspectionId ?? ''),
    queryFn: () => inspectionApi.listCandidates(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useStartInspection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: inspectionApi.start,
    onSuccess: () => client.invalidateQueries({ queryKey: inspectionKeys.assignments() }),
  });
}

export function useSaveChecklistResponse(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, value }: { itemId: string; value: { value: unknown } }) =>
      inspectionApi.saveChecklistResponse(inspectionId!, itemId, value),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.checklist(inspectionId) });
      }
    },
  });
}

export function useUploadInspectionEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => inspectionApi.uploadEvidence(inspectionId!, file),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      }
    },
  });
}

export function useAnalyzeEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      inspectionApi.analyzeEvidence(inspectionId!, evidenceId),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      }
    },
  });
}

export function useReviewFindingCandidate(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      input,
    }: {
      candidateId: string;
      input: ReviewCandidateInput;
    }) => inspectionApi.reviewCandidate(inspectionId!, candidateId, input),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      }
    },
  });
}

export function useCreateManualFinding(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualFindingInput) =>
      inspectionApi.createManualFinding(inspectionId!, input),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
    },
  });
}
