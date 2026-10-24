import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  maintenanceApi,
  maintenanceKeys,
  type AssignTeamInput,
  type ChangeDecisionInput,
  type CreateChangeOrderInput,
  type CreateEstimateVersionInput,
  type CreateTaskInput,
  type CreateWorkOrderInput,
  type RecordAcceptanceInput,
  type RecordWorkLogInput,
  type ReconcileCostsInput,
  type SuggestScopeInput,
} from '../api/maintenanceApi';

export function useWorkOrders(page = 0, size = 20, enabled = true) {
  return useQuery({
    queryKey: [...maintenanceKeys.workOrders(), page, size],
    queryFn: () => maintenanceApi.listWorkOrders(page, size),
    enabled,
  });
}

export function useWorkOrder(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.workOrder(workOrderId ?? ''),
    queryFn: () => maintenanceApi.getWorkOrder(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useRepairCandidates(enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.repairCandidates(),
    queryFn: maintenanceApi.repairCandidates,
    enabled,
  });
}

export function useTeam(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.team(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listTeam(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useTasks(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.tasks(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listTasks(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useEstimateVersions(
  workOrderId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: maintenanceKeys.estimates(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listEstimateVersions(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkLogs(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.workLogs(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listWorkLogs(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useChanges(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.changes(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listChanges(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useMaintenanceReportVersions(
  workOrderId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: maintenanceKeys.reports(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listReportVersions(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useAcceptanceDecisions(
  workOrderId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: maintenanceKeys.acceptance(workOrderId ?? ''),
    queryFn: () => maintenanceApi.listAcceptanceDecisions(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useReconciliation(workOrderId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.reconciliation(workOrderId ?? ''),
    queryFn: () => maintenanceApi.reconciliationSummary(workOrderId!),
    enabled: enabled && Boolean(workOrderId),
  });
}

/**
 * Invalidates everything scoped to one work order.
 *
 * A single MF4 action changes several collections at once: releasing a work order makes its tasks
 * startable, approving an estimate opens the execution phase, and recording an acceptance closes
 * the loop. Refetching only the collection the button touched would leave the other panels
 * showing the previous state.
 */
function useWorkOrderInvalidation(workOrderId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
    void client.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    void client.invalidateQueries({ queryKey: maintenanceKeys.repairCandidates() });
  };
}

export function useCreateWorkOrder() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) => maintenanceApi.createWorkOrder(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
      void client.invalidateQueries({ queryKey: maintenanceKeys.repairCandidates() });
      showToast('Work order created');
    },
  });
}

export function useAssignTeam(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: AssignTeamInput) => maintenanceApi.assignTeam(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Team assigned');
    },
  });
}

export function useCreateTask(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: CreateTaskInput) => maintenanceApi.createTask(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Task added');
    },
  });
}

export function useCreateEstimateVersion(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: CreateEstimateVersionInput) =>
      maintenanceApi.createEstimateVersion(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Estimate version created');
    },
  });
}

export function useSubmitEstimate(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (versionNo: number) => maintenanceApi.submitEstimate(workOrderId, versionNo),
    onSuccess: () => {
      invalidate();
      showToast('Estimate submitted for approval');
    },
  });
}

export function useDecideEstimate(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      versionNo,
      approve,
      reason,
    }: {
      versionNo: number;
      approve: boolean;
      reason?: string;
    }) =>
      approve
        ? maintenanceApi.approveEstimate(workOrderId, versionNo)
        : maintenanceApi.rejectEstimate(workOrderId, versionNo, reason ?? ''),
    onSuccess: (_data, variables) => {
      invalidate();
      showToast(variables.approve ? 'Estimate approved' : 'Estimate rejected');
    },
  });
}

export function useWorkOrderTransition(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (action: 'release' | 'start' | 'declare-complete' | 'resume-after-rework') => {
      switch (action) {
        case 'release':
          return maintenanceApi.markReady(workOrderId);
        case 'start':
          return maintenanceApi.markInProgress(workOrderId);
        case 'declare-complete':
          return maintenanceApi.markWorkCompleted(workOrderId);
        case 'resume-after-rework':
          return maintenanceApi.resumeAfterRework(workOrderId);
      }
    },
    onSuccess: () => {
      invalidate();
      showToast('Work order updated');
    },
  });
}

export function useRecordWork(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: RecordWorkLogInput) => maintenanceApi.recordWork(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Work recorded');
    },
  });
}

export function useSubmitWorkLog(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (workLogId: string) => maintenanceApi.submitWorkLog(workOrderId, workLogId),
    onSuccess: () => {
      invalidate();
      showToast('Work log submitted');
    },
  });
}

export function useVerifyWorkLog(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (workLogId: string) => maintenanceApi.verifyWorkLog(workOrderId, workLogId),
    onSuccess: () => {
      invalidate();
      showToast('Work log verified');
    },
  });
}

export function useProposeChange(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: CreateChangeOrderInput) => maintenanceApi.proposeChange(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Change proposed');
    },
  });
}

export function useDecideChange(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      changeNumber,
      decision,
      reason,
    }: {
      changeNumber: number;
      decision: 'approve' | 'reject' | 'return';
      reason?: string;
    }) => {
      switch (decision) {
        case 'approve':
          return maintenanceApi.approveChange(workOrderId, changeNumber, reason);
        case 'reject':
          return maintenanceApi.rejectChange(workOrderId, changeNumber, reason ?? '');
        case 'return':
          return maintenanceApi.returnChange(workOrderId, changeNumber, reason ?? '');
      }
    },
    onSuccess: () => {
      invalidate();
      showToast('Change decided');
    },
  });
}

export function useCreateMaintenanceReport(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (contentSnapshot: string) =>
      maintenanceApi.createReportVersion(workOrderId, contentSnapshot),
    onSuccess: () => {
      invalidate();
      showToast('Completion report drafted');
    },
  });
}

export function useVerifyMaintenanceReport(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (versionNo: number) => maintenanceApi.verifyReport(workOrderId, versionNo),
    onSuccess: () => {
      invalidate();
      showToast('Report verified');
    },
  });
}

export function useSubmitMaintenanceReport(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (versionNo: number) => maintenanceApi.submitReport(workOrderId, versionNo),
    onSuccess: () => {
      invalidate();
      showToast('Report submitted for acceptance');
    },
  });
}

export function useRecordAcceptance(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: RecordAcceptanceInput) =>
      maintenanceApi.recordAcceptance(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Acceptance decision recorded');
    },
  });
}

export function useReconcileCosts(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: ReconcileCostsInput) => maintenanceApi.reconcile(workOrderId, input),
    onSuccess: () => {
      invalidate();
      showToast('Costs reconciled');
    },
  });
}

export function useCloseWorkOrder(workOrderId: string) {
  const invalidate = useWorkOrderInvalidation(workOrderId);
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: () => maintenanceApi.close(workOrderId),
    onSuccess: () => {
      invalidate();
      showToast('Work order closed');
    },
  });
}

export function useSuggestWorkOrderScope() {
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: SuggestScopeInput) => maintenanceApi.suggestScope(input),
    onSuccess: (data) => {
      showToast(
        data.fallbackApplied
          ? 'Scope and criteria suggested (Standard guidelines)'
          : 'AI scope and criteria generated',
      );
    },
  });
}

export type { ChangeDecisionInput };
