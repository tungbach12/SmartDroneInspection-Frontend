import { api } from '@/shared/api/client';

/**
 * MF4 work-order contract.
 *
 * Every transition is a named action rather than a generic state change, matching the backend
 * controller. The client never sends a status field; it names the action it wants performed, so
 * the server stays the only place that decides which transition is legal.
 */

export type WorkOrderStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'SUBMITTED_FOR_ACCEPTANCE'
  | 'ACCEPTED'
  | 'COST_RECONCILED'
  | 'CLOSED'
  | 'REWORK_REQUIRED'
  | 'REINSPECTION_REQUIRED';

export type MaintenancePriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type TeamMemberRole = 'LEAD' | 'REPORT_AUTHOR' | 'ACCEPTING_REVIEWER' | 'MEMBER';

export type TaskStatus =
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'REWORK_REQUIRED'
  | 'ACCEPTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'BLOCKED';

export type EstimateStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export type WorkLogStatus =
  | 'IN_PROGRESS'
  | 'PAUSED_FOR_CHANGE'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED';

export type ChangeOrderStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'SUPERSEDED';

export type ReportVersionStatus =
  | 'DRAFT'
  | 'AUTHOR_VERIFIED'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'APPROVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SUPERSEDED';

export type AcceptanceDecisionKind = 'ACCEPTED' | 'REWORK_REQUIRED' | 'REINSPECTION_REQUIRED';

export type CostLineKind =
  | 'LABOR'
  | 'MATERIAL'
  | 'EQUIPMENT'
  | 'EXTERNAL_SERVICE'
  | 'SERVICE'
  | 'OTHER'
  | 'CONTINGENCY';

export interface WorkOrder {
  id: string;
  assetId: string;
  sourceReportVersionId: string;
  sourceFindingId: string;
  status: WorkOrderStatus;
  priority: MaintenancePriority;
  dueAt: string | null;
  correctiveScope: string;
  acceptanceCriteria: string | null;
  ownerUserId: string | null;
  budgetApproverUserId: string;
  teamLeadUserId: string | null;
  reportAuthorUserId: string | null;
  acceptingReviewerUserId: string | null;
  budgetApproverName?: string | null;
  teamLeadName?: string | null;
  reportAuthorName?: string | null;
  acceptingReviewerName?: string | null;
  createdAt: string;
  updatedAt: string;
  reinspectionId?: string | null;
  reinspectionReportVersionId?: string | null;
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
  engineerName?: string | null;
  engineerEmail?: string | null;
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
}

export interface EstimateVersion {
  id: string;
  versionNo: number;
  status: EstimateStatus;
  preparedByUserId: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  currency: string;
  baselineTotal: string | null;
  assumptions: string | null;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  engineerUserId: string;
  startedAt: string | null;
  endedAt: string | null;
  hours: string;
  asLeftCondition: string | null;
  testReadings: string | null;
  status: WorkLogStatus;
}

