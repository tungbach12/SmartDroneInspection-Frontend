import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useToastStore } from '@/shared/ui/Toast';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  fieldSessionApi,
  fieldSessionKeys,
} from '../api/fieldSessionApi';
import { cacheUploadedFlightPermit } from '../components/FlightPermitPreviewDialog';
import {
  inspectionApi,
  type DraftFindingNoteResult,
  type Finding,
  type FindingSeverity,
  type CreateInspectionInput,
  type FlightPermitVerificationStatus,
  type InspectionListFilters,
  type ManualDraftInput,
  type ManualFindingInput,
  type PlatformAiAnalytics,
  type ReviewFindingInput,
  type UpdatePlatformAiSettingsInput,
  type UploadFlightPermitInput,
} from '../api/inspectionApi';

export const inspectionKeys = {
  all: ['inspections'] as const,
  detail: (inspectionId: string) => [...inspectionKeys.all, 'detail', inspectionId] as const,
  list: (filters: InspectionListFilters) => [...inspectionKeys.all, 'list', filters] as const,
  listWithReports: (filters: InspectionListFilters) =>
    [...inspectionKeys.all, 'list-with-reports', filters] as const,
  fieldSessions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'field-sessions'] as const,
  evidence: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'evidence'] as const,
  evidenceQuery: (inspectionId: string, filters: EvidenceQueryFilters) =>
    [...inspectionKeys.all, inspectionId, 'evidence-query', filters] as const,
  removedFindings: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'removed-findings'] as const,
  findings: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'findings'] as const,
  findingsQuery: (inspectionId: string, filters: Record<string, unknown>) =>
    [...inspectionKeys.all, inspectionId, 'findings-query', filters] as const,
  workflowState: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'workflow-state'] as const,
  reportVersions: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'report-versions'] as const,
  reportVersion: (inspectionId: string, versionId: string) =>
    [...inspectionKeys.all, inspectionId, 'report-version', versionId] as const,
  reinspectionVerifications: (inspectionId: string) =>
    [...inspectionKeys.all, inspectionId, 'reinspection-verifications'] as const,
  findingRecommendations: (inspectionId: string, findingId: string, limit: number) =>
    [...inspectionKeys.all, inspectionId, 'finding-recommendations', findingId, limit] as const,
  knowledgeRecommendations: (inspectionId: string, limit: number) =>
    [...inspectionKeys.all, inspectionId, 'knowledge-recommendations', limit] as const,
};

const FINDING_RECOMMENDATION_LIMIT = 3;
const INSPECTION_RECOMMENDATION_LIMIT = 4;

/** Historical cases / guidelines for a single finding. Fetched only when the strip is opened. */
export function useFindingRecommendations(
  inspectionId: string | null | undefined,
  findingId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: inspectionKeys.findingRecommendations(
      inspectionId ?? '',
      findingId,
      FINDING_RECOMMENDATION_LIMIT,
    ),
    queryFn: () =>
      inspectionApi.getFindingRecommendations(
        inspectionId!,
        findingId,
        FINDING_RECOMMENDATION_LIMIT,
      ),
    enabled: enabled && Boolean(inspectionId && findingId),
    staleTime: 60_000,
  });
}

/**
 * Asks the Backend AI to write one finding's technical note. The caller owns filling the Inspector's
 * Note edit box and keeping the tiny citations summary, so no queries are invalidated here.
 */
export function useDraftFindingNote(inspectionId: string) {
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      findingId,
      locale,
      existingNote,
    }: {
      findingId: string;
      locale?: string;
      existingNote?: string;
    }) =>
      inspectionApi.draftFindingNote(inspectionId, findingId, {
        ...(locale ? { locale } : {}),
        ...(existingNote !== undefined ? { existingNote } : {}),
      }),
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not draft the note with AI.'), 'error'),
  });
}

export interface DraftFindingNoteBatchTarget {
  finding: Finding;
  defectLabel?: string;
  severity?: FindingSeverity;
  existingNote?: string;
}

/**
 * Batch sibling of {@link useDraftFindingNote} triggered next to "Analyze all images":
 * drafts notes for all active findings with bounded concurrency, persists each generated note onto
 * the finding record, and updates the findings cache so the user can review & confirm right away.
 */
