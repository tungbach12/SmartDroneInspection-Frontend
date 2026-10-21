import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useToastStore } from '@/shared/ui/Toast';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  fieldSessionApi,
  fieldSessionKeys,
} from '../api/fieldSessionApi';
import {
  inspectionApi,
  type Finding,
  type EvidenceQualityDecisionType,
  type ApproveReadinessInput,
  type CreateInspectionInput,
  type InspectionListFilters,
  type ManualDraftInput,
  type ManualFindingInput,
  type PreparationInput,
  type ReturnReadinessInput,
  type ReviewFindingInput,
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
  fieldSessions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'field-sessions'] as const,
  compliance: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'compliance'] as const,
  assignments: () => [...inspectionKeys.all, 'assignments'] as const,
  evidence: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence'] as const,
  evidenceQuery: (inspectionId: string, filters: EvidenceQueryFilters) =>
    [...inspectionKeys.all, inspectionId, 'evidence-query', filters] as const,
  evidenceQuality: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence-quality'] as const,
  removedFindings: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'removed-findings'] as const,
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

export function useInspection(inspectionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: [...inspectionKeys.all, 'detail', inspectionId] as const,
    queryFn: () => inspectionApi.getById(inspectionId!),
    enabled: enabled && Boolean(inspectionId),
  });
}

export function useCreateInspection() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreateInspectionInput) => inspectionApi.create(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: inspectionKeys.all });
      showToast('Inspection created and assigned');
    },
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

export interface EvidenceQueryFilters {
  status: 'ACTIVE' | 'RETIRED' | 'ALL';
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ALL';
  search: string;
  page: number;
  pageSize: number;
}

export function useInspectionEvidence(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.evidence(inspectionId ?? ''),
    queryFn: () => inspectionApi.listEvidence(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useInspectionEvidenceQuery(
  inspectionId: string | null,
  filters: EvidenceQueryFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: inspectionKeys.evidenceQuery(inspectionId ?? '', filters),
    queryFn: () => inspectionApi.queryEvidence(inspectionId!, filters),
    enabled: Boolean(inspectionId) && enabled,
    placeholderData: (previous) => previous,
  });
}

export function useEvidenceAnalysisStatuses(inspectionId: string | null) {
  return useQuery({
    queryKey: [...inspectionKeys.findings(inspectionId ?? ''), 'analysis-status'],
    queryFn: () => inspectionApi.listEvidenceAnalysisStatuses(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useRemovedFindings(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.removedFindings(inspectionId ?? ''),
    queryFn: () => inspectionApi.listRemovedFindings(inspectionId!),
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

/**
 * MF2-09 to MF2-12: the assigned Inspector's field sessions for this inspection.
 *
 * <p>The route is Inspector-only, so a reviewer must not request it; the caller passes whether the
 * current user may read it.
 */
export function useFieldSessions(inspectionId: string | null, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.fieldSessions(inspectionId ?? ''),
    queryFn: () => inspectionApi.listFieldSessions(inspectionId!),
    enabled: Boolean(inspectionId) && enabled,
  });
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
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ file, fieldSessionId }: { file: File; fieldSessionId?: string }) =>
      inspectionApi.uploadEvidence(inspectionId!, file, fieldSessionId),
    onSuccess: (item) => {
      showToast(item.deduplicated ? `Already uploaded: ${item.fileName}` : `Uploaded ${item.fileName}`,
        item.deduplicated ? 'info' : 'success');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
        client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'Evidence upload failed.'), 'error'),
  });
}

export function useUpdateEvidenceLocation(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ evidenceId, locationDescription }: { evidenceId: string; locationDescription: string }) =>
      inspectionApi.updateEvidenceLocation(inspectionId!, evidenceId, locationDescription),
    onSuccess: () => {
      showToast('Shared evidence location saved.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The shared evidence location was not saved.'), 'error'),
  });
}

export function useRetireEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ evidenceId, reason }: { evidenceId: string; reason: string }) =>
      inspectionApi.retireEvidence(inspectionId!, evidenceId, reason),
    onSuccess: () => {
      showToast('Evidence retired and retained for audit.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The capture was not retired.'), 'error'),
  });
}