export interface ChangeOrder {
  id: string;
  changeNumber: number;
  reason: string;
  proposedDelta: string | null;
  status: ChangeOrderStatus;
  requestedByUserId: string;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface MaintenanceReportVersion {
  id: string;
  versionNo: number;
  status: ReportVersionStatus;
  authorUserId: string;
  authorVerifiedAt: string | null;
  contentSnapshot: string | null;
  renderedObjectKey?: string | null;
  renderedChecksumSha256?: string | null;
}

export interface AcceptanceDecision {
  id: string;
  reportVersionId: string;
  reviewerUserId: string;
  decision: AcceptanceDecisionKind;
  technicalComments: string | null;
  acceptanceChecklist: string | null;
  testResult: string | null;
  decidedAt: string;
}

export interface CostReconciliation {
  approvedBaselineTotal: string;
  approvedChangeDelta: string;
  authorizedAmount: string;
  actualTotal: string;
  variance: string;
  variancePercent: string | null;
  currency: string;
}

export interface RepairCandidate {
  assetId: string;
  inspectionId: string;
  reportId: string;
  reportVersionId: string;
  findingId: string;
  findingCode: string;
  defectLabel: string;
  technicalNotes: string;
  severity: string;
  recommendedAction: string | null;
  reportPublishedAt: string;
  component?: string | null;
  locationDescription?: string | null;
  measurement?: string | null;
}

export interface SuggestedTask {
  taskNumber: number;
  name: string;
  method?: string | null;
  acceptanceCriteria?: string | null;
}

export interface SuggestScopeInput {
  sourceReportVersionId?: string | null | undefined;
  sourceFindingId?: string | null | undefined;
  findingCode?: string | null | undefined;
  defectLabel?: string | null | undefined;
  description?: string | null | undefined;
  severity?: string | null | undefined;
  recommendedAction?: string | null | undefined;
  component?: string | null | undefined;
  locationDescription?: string | null | undefined;
  measurement?: string | null | undefined;
}

export interface SuggestScopeResponse {
  correctiveScope: string;
  acceptanceCriteria: string;
  referenceStandards: string[];
  suggestedTasks: SuggestedTask[];
  modelName: string;
  fallbackApplied: boolean;
}

export interface CreateWorkOrderInput {
  assetId: string;
  sourceReportVersionId: string;
  sourceFindingId: string;
  budgetApproverUserId: string;
  priority?: MaintenancePriority;
  dueAt?: string | null;
  correctiveScope: string;
  acceptanceCriteria?: string | null;
}

export interface AssignTeamInput {
  leadUserId: string;
  reportAuthorUserId: string;
  acceptingReviewerUserId: string;
  memberUserIds?: string[];
  reason?: string | undefined;
}

export interface CreateTaskInput {
  name: string;
  method?: string | null;
  assignedEngineerUserId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  acceptanceCriteria?: string | null;
}

export interface EstimateLineInput {
  taskId?: string | null;
  lineKind: CostLineKind;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  unitRate?: number | null;
}

export interface CreateEstimateVersionInput {
  currency: string;
  assumptions?: string | null;
  lines: EstimateLineInput[];
}

export interface RecordWorkLogInput {
  taskId: string;
  startedAt?: string | null;
  endedAt?: string | null;
  hours: number;
  asLeftCondition?: string | null;
  testReadings?: string | null;
}

export interface CreateChangeOrderInput {
  reason: string;
  proposedDelta?: number | null;
}

export interface ChangeDecisionInput {
  reason?: string;
}

export interface RecordAcceptanceInput {
  decision: AcceptanceDecisionKind;
  technicalComments?: string | null;
  acceptanceChecklist?: string | null;
  testResult?: string | null;
}

export interface ActualCostLineInput {
  taskId: string;
  lineKind: CostLineKind;
  description: string;
  quantity: number;
  unit?: string | null;
  unitRate: number;
  currency: string;
}

export interface ReconcileCostsInput {
  actualLines: ActualCostLineInput[];
}

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  workOrders: () => [...maintenanceKeys.all, 'work-orders'] as const,
  workOrder: (id: string) => [...maintenanceKeys.all, 'work-order', id] as const,
  repairCandidates: () => [...maintenanceKeys.all, 'repair-candidates'] as const,
  team: (id: string) => [...maintenanceKeys.workOrder(id), 'team'] as const,
  tasks: (id: string) => [...maintenanceKeys.workOrder(id), 'tasks'] as const,
  estimates: (id: string) => [...maintenanceKeys.workOrder(id), 'estimate-versions'] as const,
  workLogs: (id: string) => [...maintenanceKeys.workOrder(id), 'work-logs'] as const,
  changes: (id: string) => [...maintenanceKeys.workOrder(id), 'changes'] as const,
  reports: (id: string) => [...maintenanceKeys.workOrder(id), 'reports'] as const,
  acceptance: (id: string) => [...maintenanceKeys.workOrder(id), 'acceptance-decisions'] as const,
  reconciliation: (id: string) => [...maintenanceKeys.workOrder(id), 'cost-reconciliation'] as const,
};