export function useDraftAllFindingNotes(inspectionId: string | null) {
  const client = useQueryClient();
  const [draftingIds, setDraftingIds] = useState<string[]>([]);
  const [draftedNotes, setDraftedNotes] = useState<Record<string, DraftFindingNoteResult>>({});
  const [error, setError] = useState<unknown>(null);

  const draftMany = useCallback(
    async (targets: DraftFindingNoteBatchTarget[], options?: { locale?: string }) => {
      if (!inspectionId || targets.length === 0) {
        return {
          draftedNotes: {} as Record<string, DraftFindingNoteResult>,
          updatedCount: 0,
          failedCount: 0,
        };
      }
      setError(null);
      const showToast = useToastStore.getState().showToast;
      const nextResults: Record<string, DraftFindingNoteResult> = {};
      const failures: unknown[] = [];
      let updatedCount = 0;

      const targetIds = targets.map((item) => item.finding.id);
      setDraftingIds((current) => [
        ...current,
        ...targetIds.filter((id) => !current.includes(id)),
      ]);

      const queue = [...targets];
      const workerCount = Math.min(3, queue.length);
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (queue.length > 0) {
            const next = queue.shift();
            if (!next) return;
            const { finding } = next;
            try {
              const drafted = await inspectionApi.draftFindingNote(inspectionId, finding.id, {
                ...(options?.locale ? { locale: options.locale } : {}),
                existingNote: next.existingNote ?? finding.technicalNotes ?? '',
              });
              const updated = await inspectionApi.updateFinding(inspectionId, finding.id, {
                evidenceId: finding.evidenceId ?? '',
                defectLabel: next.defectLabel ?? finding.defectLabel,
                severity: next.severity ?? finding.severity,
                technicalNotes: drafted.note,
              });
              nextResults[finding.id] = drafted;
              updatedCount += 1;
              setDraftedNotes((current) => ({ ...current, [finding.id]: drafted }));
              client.setQueryData<Finding[]>(inspectionKeys.findings(inspectionId), (existing) =>
                (existing ?? []).map((item) => (item.id === finding.id ? updated : item)),
              );
            } catch (failure) {
              failures.push(failure);
              setError(failure);
            } finally {
              setDraftingIds((current) => current.filter((id) => id !== finding.id));
            }
          }
        }),
      );

      if (failures.length > 0 && updatedCount === 0) {
        showToast(getErrorMessage(failures[0], 'Could not draft notes with AI.'), 'error');
      } else if (failures.length > 0) {
        showToast(
          `Drafted notes for ${updatedCount} finding(s); ${failures.length} failed.`,
          'info',
        );
      } else if (updatedCount > 0) {
        showToast(`Drafted notes for ${updatedCount} finding(s).`, 'success');
      }

      void client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      void client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });

      return { draftedNotes: nextResults, updatedCount, failedCount: failures.length };
    },
    [client, inspectionId],
  );

  return {
    draftMany,
    draftingIds,
    draftedNotes,
    isPending: draftingIds.length > 0,
    error,
    isError: error !== null,
  };
}

/** Report-level historical cases / guidelines for the AI summary footer. */
export function useInspectionKnowledgeRecommendations(
  inspectionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: inspectionKeys.knowledgeRecommendations(
      inspectionId ?? '',
      INSPECTION_RECOMMENDATION_LIMIT,
    ),
    queryFn: () =>
      inspectionApi.getInspectionKnowledgeRecommendations(
        inspectionId!,
        INSPECTION_RECOMMENDATION_LIMIT,
      ),
    enabled: enabled && Boolean(inspectionId),
    staleTime: 60_000,
  });
}

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

export function useUploadFlightPermit(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: UploadFlightPermitInput) =>
      inspectionApi.uploadFlightPermit(inspectionId!, input),
    onSuccess: (_data, input) => {
      showToast('Flight permit submitted for manager verification');
      if (!inspectionId) return;
      cacheUploadedFlightPermit(inspectionId, input.file);
      void client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
      void client.invalidateQueries({ queryKey: inspectionKeys.all });
    },
    onError: (error) => showToast(getErrorMessage(error, 'Could not upload flight permit.'), 'error'),
  });
}

export type { FlightPermitVerificationStatus, UploadFlightPermitInput };

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