export function useBulkRetireEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ evidenceIds, reason }: { evidenceIds: string[]; reason: string }) =>
      inspectionApi.bulkRetireEvidence(inspectionId!, evidenceIds, reason),
    onSuccess: (items) => {
      showToast(`Retired ${items.length} capture(s); originals remain available for audit.`);
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Bulk retirement was not completed.'), 'error'),
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
      const showToast = useToastStore.getState().showToast;
      const noDetectionEvidenceIds: string[] = [];
      const failures: unknown[] = [];
      let totalCandidates = 0;
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
            const newFindings = created.filter((finding) => finding.status === 'PENDING');
            if (newFindings.length === 0) noDetectionEvidenceIds.push(evidenceId);
            totalCandidates += newFindings.length;
            client.setQueryData<Finding[]>(
              inspectionKeys.findings(inspectionId),
              (existing) => [
                ...created,
                ...(existing ?? []).filter(
                  (finding) => finding.evidenceId !== evidenceId,
                ),
              ],
            );
          } catch (failure) {
            failures.push(failure);
            setError(failure);
          } finally {
            setAnalysingIds((current) => current.filter((id) => id !== evidenceId));
          }
        }),
      );
      client.invalidateQueries({ queryKey: [...inspectionKeys.findings(inspectionId), 'analysis-status'] });
      if (failures.length > 0) {
        const firstFailure = getErrorMessage(
          failures[0],
          'AI analysis failed; see the inline error for details.',
        );
        showToast(
          failures.length === 1
            ? firstFailure
            : `${failures.length} image analyses failed. ${firstFailure}`,
          'error',
        );
      } else if (noDetectionEvidenceIds.length > 0 && totalCandidates > 0) {
        showToast(
          `Analysis completed; ${totalCandidates} candidate(s) found and no defects detected in ${noDetectionEvidenceIds.length} image(s).`,
          'info',
        );
      } else if (noDetectionEvidenceIds.length > 0) {
        showToast(
          noDetectionEvidenceIds.length === 1
            ? 'Analysis completed; no defects were detected in this image.'
            : `Analysis completed; no defects were detected in ${noDetectionEvidenceIds.length} images.`,
          'info',
        );
      } else if (totalCandidates > 0) {
        showToast(`Analysis completed; ${totalCandidates} candidate(s) found.`, 'success');
      }
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

export function useConfirmFinding(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      findingId,
      input,
    }: {
      findingId: string;
      input: ReviewFindingInput;
    }) => inspectionApi.confirmFinding(inspectionId!, findingId, input),
    onSuccess: () => {
      showToast('Finding confirmed.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The finding was not confirmed.'), 'error'),
  });
}

export function useRestoreFinding(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (findingId: string) => inspectionApi.restoreFinding(inspectionId!, findingId),
    onSuccess: () => {
      showToast('Finding restored.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The finding was not restored.'), 'error'),
  });
}

export function useCreateManualFinding(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: ManualFindingInput) =>
      inspectionApi.createManualFinding(inspectionId!, input),
    onSuccess: () => {
      showToast('Manual finding added.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The manual finding was not saved.'), 'error'),
  });
}

export function useUpdateFinding(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ findingId, input }: { findingId: string; input: ManualFindingInput }) =>
      inspectionApi.updateFinding(inspectionId!, findingId, input),
    onSuccess: () => {
      showToast('Finding updated.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The finding was not updated.'), 'error'),
  });
}

export function useDeleteFinding(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ findingId, reason }: { findingId: string; reason: string }) =>
      inspectionApi.deleteFinding(inspectionId!, findingId, reason),
    onSuccess: () => {
      showToast('Finding removed from the confirmed set.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The finding was not removed.'), 'error'),
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
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: {
      decision: EvidenceQualityDecisionType;
      shotListComparison?: string;
      limitationReason?: string;
    }) => inspectionApi.decideEvidenceQuality(inspectionId!, input),
    onSuccess: (_data, variables) => {
      showToast(
        variables.decision === 'ACCEPTED'
          ? 'Evidence quality accepted; the set is ready for detection.'
          : variables.decision === 'ADDITIONAL_SESSION_REQUIRED'
            ? 'Additional field work requested. Update preparation and wait for readiness review.'
            : 'Evidence quality decision recorded.',
      );
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.preparations(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The evidence decision was not recorded.'), 'error'),
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

export function useReopenFindings(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.reopenFindings(inspectionId!),
    onSuccess: () => {
      showToast('Findings reopened for revision.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'Findings were not reopened.'), 'error'),
  });
}

export function useConfirmFindings(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (noFindingsAcknowledged: boolean) =>
      inspectionApi.confirmFindings(inspectionId!, noFindingsAcknowledged),
    onSuccess: () => {
      showToast('Findings confirmed and locked for the report stage.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
      client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'Findings were not confirmed.'), 'error'),
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
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.generateDraft(inspectionId!),
    onSuccess: () => {
      showToast('AI-assisted report draft created.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The AI-assisted draft was not created.'), 'error'),
  });
}

