import { api } from '@/shared/api/client';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'SUBMITTED_FOR_ACCEPTANCE'
  | 'REWORK_REQUIRED'
  | 'REINSPECTION_REQUIRED'
  | 'ACCEPTED'
  | 'COSTS_RECONCILED'
  | 'CLOSED';

export type MaintenancePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TeamMemberRole = 'LEAD' | 'REPORT_AUTHOR' | 'MEMBER';

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

export type EstimateStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ChangeOrderStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_CLARIFICATION';

export type WorkLogStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type ReportVersionStatus =
  | 'DRAFT'
  | 'AUTHOR_VERIFIED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RETURNED'
  | 'SUPERSEDED';

export type AcceptanceDecisionKind =
  | 'ACCEPTED'
  | 'REWORK_REQUIRED'
  | 'REINSPECTION_REQUIRED'
  | 'REJECTED';

export interface RepairCandidate {
  assetId: string;
  inspectionId: string;
  reportId: string;
  reportVersionId: string;
  findingId: string;
  findingCode: string;
  defectLabel: string;
  description: string;
  severity: string;
  recommendedAction: string;
  reportPublishedAt: string;
}

export interface WorkOrder {
  id: string;
  assetId: string;
  sourceReportVersionId: string;
  sourceFindingId: string;
  status: WorkOrderStatus;
  priority: MaintenancePriority;
  dueAt: string | null;
  correctiveScope: string;
  acceptanceCriteria: string;
  ownerUserId: string;
  budgetApproverUserId: string;
  teamLeadUserId: string | null;
  reportAuthorUserId: string | null;
  acceptingReviewerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderPage {
  items: WorkOrder[];
  page: number;
  size: number;
  total: number;
}

export interface TeamMember {
  id: string;
  engineerUserId: string;
  memberRole: TeamMemberRole;
  effectiveFrom: string;
  effectiveUntil: string | null;
  assignedByUserId: string;
  reason: string | null;
  active: boolean;
}

export interface MaintenanceTask {
  id: string;
  taskNumber: number;
  name: string;
  method: string | null;
  assignedEngineerUserId: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  acceptanceCriteria: string | null;
  status: TaskStatus;
  displayOrder: number;
}

export interface EstimateVersion {
  id: string;
  versionNo: number;
  status: EstimateStatus;
  preparedByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  currency: string;
  taxBasis: string;
  baselineTotal: number;
  assumptions: string | null;
  snapshot: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  engineerUserId: string;
  workHours: number;
  startedAt: string;
  endedAt: string | null;
  asLeftCondition: string | null;
  testReadings: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  status: WorkLogStatus;
  createdAt: string;
}

export interface ChangeOrder {
  id: string;
  changeNumber: number;
  reason: string;
  affectedTasks: string;
  proposedDelta: number;
  supportingEvidence: string | null;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  status: ChangeOrderStatus;
  requestedByUserId: string;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
}

export interface MaintenanceReportVersion {
  id: string;
  versionNo: number;
  status: ReportVersionStatus;
  authorUserId: string;
  authorVerifiedAt: string | null;
  approvedScopeHash: string | null;
  changeSnapshotHash: string | null;
  workLogSnapshotHash: string | null;
  actualCostSnapshotHash: string | null;
  contentSnapshot: string;
  renderedObjectKey?: string | null;
  renderedChecksumSha256?: string | null;
}

export interface AcceptanceDecision {
  id: string;
  reportVersionId: string;
  reviewerUserId: string;
  decision: AcceptanceDecisionKind;
  technicalComments: string;
  acceptanceChecklist: string | null;
  testResult: string | null;
  signatureReference: string | null;
  decidedAt: string;
}

export interface CostReconciliation {
  approvedBaselineTotal: number;
  approvedChangeDelta: number;
  authorizedAmount: number;
  actualTotal: number;
  variance: number;
  variancePercent: number | null;
  currency: string;
}

export interface WorkOrderListFilters {
  page?: number;
  size?: number;
}

export interface CreateWorkOrderInput {
  assetId: string;
  sourceReportVersionId: string;
  sourceFindingId: string;
  budgetApproverUserId: string;
  priority?: MaintenancePriority;
  dueAt?: string | null;
  correctiveScope: string;
  acceptanceCriteria?: string;
}

export interface AssignTeamInput {
  leadUserId: string;
  reportAuthorUserId: string;
  acceptingReviewerUserId: string;
  memberUserIds?: string[];
  reason?: string;
}

export interface RecordAcceptanceInput {
  decision: AcceptanceDecisionKind;
  technicalComments?: string;
  acceptanceChecklist?: string;
  testResult?: string;
  signatureReference?: string;
}

export interface CreateTaskInput {
  name: string;
  method?: string;
  assignedEngineerUserId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  acceptanceCriteria?: string;
}

export interface RecordWorkLogInput {
  taskId: string;
  hours: number;
  startedAt?: string;
  endedAt?: string;
  asLeftCondition?: string;
  testReadings?: string;
}

export interface ProposeChangeInput {
  reason: string;
  affectedTasks?: string;
  proposedDelta: number;
  supportingEvidence?: string;
  proposedStartAt?: string;
  proposedEndAt?: string;
}

export interface CreateReportInput {
  contentSnapshot: string;
  approvedScopeHash?: string;
  changeSnapshotHash?: string;
  workLogSnapshotHash?: string;
  actualCostSnapshotHash?: string;
  llmProvider?: string;
  llmModel?: string;
  promptVersion?: string;
}

export const maintenanceApi = {
  getRepairCandidates: async (): Promise<RepairCandidate[]> => {
    const res = await api.get<RepairCandidate[]>('/maintenance/repair-candidates');
    return res.data;
  },

  listWorkOrders: async (filters: WorkOrderListFilters = {}): Promise<WorkOrderPage> => {
    const res = await api.get<WorkOrderPage>('/maintenance/work-orders', {
      params: {
        page: filters.page ?? 0,
        size: filters.size ?? 20,
      },
    });
    return res.data;
  },

  getWorkOrder: async (workOrderId: string): Promise<WorkOrder> => {
    const res = await api.get<WorkOrder>(`/maintenance/work-orders/${workOrderId}`);
    return res.data;
  },

  createWorkOrder: async (input: CreateWorkOrderInput): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>('/maintenance/work-orders', input);
    return res.data;
  },