export function useRemovedFindings(inspectionId: string | null) {
  return useQuery({
    queryKey: inspectionKeys.removedFindings(inspectionId ?? ''),
    queryFn: () => inspectionApi.listRemovedFindings(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useFieldSessions(inspectionId: string | null, enabled = true) {
  return useQuery({
    queryKey: fieldSessionKeys.forInspection(inspectionId ?? ''),
    queryFn: () => fieldSessionApi.list(inspectionId!),
    enabled: Boolean(inspectionId) && enabled,
  });
}

export function useInspectionFlights(inspectionId: string | null, enabled = true) {
  return useQuery({
    queryKey: fieldSessionKeys.flightsForInspection(inspectionId ?? ''),
    queryFn: () => fieldSessionApi.listAllFlights(inspectionId!),
    enabled: Boolean(inspectionId) && enabled,
  });
}

export function useUploadInspectionEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      file,
      fieldSessionId,
      sourceVideoEvidenceId,
      sourceTimestampSeconds,
    }: {
      file: File;
      fieldSessionId?: string;
      sourceVideoEvidenceId?: string;
      sourceTimestampSeconds?: number;
    }) =>
      inspectionApi.uploadEvidence(
        inspectionId!,
        file,
        fieldSessionId,
        sourceVideoEvidenceId !== undefined || sourceTimestampSeconds !== undefined
          ? {
              ...(sourceVideoEvidenceId ? { sourceVideoEvidenceId } : {}),
              ...(sourceTimestampSeconds !== undefined ? { sourceTimestampSeconds } : {}),
            }
          : undefined,
      ),
    onSuccess: (item, variables) => {
      const displayName = item.fileName || variables.file.name;
      const renamed = Boolean(item.fileName && item.fileName !== variables.file.name);
      showToast(
        renamed
          ? `Duplicate filename "${variables.file.name}" saved as "${item.fileName}"`
          : item.deduplicated
            ? `Already uploaded: ${displayName}`
            : `Uploaded ${displayName}`,
        renamed || item.deduplicated ? 'info' : 'success',
      );
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'Evidence upload failed.'), 'error'),
  });
}

export function useInvalidateInspectionEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  return async () => {
    if (!inspectionId) return;
    await Promise.all([
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) }),
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] }),
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) }),
      client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) }),
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) }),
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) }),
    ]);
  };
}

export function useRetryEvidenceProcessing(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (evidenceId: string) =>
      inspectionApi.retryEvidenceProcessing(inspectionId!, evidenceId),
    onSuccess: () => {
      showToast('Re-queued video processing.', 'info');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not re-queue video processing.'), 'error'),
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
    mutationFn: (evidenceId: string) => inspectionApi.retireEvidence(inspectionId!, evidenceId),
    onSuccess: () => {
      showToast('Evidence retired and retained for audit.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) });
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
    mutationFn: (evidenceIds: string[]) =>
      inspectionApi.bulkRetireEvidence(inspectionId!, evidenceIds),
    onSuccess: (items) => {
      showToast(`Retired ${items.length} capture(s); originals remain available for audit.`);
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Bulk retirement was not completed.'), 'error'),
  });
}

/**
 * MF3-05 advisory detection. Every selected image is analysed in parallel and each
 * result is written into the candidate cache as it arrives, so the Findings list fills in image by
 * image instead of waiting for the slowest one. A failure on one image leaves the others running
 * and the manual path open.
 */
export function useAnalyzeEvidence(inspectionId: string | null) {
  const client = useQueryClient();
  const [analysingIds, setAnalysingIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [noDetectionIds, setNoDetectionIds] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);

  const analyzeMany = useCallback(
    async (evidenceIds: string[], options?: { replace?: boolean }) => {
      if (!inspectionId || evidenceIds.length === 0) {
        return;
      }
      setError(null);
      setCompletedIds((current) => current.filter((id) => !evidenceIds.includes(id)));
      setNoDetectionIds((current) => current.filter((id) => !evidenceIds.includes(id)));
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
            if (created.length === 0) noDetectionEvidenceIds.push(evidenceId);
            totalCandidates += newFindings.length;
            setCompletedIds((current) => [...new Set([...current, evidenceId])]);
            if (created.length === 0) {
              setNoDetectionIds((current) => [...new Set([...current, evidenceId])]);
            }
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
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
    },
    [client, inspectionId],
  );

  return {
    analyzeMany,
    analysingIds,
    completedIds,
    noDetectionIds,
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
    mutationFn: (findingId: string) => inspectionApi.deleteFinding(inspectionId!, findingId),
    onSuccess: () => {
      showToast('Finding removed from the confirmed set.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The finding was not removed.'), 'error'),
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
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.removedFindings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
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
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
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
    mutationFn: (summary?: string | null) => inspectionApi.generateDraft(inspectionId!, summary),
    onSuccess: () => {
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The report draft was not created.'), 'error'),
  });
}

export function useReportAiSummary(
  inspectionId: string | null | undefined,
  versionId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['reports', 'ai-summary', inspectionId ?? '', versionId ?? ''],
    queryFn: () => inspectionApi.getAiSummary(inspectionId!, versionId!),
    enabled: Boolean(inspectionId && versionId && enabled),
    staleTime: 60_000,
  });
}

