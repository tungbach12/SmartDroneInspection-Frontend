import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceApi,
  type AssignTeamInput,
  type CreateReportInput,
  type CreateTaskInput,
  type CreateWorkOrderInput,
  type ProposeChangeInput,
  type RecordAcceptanceInput,
  type RecordWorkLogInput,
  type WorkOrderListFilters,
} from '../api/maintenanceApi';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  repairCandidates: () => [...maintenanceKeys.all, 'repair-candidates'] as const,
  workOrders: (filters?: WorkOrderListFilters) =>
    [...maintenanceKeys.all, 'work-orders', filters] as const,
  workOrder: (id: string) => [...maintenanceKeys.all, 'work-order', id] as const,
  team: (id: string) => [...maintenanceKeys.all, 'team', id] as const,
  tasks: (id: string) => [...maintenanceKeys.all, 'tasks', id] as const,
  estimates: (id: string) => [...maintenanceKeys.all, 'estimates', id] as const,
  workLogs: (id: string) => [...maintenanceKeys.all, 'work-logs', id] as const,
  changes: (id: string) => [...maintenanceKeys.all, 'changes', id] as const,
  reports: (id: string) => [...maintenanceKeys.all, 'reports', id] as const,
  acceptanceDecisions: (id: string) =>
    [...maintenanceKeys.all, 'acceptance-decisions', id] as const,
  costReconciliation: (id: string) =>
    [...maintenanceKeys.all, 'cost-reconciliation', id] as const,
};

export function useRepairCandidates(enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.repairCandidates(),
    queryFn: maintenanceApi.getRepairCandidates,
    enabled,
  });
}

export function useWorkOrders(filters: WorkOrderListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.workOrders(filters),
    queryFn: () => maintenanceApi.listWorkOrders(filters),
    enabled,
  });
}

export function useWorkOrder(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.workOrder(workOrderId),
    queryFn: () => maintenanceApi.getWorkOrder(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderTeam(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.team(workOrderId),
    queryFn: () => maintenanceApi.getTeam(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderTasks(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.tasks(workOrderId),
    queryFn: () => maintenanceApi.getTasks(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderEstimates(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.estimates(workOrderId),
    queryFn: () => maintenanceApi.getEstimateVersions(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderLogs(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.workLogs(workOrderId),
    queryFn: () => maintenanceApi.getWorkLogs(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderChanges(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.changes(workOrderId),
    queryFn: () => maintenanceApi.getChanges(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderReports(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.reports(workOrderId),
    queryFn: () => maintenanceApi.getReportVersions(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderAcceptanceDecisions(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.acceptanceDecisions(workOrderId),
    queryFn: () => maintenanceApi.getAcceptanceDecisions(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useWorkOrderCostReconciliation(workOrderId: string, enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.costReconciliation(workOrderId),
    queryFn: () => maintenanceApi.getCostReconciliation(workOrderId),
    enabled: enabled && Boolean(workOrderId),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) => maintenanceApi.createWorkOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.repairCandidates() });
    },
  });
}

export function useAssignTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, input }: { workOrderId: string; input: AssignTeamInput }) =>
      maintenanceApi.assignTeam(workOrderId, input),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.team(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useApproveEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, versionNo }: { workOrderId: string; versionNo: number }) =>
      maintenanceApi.approveEstimate(workOrderId, versionNo),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.estimates(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useRejectEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      versionNo,
      reason,
    }: {
      workOrderId: string;
      versionNo: number;
      reason: string;
    }) => maintenanceApi.rejectEstimate(workOrderId, versionNo, reason),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.estimates(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useRecordAcceptance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, input }: { workOrderId: string; input: RecordAcceptanceInput }) =>
      maintenanceApi.recordAcceptance(workOrderId, input),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.acceptanceDecisions(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.reports(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useCloseWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => maintenanceApi.closeWorkOrder(workOrderId),
    onSuccess: (_, workOrderId) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, input }: { workOrderId: string; input: CreateTaskInput }) =>
      maintenanceApi.createTask(workOrderId, input),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.tasks(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
    },
  });
}

export function useReleaseWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => maintenanceApi.releaseWorkOrder(workOrderId),
    onSuccess: (_, workOrderId) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useStartWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => maintenanceApi.startWorkOrder(workOrderId),
    onSuccess: (_, workOrderId) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useRecordWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workOrderId,
      input,
    }: {
      workOrderId: string;
      input: RecordWorkLogInput;
    }) => {
      const log = await maintenanceApi.recordWorkLog(workOrderId, input);
      return maintenanceApi.submitWorkLog(workOrderId, log.id);
    },
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workLogs(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.tasks(workOrderId) });
    },
  });
}

export function useVerifyWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, workLogId }: { workOrderId: string; workLogId: string }) =>
      maintenanceApi.verifyWorkLog(workOrderId, workLogId),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workLogs(workOrderId) });
    },
  });
}

export function useProposeChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, input }: { workOrderId: string; input: ProposeChangeInput }) =>
      maintenanceApi.proposeChange(workOrderId, input),
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.changes(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
    },
  });
}

export function useDeclareComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => maintenanceApi.declareComplete(workOrderId),
    onSuccess: (_, workOrderId) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}

export function useCreateAndSubmitReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workOrderId,
      input,
    }: {
      workOrderId: string;
      input: CreateReportInput;
    }) => {
      const created = await maintenanceApi.createReport(workOrderId, input);
      await maintenanceApi.verifyReport(workOrderId, created.versionNo);
      return maintenanceApi.submitReport(workOrderId, created.versionNo);
    },
    onSuccess: (_, { workOrderId }) => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.reports(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(workOrderId) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders() });
    },
  });
}