/** MF3-08: the author writes a structured draft when automated drafting is unavailable. */
export function useAuthorManualDraft(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: ManualDraftInput) => inspectionApi.authorManualDraft(inspectionId!, input),
    onSuccess: () => {
      showToast('Empty manual report draft created.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The manual report draft was not created.'), 'error'),
  });
}

/**
 * MF3-08: the author saves the Report 3 §3.7.2 sections they are accountable for.
 *
 * <p>Saving edits an existing draft version in place; it does not create a new version.
 */
export function useSaveReportSections(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: { versionId: string; sections: ReportSectionsInput }) =>
      inspectionApi.saveReportSections(inspectionId!, input.versionId, input.sections),
    onSuccess: (_data, input) => {
      showToast('Report sections saved.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({
          queryKey: inspectionKeys.reportVersion(inspectionId, input.versionId),
        });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report sections were not saved.'), 'error'),
  });
}

/** MF3-08: the author verifies the draft against its sources, then submits it for review. */
export function useVerifyReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.verifyVersion(inspectionId!, versionId),
    onSuccess: () => {
      showToast('Report verified by the author.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report was not verified.'), 'error'),
  });
}

export function useSubmitReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.submitVersion(inspectionId!, versionId),
    onSuccess: () => {
      showToast('Report submitted for Organization Admin review.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report was not submitted.'), 'error'),
  });
}

/** MF3-09: returning requires a reason; approval is an explicit act that never defaults. */
export function useReviewReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
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
    onSuccess: (_data, variables) => {
      showToast(variables.approve ? 'Report approved.' : 'Report returned to the Inspector.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report review was not recorded.'), 'error'),
  });
}

export function useWithdrawReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ versionId, reason }: { versionId: string; reason: string }) =>
      inspectionApi.withdrawVersion(inspectionId!, versionId, reason),
    onSuccess: () => {
      showToast('Submission withdrawn back to draft.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidenceQuality(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The submission was not withdrawn.'), 'error'),
  });
}

export function useRecordCorrectiveAction(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
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
      showToast('Corrective outcome recorded for this finding.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The corrective outcome was not recorded.'), 'error'),
  });
}

export function useDeclareNoCorrectiveWork(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (rationale: string) =>
      inspectionApi.declareNoCorrectiveWork(inspectionId!, rationale),
    onSuccess: () => {
      showToast('No corrective work declared; the inspection is closed.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The no-repair outcome was not recorded.'), 'error'),
  });
}

export function useCompleteCorrectiveHandoff(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (findingIds?: string[]) =>
      inspectionApi.completeCorrectiveHandoff(inspectionId!, findingIds),
    onSuccess: () => {
      showToast('Findings forwarded to Maintenance.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Failed to forward findings to Maintenance.'), 'error'),
  });
}

export function usePublishReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.publishVersion(inspectionId!, versionId),
    onSuccess: () => {
      showToast('Approved report published.');
      if (inspectionId) {
        // Publishing moves the inspection to REPORT_PUBLISHED, which is what reveals the MF3-12
        // corrective-outcome panel on the report page.
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report was not published.'), 'error'),
  });
}

/**
 * MF2-10: starting a session.
 *
 * Starting also moves the inspection into `IN_PROGRESS`, so the inspection collection and the
 * session list are both refetched rather than patched.
 */
export function useStartFieldSession(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (preFlightChecklistNote: string) =>
      fieldSessionApi.start(inspectionId!, preFlightChecklistNote),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.forInspection(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Field session started');
    },
  });
}

/** MF2-09: postponement and MF2-11: abort. Both need the Inspector's own stated reason. */
export function useFieldSessionOutcome(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      sessionId,
      outcome,
      reason,
    }: {
      sessionId: string;
      outcome: 'postpone' | 'abort';
      reason: string;
    }) =>
      outcome === 'postpone'
        ? fieldSessionApi.postpone(inspectionId!, sessionId, reason)
        : fieldSessionApi.abort(inspectionId!, sessionId, reason),
    onSuccess: (_data, variables) => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.forInspection(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast(
        variables.outcome === 'postpone'
          ? 'Session postponed'
          : 'Session aborted',
      );
    },
  });
}