export function usePlatformAiAnalytics(enabled = true) {
  return useQuery<PlatformAiAnalytics>({
    queryKey: [...inspectionKeys.all, 'ai-settings-analytics'],
    queryFn: () => inspectionApi.getAiSettingsAndAnalytics(),
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdatePlatformAiSettings() {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: UpdatePlatformAiSettingsInput) => inspectionApi.updateAiSettings(input),
    onSuccess: (data) => {
      client.setQueryData([...inspectionKeys.all, 'ai-settings-analytics'], data);
      client.invalidateQueries({ queryKey: inspectionKeys.all });
      showToast(
        data.newlyAutoConfirmedCount > 0
          ? `Đã lưu ngưỡng AI (${data.autoConfirmThreshold}%) và tự động xác nhận ${data.newlyAutoConfirmedCount} finding đang chờ.`
          : `Đã cập nhật ngưỡng tự động xác nhận AI (${data.autoConfirmThreshold}%).`,
        'success',
      );
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Không thể cập nhật cấu hình ngưỡng AI.'), 'error'),
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
      showToast('Report submitted for Manager review.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report was not submitted.'), 'error'),
  });
}

/** MF3-09: a submitted report is returned for revision or published as the review decision. */
export function useReviewReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ versionId, reason }: { versionId: string; reason?: string }) =>
      inspectionApi.reviewVersion(inspectionId!, versionId, reason),
    onSuccess: (result) => {
      showToast(
        result.status === 'APPROVED'
          ? 'Report approved. Settle Inspector payout before publishing to Customer.'
          : result.publishedAt
            ? 'Report approved and published.'
            : 'Report returned to the Inspector.',
      );
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
        client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
        client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
        client.invalidateQueries({ queryKey: ['finance-history'] });
        client.invalidateQueries({ queryKey: ['contracts', 'requests'] });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'The report review was not recorded.'), 'error'),
  });
}

export function usePublishReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ versionId }: { versionId: string }) =>
      inspectionApi.publishVersion(inspectionId!, versionId),
    onSuccess: () => {
      showToast('Report published to Customer.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
        client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
        client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
        client.invalidateQueries({ queryKey: ['finance-history'] });
        client.invalidateQueries({ queryKey: ['contracts', 'requests'] });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'The report could not be published.'), 'error'),
  });
}

export function useRequestReportClarification(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ versionId, reason }: { versionId: string; reason: string }) =>
      inspectionApi.requestReportClarification(inspectionId!, versionId, reason),
    onSuccess: () => {
      showToast('Clarification request sent; report returned for revision.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
        client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not submit clarification request.'), 'error'),
  });
}

export function useWithdrawReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ versionId, reason }: { versionId: string; reason?: string }) =>
      inspectionApi.withdrawVersion(inspectionId!, versionId, reason),
    onSuccess: () => {
      showToast('Submission withdrawn back to draft.');
      if (!inspectionId) return;
      client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.findings(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, inspectionId, 'evidence-query'] });
      client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
      client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
      client.invalidateQueries({ queryKey: [...inspectionKeys.all, 'detail', inspectionId] });
    },
    onError: (error) => showToast(getErrorMessage(error, 'The submission was not withdrawn.'), 'error'),
  });
}

export function useAcceptReportVersion(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (versionId: string) =>
      inspectionApi.acceptReport(inspectionId!, versionId),
    onSuccess: () => {
      showToast('Report accepted. Payment is now due via Sepay VietQR or corporate bank transfer.');
      if (inspectionId) {
        client.invalidateQueries({ queryKey: inspectionKeys.reportVersions(inspectionId) });
        client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
      }
    },
    onError: (error) => showToast(getErrorMessage(error, 'Report acceptance failed.'), 'error'),
  });
}