  getTeam: async (workOrderId: string): Promise<TeamMember[]> => {
    const res = await api.get<TeamMember[]>(`/maintenance/work-orders/${workOrderId}/team`);
    return res.data;
  },

  assignTeam: async (workOrderId: string, input: AssignTeamInput): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/team`, input);
    return res.data;
  },

  getTasks: async (workOrderId: string): Promise<MaintenanceTask[]> => {
    const res = await api.get<MaintenanceTask[]>(`/maintenance/work-orders/${workOrderId}/tasks`);
    return res.data;
  },

  getEstimateVersions: async (workOrderId: string): Promise<EstimateVersion[]> => {
    const res = await api.get<EstimateVersion[]>(
      `/maintenance/work-orders/${workOrderId}/estimate-versions`,
    );
    return res.data;
  },

  approveEstimate: async (workOrderId: string, versionNo: number): Promise<EstimateVersion> => {
    const res = await api.post<EstimateVersion>(
      `/maintenance/work-orders/${workOrderId}/estimate-versions/${versionNo}/approve`,
    );
    return res.data;
  },

  rejectEstimate: async (
    workOrderId: string,
    versionNo: number,
    reason: string,
  ): Promise<EstimateVersion> => {
    const res = await api.post<EstimateVersion>(
      `/maintenance/work-orders/${workOrderId}/estimate-versions/${versionNo}/reject`,
      { reason },
    );
    return res.data;
  },

  getWorkLogs: async (workOrderId: string): Promise<WorkLog[]> => {
    const res = await api.get<WorkLog[]>(`/maintenance/work-orders/${workOrderId}/work-logs`);
    return res.data;
  },

  getChanges: async (workOrderId: string): Promise<ChangeOrder[]> => {
    const res = await api.get<ChangeOrder[]>(`/maintenance/work-orders/${workOrderId}/changes`);
    return res.data;
  },

  getReportVersions: async (workOrderId: string): Promise<MaintenanceReportVersion[]> => {
    const res = await api.get<MaintenanceReportVersion[]>(
      `/maintenance/work-orders/${workOrderId}/report-versions`,
    );
    return res.data;
  },

  getAcceptanceDecisions: async (workOrderId: string): Promise<AcceptanceDecision[]> => {
    const res = await api.get<AcceptanceDecision[]>(
      `/maintenance/work-orders/${workOrderId}/acceptance-decisions`,
    );
    return res.data;
  },

  recordAcceptance: async (
    workOrderId: string,
    input: RecordAcceptanceInput,
  ): Promise<AcceptanceDecision> => {
    const res = await api.post<AcceptanceDecision>(
      `/maintenance/work-orders/${workOrderId}/acceptance-decisions`,
      input,
    );
    return res.data;
  },

  getCostReconciliation: async (workOrderId: string): Promise<CostReconciliation> => {
    const res = await api.get<CostReconciliation>(
      `/maintenance/work-orders/${workOrderId}/cost-reconciliation`,
    );
    return res.data;
  },

  closeWorkOrder: async (workOrderId: string): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/close`);
    return res.data;
  },

  createTask: async (
    workOrderId: string,
    input: CreateTaskInput,
  ): Promise<MaintenanceTask> => {
    const res = await api.post<MaintenanceTask>(
      `/maintenance/work-orders/${workOrderId}/tasks`,
      input,
    );
    return res.data;
  },

  releaseWorkOrder: async (workOrderId: string): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/release`);
    return res.data;
  },

  startWorkOrder: async (workOrderId: string): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/start`);
    return res.data;
  },

  recordWorkLog: async (
    workOrderId: string,
    input: RecordWorkLogInput,
  ): Promise<WorkLog> => {
    const res = await api.post<WorkLog>(
      `/maintenance/work-orders/${workOrderId}/work-logs`,
      input,
    );
    return res.data;
  },

  submitWorkLog: async (workOrderId: string, workLogId: string): Promise<WorkLog> => {
    const res = await api.post<WorkLog>(
      `/maintenance/work-orders/${workOrderId}/work-logs/${workLogId}/submit`,
    );
    return res.data;
  },

  verifyWorkLog: async (workOrderId: string, workLogId: string): Promise<WorkLog> => {
    const res = await api.post<WorkLog>(
      `/maintenance/work-orders/${workOrderId}/work-logs/${workLogId}/verify`,
    );
    return res.data;
  },

  proposeChange: async (
    workOrderId: string,
    input: ProposeChangeInput,
  ): Promise<ChangeOrder> => {
    const res = await api.post<ChangeOrder>(
      `/maintenance/work-orders/${workOrderId}/changes`,
      input,
    );
    return res.data;
  },

  declareComplete: async (workOrderId: string): Promise<WorkOrder> => {
    const res = await api.post<WorkOrder>(
      `/maintenance/work-orders/${workOrderId}/declare-complete`,
    );
    return res.data;
  },

  createReport: async (
    workOrderId: string,
    input: CreateReportInput,
  ): Promise<MaintenanceReportVersion> => {
    const res = await api.post<MaintenanceReportVersion>(
      `/maintenance/work-orders/${workOrderId}/reports`,
      input,
    );
    return res.data;
  },

  verifyReport: async (
    workOrderId: string,
    versionNo: number,
  ): Promise<MaintenanceReportVersion> => {
    const res = await api.post<MaintenanceReportVersion>(
      `/maintenance/work-orders/${workOrderId}/reports/${versionNo}/verify`,
    );
    return res.data;
  },

  submitReport: async (
    workOrderId: string,
    versionNo: number,
  ): Promise<MaintenanceReportVersion> => {
    const res = await api.post<MaintenanceReportVersion>(
      `/maintenance/work-orders/${workOrderId}/reports/${versionNo}/submit`,
    );
    return res.data;
  },
};
