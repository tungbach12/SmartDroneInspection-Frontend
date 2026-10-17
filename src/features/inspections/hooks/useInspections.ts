import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  inspectionApi,
  type CandidateStatus,
  type EvidenceQualityDecisionType,
  type FindingDecision,
  type ApproveReadinessInput,
  type InspectionListFilters,
  type ManualDraftInput,
  type ManualFindingInput,
  type PreparationInput,
  type ReturnReadinessInput,
  type ReviewCandidateInput,
  type ReportSectionsInput,
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
  evidence: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence'] as const,
  evidenceQuality: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence-quality'] as const,
  candidates: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'candidates'] as const,
  findings: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'findings'] as const,
  workflowState: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'workflow-state'] as const,
  reportVersions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'report-versions'] as const,
  reportVersion: (inspectionId: string, versionId: string) =>
    [...inspectionKeys.all, inspectionId, 'report-version', versionId] as const,
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

export function useUploadInspectionEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => inspectionApi.uploadEvidence(inspectionId!, file),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function useRetireEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenceId, reason }: { evidenceId: string; reason: string }) =>
      inspectionApi.retireEvidence(inspectionId!, evidenceId, reason),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
  });
}

export function useBulkRetireEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenceIds, reason }: { evidenceIds: string[]; reason: string }) =>
      inspectionApi.bulkRetireEvidence(inspectionId!, evidenceIds, reason),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
  });
}

/**
 * MF3-05 advisory detection. Every image of the accepted set is analysed in parallel and each
 * result is written into the candidate cache as it arrives, so the Findings list fills in image by
 * image instead of waiting for the slowest one. A failure on one image leaves the others running
 * and the manual path open.
 */
export function useAnalyzeEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  const [analysingIds, setAnalysingIds] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);

  const analyzeMany = useCallback(
    async (evidenceIds: string[], options?: { replace?: boolean }) => {
      if (!inspectionId || evidenceIds.length === 0) {
        return;
      }
      setError(null);
      setAnalysingIds((current) => [
        ...current,
        ...evidenceIds.filter((evidenceId) => !current.includes(evidenceId)),
      ]);
      await Promise.allSettled(
        evidenceIds.map(async (evidenceId) => {
          try {
            const created = await inspectionApi.analyzeEvidence(
              inspectionId,
              evidenceId,
              options?.replace ?? false,
            );
            client.setQueryData<CandidateStatus[]>(
              inspectionKeys.candidates(inspectionId),
              (existing) => [
                ...created,
                ...(existing ?? []).filter(
                  (candidate) => candidate.evidenceId !== evidenceId,
                ),
              ],
            );
          } catch (failure) {
            setError(failure);
          } finally {
            setAnalysingIds((current) => current.filter((id) => id !== evidenceId));
          }
        }),
      );
      client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
    },
    [client, inspectionId],
  );

  return {
    analyzeMany,
    analysingIds,
    isPending: analysingIds.length > 0,
    error,
    isError: error !== null,
  };
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
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      }
    },
  });
}

export function useReviseReviewedCandidate(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      input,
    }: {
      candidateId: string;
      input: ReviewCandidateInput;
    }) => inspectionApi.reviseReviewedCandidate(inspectionId!, candidateId, input),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.all });
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
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function useUpdateFinding(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, input }: { findingId: string; input: ManualFindingInput }) =>
      inspectionApi.updateFinding(inspectionId!, findingId, input),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
  });
}

export function useDeleteFinding(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, reason }: { findingId: string; reason: string }) =>
      inspectionApi.deleteFinding(inspectionId!, findingId, reason),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.candidates(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
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

export function useInspectionWorkflowState(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.workflowState(inspectionId ?? ''),
    queryFn: () => inspectionApi.workflowState(inspectionId!),
    enabled: Boolean(inspectionId),
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
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function useReopenFindings(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => inspectionApi.reopenFindings(inspectionId!),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
  });
}

export function useConfirmFindings(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (noFindingsAcknowledged: boolean) =>
      inspectionApi.confirmFindings(inspectionId!, noFindingsAcknowledged),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
      client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
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

/**
 * MF3-08: the author saves the Report 3 §3.7.2 sections they are accountable for.
 *
 * <p>Saving edits an existing draft version in place; it does not create a new version.
 */
export function useSaveReportSections(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { versionId: string; sections: ReportSectionsInput }) =>
      inspectionApi.saveReportSections(inspectionId!, input.versionId, input.sections),
    onSuccess: (_data, input) => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({
          queryKey: inspectionKeys.reportVersion(inspectionId, input.versionId),
        });
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
      reasonType,
    }: {
      versionId: string;
      approve: boolean;
      reason?: string;
      reasonType?: 'TEXT_REVISION' | 'FINDINGS_REVISION';
    }) => inspectionApi.reviewVersion(inspectionId!, versionId, approve, reason, reasonType),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      }
    },
  });
}

export function useWithdrawReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, reason }: { versionId: string; reason: string }) =>
      inspectionApi.withdrawVersion(inspectionId!, versionId, reason),
    onSuccess: () => {
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
    },
  });
}

export function useRecordCorrectiveAction(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      findingId,
      correctiveActionRequired,
      priority,
      dueAt,
      rationale,
    }: {
      findingId: string;
      correctiveActionRequired: boolean;
      priority?: string;
      dueAt?: string;
      rationale: string;
    }) => {
      const input: {
        correctiveActionRequired: boolean;
        priority?: string;
        dueAt?: string;
        rationale: string;
      } = { correctiveActionRequired, rationale };
      if (priority !== undefined) {
        input.priority = priority;
      }
      if (dueAt !== undefined) {
        input.dueAt = dueAt;
      }
      return inspectionApi.recordCorrectiveAction(inspectionId!, findingId, input);
    },
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      }
    },
  });
}

export function useDeclareNoCorrectiveWork(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (rationale: string) =>
      inspectionApi.declareNoCorrectiveWork(inspectionId!, rationale),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}

export function useCompleteCorrectiveHandoff(inspectionId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => inspectionApi.completeCorrectiveHandoff(inspectionId!),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
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
        // Publishing moves the inspection to REPORT_PUBLISHED, which is what reveals the MF3-12
        // corrective-outcome panel on the report page.
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
  });
}