export function useCreateInspectionSepayLink(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.createSepayPaymentLink(inspectionId!),
    // Sepay has no hosted checkout page: it returns a VietQR image URL that must be shown in-app,
    // so the caller renders a QR dialog instead of navigating away.
    onSuccess: (data) => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
      }
      if (!data?.checkoutUrl) {
        showToast('The VietQR code could not be generated.', 'error');
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not create Sepay payment link.'), 'error'),
  });
}

export function useCreateInspectionSepayPayoutLink(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.createSepayPayoutLink(inspectionId!),
    onSuccess: (data) => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
      }
      if (!data?.checkoutUrl) {
        showToast('The VietQR code could not be generated.', 'error');
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not create SePay payout QR link.'), 'error'),
  });
}

export function useCreateInspectionVnPayUrl(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.createVnPayPaymentUrl(inspectionId!),
    onSuccess: (data) => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
      }
      if (data?.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not create VNPay payment link.'), 'error'),
  });
}

export function useCancelUnpaidInspectionPaymentOrder(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: () => inspectionApi.cancelUnpaidPaymentOrder(inspectionId!),
    onSuccess: () => {
      showToast('Unpaid payment order cleared. You can choose a payment method again.');
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: ['inspections', inspectionId, 'payment-status'] });
      }
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not cancel the active payment order.'), 'error'),
  });
}

export function useReportPaymentStatus(
  inspectionId: string | null,
  options?: {
    pollIntervalMs?: number | false;
    pollWhenUnpaid?: boolean;
    pollWhenPayoutUnpaid?: boolean;
  },
) {
  return useQuery({
    queryKey: ['inspections', inspectionId, 'payment-status'],
    queryFn: () => inspectionApi.getReportPaymentStatus(inspectionId!),
    enabled: Boolean(inspectionId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (options?.pollWhenUnpaid) {
        return data?.paid || data?.paymentStatus === 'PAID' ? false : 3000;
      }
      if (options?.pollWhenPayoutUnpaid) {
        const payoutStatus = (data?.payoutStatus ?? '').toUpperCase();
        return payoutStatus === 'PAID' || payoutStatus === 'SETTLED' ? false : 3000;
      }
      return options?.pollIntervalMs ?? false;
    },
  });
}

/**
 * MF2-10: starting a session.
 *
 * Starting also moves the inspection into `IN_PROGRESS`, so the inspection collection and the
 * session list are both refetched rather than patched.
 */
export type StartFieldSessionVariables =
  | string
  | {
      preFlightChecklistNote: string;
      startNow?: boolean;
      sessionDate?: string | null;
      preFlightChecklistSnapshot?: import('../api/fieldSessionApi').ChecklistItemSnapshot[];
      preFlightConditions?: import('../api/fieldSessionApi').PreFlightConditions | null;
    };

export function useStartFieldSession(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (variables: StartFieldSessionVariables) => {
      if (typeof variables === 'string') {
        return fieldSessionApi.start(inspectionId!, variables);
      }
      if (
        variables.sessionDate !== undefined ||
        variables.preFlightChecklistSnapshot !== undefined ||
        variables.preFlightConditions !== undefined
      ) {
        return fieldSessionApi.start(inspectionId!, variables);
      }
      return variables.startNow
        ? fieldSessionApi.start(inspectionId!, variables.preFlightChecklistNote, true)
        : fieldSessionApi.start(inspectionId!, variables.preFlightChecklistNote);
    },
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.forInspection(inspectionId),
        });
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.flightsForInspection(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Field session started');
    },
  });
}

/** MF2-11: abort and MF2-12: completion. Each records the Inspector's own stated notes/reason. */
export function useFieldSessionOutcome(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      sessionId,
      outcome,
      reason,
      postFlightChecklistSnapshot,
    }: {
      sessionId: string;
      outcome: 'abort' | 'complete';
      reason: string;
      postFlightChecklistSnapshot?: import('../api/fieldSessionApi').ChecklistItemSnapshot[];
    }) => {
      if (outcome === 'complete') {
        return postFlightChecklistSnapshot && postFlightChecklistSnapshot.length > 0
          ? fieldSessionApi.complete(inspectionId!, sessionId, {
              outcomeNotes: reason,
              postFlightChecklistSnapshot,
            })
          : fieldSessionApi.complete(inspectionId!, sessionId, reason);
      }
      return fieldSessionApi.abort(inspectionId!, sessionId, reason);
    },
    onSuccess: (_data, variables) => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.forInspection(inspectionId),
        });
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.flightsForInspection(inspectionId),
        });
        void client.invalidateQueries({
          queryKey: inspectionKeys.workflowState(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast(
        variables.outcome === 'complete'
          ? 'Session completed'
          : 'Session aborted',
      );
    },
  });
}

