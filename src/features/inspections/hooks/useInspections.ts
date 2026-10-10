import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inspectionApi,
  type EvidenceQualityDecisionType,
  type FindingDecision,
  type ApproveReadinessInput,
  type InspectionListFilters,
  type ManualDraftInput,
  type ManualFindingInput,
  type PreparationInput,
  type ReturnReadinessInput,
  type ReviewCandidateInput,
} from '../api/inspectionApi';

export const inspectionKeys = {
  myCredentials: () => [...inspectionKeys.all, 'my-credentials'] as const,
  readinessSources: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'readiness-sources'] as const,
  readinessDecisions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'readiness-decisions'] as const,
  all: ['inspections'] as const,
  list: (filters: InspectionListFilters) => [...inspectionKeys.all, 'list', filters] as const,
  listWithReports: (filters: InspectionListFilters) =>
    [...inspectionKeys.all, 'list-with-reports', filters] as const,
  preparations: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'preparations'] as const,
  compliance: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'compliance'] as const,
  assignments: () => [...inspectionKeys.all, 'assignments'] as const,
  checklist: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'checklist'] as const,
  evidence: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence'] as const,
  evidenceQuality: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence-quality'] as const,
  candidates: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'candidates'] as const,
  findings: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'findings'] as const,
  reportVersions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'report-versions'] as const,
};

export function useInspections(filters: InspectionListFilters, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.list(filters),
    queryFn: () => inspectionApi.list(filters),
    enabled,
  });
}

export function useInspectionsWithReports(filters: InspectionListFilters, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.listWithReports(filters),
    queryFn: () => inspectionApi.listWithReports(filters),
    enabled,
  });
}

/** MF2-01: pairings an administrator opened for this Inspector that are still unanswered. */
export function useAssignmentInbox(enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.assignments(),
    queryFn: inspectionApi.listMyAssignments,
    enabled,
  });
}

/**
 * MF2-02: recording the answer to a pairing.
 *
 * <p>A decline suspends the pairing, so the inbox is refetched afterwards rather than patched: the
 * answered row must leave the list the server decides it belongs to.
 */
export function useRespondToAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      response,
      rejectionReason,
    }: {
      assignmentId: string;
      response: 'ACCEPTED' | 'REJECTED';
      /** Optional, but may be sent as undefined; the server treats blank as absent. */
      rejectionReason?: string | undefined;
    }) => inspectionApi.respondToAssignment(assignmentId, response, rejectionReason),
    onSuccess: () => client.invalidateQueries({ queryKey: inspectionKeys.assignments() }),
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

export function useMyCredentials(enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.myCredentials(),
    queryFn: inspectionApi.myCredentials,
    enabled,
  });
}

export function useReadinessSources(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.readinessSources(inspectionId ?? ''),
    queryFn: () => inspectionApi.readinessSources(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

/**
 * A decision invalidates the preparation, the compliance gate and the source lists the reviewer was
 * looking at, so all of them are refreshed. Leaving the gate stale would let a reviewer approve
 * against blockers the decision itself has changed.
 */
export function useApproveReadiness() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      preparationId,
      input,
    }: {
      inspectionId: string;
      preparationId: string;
      input: ApproveReadinessInput;
    }) => inspectionApi.approveReadiness(inspectionId, preparationId, input),
    onSuccess: (_result, { inspectionId }) => {
      invalidateReadiness(client, inspectionId);
    },
  });
}

export function useReturnReadiness() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      preparationId,
      input,
    }: {
      inspectionId: string;
      preparationId: string;
      input: ReturnReadinessInput;
    }) => inspectionApi.returnReadiness(inspectionId, preparationId, input),
    onSuccess: (_result, { inspectionId }) => {
      invalidateReadiness(client, inspectionId);
    },
  });
}

function invalidateReadiness(client: ReturnType<typeof useQueryClient>, inspectionId: string) {
  client.invalidateQueries({ queryKey: inspectionKeys.preparations(inspectionId) });
  client.invalidateQueries({ queryKey: inspectionKeys.compliance(inspectionId) });
  client.invalidateQueries({ queryKey: inspectionKeys.readinessSources(inspectionId) });
  client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
}

export function useInspectionPreparations(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.preparations(inspectionId ?? ''),
    queryFn: () => inspectionApi.listPreparations(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useComplianceGate(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.compliance(inspectionId ?? ''),
    queryFn: () => inspectionApi.complianceGate(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

/**
 * Saving a draft also refreshes the compliance gate: the gate reads the permit references recorded
 * on the same preparation, so a stale gate after a save would tell the reviewer the wrong thing.
 */
export function usePrepareShotList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, input }: { inspectionId: string; input: PreparationInput }) =>
      inspectionApi.prepareShotList(inspectionId, input),
    onSuccess: (_result, { inspectionId }) => {
      client.invalidateQueries({ queryKey: inspectionKeys.preparations(inspectionId) });
    },
  });
}

export function useSubmitPreparation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      preparationId,
      acknowledgment,
    }: {
      inspectionId: string;
      preparationId: string;
      acknowledgment: string;
    }) => inspectionApi.submitPreparation(inspectionId, preparationId, acknowledgment),
    onSuccess: (_result, { inspectionId }) => {
      client.invalidateQueries({ queryKey: inspectionKeys.preparations(inspectionId) });
    },
  });
}

export function useLinkPermitReferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, permitIds }: { inspectionId: string; permitIds: string[] }) =>
      inspectionApi.linkPermitReferences(inspectionId, permitIds),
    onSuccess: (_result, { inspectionId }) => {
      client.invalidateQueries({ queryKey: inspectionKeys.preparations(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.compliance(inspectionId) });
    },
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

export function useEvidenceQualityHistory(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.evidenceQuality(inspectionId ?? ''),
    queryFn: () => inspectionApi.evidenceQualityHistory(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

/** MF3-03/04: accepting the evidence set is what makes it eligible for advisory detection. */
export function useDecideEvidenceQuality(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      decision: EvidenceQualityDecisionType;
      shotListComparison?: string;
      limitationReason?: string;
    }) => inspectionApi.decideEvidenceQuality(inspectionId!, input),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      }
    },
  });
}

export function useInspectionFindings(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.findings(inspectionId ?? ''),
    queryFn: () => inspectionApi.listFindings(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

/** MF3-09: the qualified reviewer's final decision on a finding. */
export function useDecideFinding(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      findingId,
      decision,
      rationale,
    }: {
      findingId: string;
      decision: FindingDecision;
      rationale?: string;
    }) => inspectionApi.decideFinding(inspectionId!, findingId, decision, rationale),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      }
    },
  });
}

export function useReportVersions(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.reportVersions(inspectionId ?? ''),
    queryFn: () => inspectionApi.listVersions(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useGenerateReportDraft(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => inspectionApi.generateDraft(inspectionId!),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

/** MF3-08: the author writes a structured draft when automated drafting is unavailable. */
export function useAuthorManualDraft(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualDraftInput) => inspectionApi.authorManualDraft(inspectionId!, input),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

/** MF3-08: the author verifies the draft against its sources, then submits it for review. */
export function useVerifyReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.verifyVersion(inspectionId!, versionId),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function useSubmitReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.submitVersion(inspectionId!, versionId),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

/** MF3-09: returning requires a reason; approval is an explicit act that never defaults. */
export function useReviewReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
      approve,
      reason,
    }: {
      versionId: string;
      approve: boolean;
      reason?: string;
    }) => inspectionApi.reviewVersion(inspectionId!, versionId, approve, reason),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function usePublishReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.publishVersion(inspectionId!, versionId),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}