export const maintenanceApi = {
  listWorkOrders: (page = 0, size = 20) =>
    api
      .get<WorkOrderPage>('/maintenance/work-orders', { params: { page, size } })
      .then((r) => r.data),

  getWorkOrder: (id: string) =>
    api.get<WorkOrder>(`/maintenance/work-orders/${id}`).then((r) => r.data),

  repairCandidates: () =>
    api.get<RepairCandidate[]>('/maintenance/repair-candidates').then((r) => r.data),

  createWorkOrder: (input: CreateWorkOrderInput) =>
    api.post<WorkOrder>('/maintenance/work-orders', input).then((r) => r.data),

  listTeam: (workOrderId: string) =>
    api.get<TeamMember[]>(`/maintenance/work-orders/${workOrderId}/team`).then((r) => r.data),

  assignTeam: (workOrderId: string, input: AssignTeamInput) =>
    api
      .post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/team`, input)
      .then((r) => r.data),

  listTasks: (workOrderId: string) =>
    api.get<MaintenanceTask[]>(`/maintenance/work-orders/${workOrderId}/tasks`).then((r) => r.data),

  createTask: (workOrderId: string, input: CreateTaskInput) =>
    api
      .post<MaintenanceTask>(`/maintenance/work-orders/${workOrderId}/tasks`, input)
      .then((r) => r.data),

  listEstimateVersions: (workOrderId: string) =>
    api
      .get<EstimateVersion[]>(`/maintenance/work-orders/${workOrderId}/estimate-versions`)
      .then((r) => r.data),

  createEstimateVersion: (workOrderId: string, input: CreateEstimateVersionInput) =>
    api
      .post<EstimateVersion>(`/maintenance/work-orders/${workOrderId}/estimate-versions`, input)
      .then((r) => r.data),

  submitEstimate: (workOrderId: string, versionNo: number) =>
    api
      .post<EstimateVersion>(
        `/maintenance/work-orders/${workOrderId}/estimate-versions/${versionNo}/submit`,
      )
      .then((r) => r.data),

  approveEstimate: (workOrderId: string, versionNo: number) =>
    api
      .post<EstimateVersion>(
        `/maintenance/work-orders/${workOrderId}/estimate-versions/${versionNo}/approve`,
      )
      .then((r) => r.data),

  rejectEstimate: (workOrderId: string, versionNo: number, reason: string) =>
    api
      .post<EstimateVersion>(
        `/maintenance/work-orders/${workOrderId}/estimate-versions/${versionNo}/reject`,
        { reason },
      )
      .then((r) => r.data),

  // MF4-09 to MF4-12 execution transitions.
  markReady: (workOrderId: string) =>
    api
      .post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/release`)
      .then((r) => r.data),

  markInProgress: (workOrderId: string) =>
    api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/start`).then((r) => r.data),

  markWorkCompleted: (workOrderId: string) =>
    api
      .post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/declare-complete`)
      .then((r) => r.data),

  resumeAfterRework: (workOrderId: string) =>
    api
      .post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/resume-after-rework`)
      .then((r) => r.data),

  listWorkLogs: (workOrderId: string) =>
    api.get<WorkLog[]>(`/maintenance/work-orders/${workOrderId}/work-logs`).then((r) => r.data),

  recordWork: (workOrderId: string, input: RecordWorkLogInput) =>
    api
      .post<WorkLog>(`/maintenance/work-orders/${workOrderId}/work-logs`, input)
      .then((r) => r.data),

  submitWorkLog: (workOrderId: string, workLogId: string) =>
    api
      .post<WorkLog>(`/maintenance/work-orders/${workOrderId}/work-logs/${workLogId}/submit`)
      .then((r) => r.data),

  verifyWorkLog: (workOrderId: string, workLogId: string) =>
    api
      .post<WorkLog>(`/maintenance/work-orders/${workOrderId}/work-logs/${workLogId}/verify`)
      .then((r) => r.data),

  listChanges: (workOrderId: string) =>
    api.get<ChangeOrder[]>(`/maintenance/work-orders/${workOrderId}/changes`).then((r) => r.data),

  proposeChange: (workOrderId: string, input: CreateChangeOrderInput) =>
    api
      .post<ChangeOrder>(`/maintenance/work-orders/${workOrderId}/changes`, input)
      .then((r) => r.data),

  approveChange: (workOrderId: string, changeNumber: number, reason?: string) =>
    api
      .post<ChangeOrder>(
        `/maintenance/work-orders/${workOrderId}/changes/${changeNumber}/approve`,
        reason ? { reason } : undefined,
      )
      .then((r) => r.data),

  rejectChange: (workOrderId: string, changeNumber: number, reason: string) =>
    api
      .post<ChangeOrder>(
        `/maintenance/work-orders/${workOrderId}/changes/${changeNumber}/reject`,
        { reason },
      )
      .then((r) => r.data),

  returnChange: (workOrderId: string, changeNumber: number, reason: string) =>
    api
      .post<ChangeOrder>(
        `/maintenance/work-orders/${workOrderId}/changes/${changeNumber}/return`,
        { reason },
      )
      .then((r) => r.data),

  listReportVersions: (workOrderId: string) =>
    api
      .get<MaintenanceReportVersion[]>(`/maintenance/work-orders/${workOrderId}/reports`)
      .then((r) => r.data),

  createReportVersion: (workOrderId: string, contentSnapshot: string) =>
    api
      .post<MaintenanceReportVersion>(`/maintenance/work-orders/${workOrderId}/reports`, {
        contentSnapshot,
      })
      .then((r) => r.data),

  verifyReport: (workOrderId: string, versionNo: number) =>
    api
      .post<MaintenanceReportVersion>(
        `/maintenance/work-orders/${workOrderId}/reports/${versionNo}/verify`,
      )
      .then((r) => r.data),

  submitReport: (workOrderId: string, versionNo: number) =>
    api
      .post<MaintenanceReportVersion>(
        `/maintenance/work-orders/${workOrderId}/reports/${versionNo}/submit`,
      )
      .then((r) => r.data),

  getReportPdfUrl: (workOrderId: string, versionNo: number) =>
    `/api/v1/maintenance/work-orders/${workOrderId}/reports/${versionNo}/pdf`,

  downloadReportPdf: (workOrderId: string, versionNo: number, preview = false) =>
    api
      .get<Blob>(`/maintenance/work-orders/${workOrderId}/reports/${versionNo}/pdf`, {
        params: preview ? { preview: true } : undefined,
        responseType: 'blob',
      })
      .then((r) => r.data),

  listAcceptanceDecisions: (workOrderId: string) =>
    api
      .get<AcceptanceDecision[]>(
        `/maintenance/work-orders/${workOrderId}/acceptance-decisions`,
      )
      .then((r) => r.data),

  recordAcceptance: (workOrderId: string, input: RecordAcceptanceInput) =>
    api
      .post<AcceptanceDecision>(
        `/maintenance/work-orders/${workOrderId}/acceptance-decisions`,
        input,
      )
      .then((r) => r.data),

  reconciliationSummary: (workOrderId: string) =>
    api
      .get<CostReconciliation>(`/maintenance/work-orders/${workOrderId}/cost-reconciliation`)
      .then((r) => r.data),

  reconcile: (workOrderId: string, input: ReconcileCostsInput) =>
    api
      .post<CostReconciliation>(
        `/maintenance/work-orders/${workOrderId}/cost-reconciliation`,
        input,
      )
      .then((r) => r.data),

  close: (workOrderId: string) =>
    api.post<WorkOrder>(`/maintenance/work-orders/${workOrderId}/close`).then((r) => r.data),

  suggestScope: (input: SuggestScopeInput) =>
    api.post<SuggestScopeResponse>('/maintenance/suggest-scope', input).then((r) => r.data),
};