export function useRescheduleInspection(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (payload: { plannedStartAt: string; plannedEndAt: string }) =>
      inspectionApi.reschedule(inspectionId!, payload),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        void client.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Inspection schedule updated');
    },
  });
}

export function useReassignInspection(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (payload: { inspectorId: string; droneId?: string | null }) =>
      inspectionApi.reassign(inspectionId!, payload),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        void client.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Inspector reassigned successfully');
    },
  });
}

export function useCancelInspection(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (payload?: { reason?: string }) =>
      inspectionApi.cancel(inspectionId!, payload),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        void client.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Inspection cancelled');
    },
  });
}

export function useAcceptInspection(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (targetId?: string) => inspectionApi.accept(targetId ?? inspectionId!),
    onSuccess: (_data, targetId) => {
      const resolvedId = targetId ?? inspectionId;
      if (resolvedId) {
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(resolvedId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(resolvedId) });
        void client.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(resolvedId) });
      }
      void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
      void client.invalidateQueries({ queryKey: inspectionKeys.all });
      showToast('Mission accepted. You can now upload the flight permit and start preparation.');
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not accept inspection assignment.'), 'error'),
  });
}

export function useDeclineInspection(
  inspectionId: string | null,
  successMessage = 'Inspection declined; manager notified for reassignment',
) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (reason: string) => inspectionApi.decline(inspectionId!, reason),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        void client.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast(successMessage);
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not decline inspection.'), 'error'),
  });
}

export function useReassignCandidates(inspectionId: string | null, enabled = false) {
  return useQuery({
    queryKey: [...inspectionKeys.all, 'reassign-candidates', inspectionId] as const,
    queryFn: () => inspectionApi.getReassignCandidates(inspectionId!),
    enabled: enabled && Boolean(inspectionId),
  });
}

export function useForceAbortFieldSession(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      fieldSessionApi.forceAbort(inspectionId!, sessionId, reason),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: fieldSessionKeys.forInspection(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.workflowState(inspectionId) });
        void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
        void client.invalidateQueries({ queryKey: inspectionKeys.all });
      }
      showToast('Field session force-aborted by manager');
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not force-abort field session.'), 'error'),
  });
}

export function useCreateDirectReinspection(inspectionId: string | null) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (payload: import('../api/inspectionApi').CreateReinspectionPayload = {}) =>
      inspectionApi.createDirectReinspection(inspectionId!, payload),
    onSuccess: () => {
      showToast('Re-inspection mission scheduled with target defects.');
      void client.invalidateQueries({ queryKey: inspectionKeys.list({}) });
      void client.invalidateQueries({ queryKey: inspectionKeys.listWithReports({}) });
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not schedule re-inspection.'), 'error'),
  });
}

export function useReinspectionVerifications(inspectionId: string | null | undefined) {
  return useQuery({
    queryKey: inspectionKeys.reinspectionVerifications(inspectionId ?? ''),
    queryFn: () => inspectionApi.getReinspectionVerifications(inspectionId!),
    enabled: Boolean(inspectionId),
  });
}

export function useUpdateReinspectionVerification(inspectionId: string | null | undefined) {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      verificationId,
      payload,
    }: {
      verificationId: string;
      payload: import('../api/inspectionApi').UpdateDefectVerificationPayload;
    }) =>
      inspectionApi.updateReinspectionVerification(
        inspectionId!,
        verificationId,
        payload,
      ),
    onSuccess: () => {
      if (inspectionId) {
        void client.invalidateQueries({
          queryKey: inspectionKeys.reinspectionVerifications(inspectionId),
        });
        void client.invalidateQueries({
          queryKey: inspectionKeys.workflowState(inspectionId),
        });
        void client.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
      }
      showToast('Defect verification updated');
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'Could not save verification assessment.'), 'error'),
  });
}
