import { api } from '@/shared/api/client';


/**
 * MF3 report lifecycle. The human gates are explicit: the author verifies what the model drafted,
 * and a qualified CUSTOMER reviewer who is not the author decides.
 */
export type ReportStatus =
  | 'DRAFT'
  | 'AUTHOR_VERIFIED'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Legacy reviewer decision literals retained to read existing finding history. */
export type FindingDecision = 'CONFIRMED' | 'MODIFIED' | 'REJECTED';


export interface InspectionReport {
  id: string;
  inspectionReportId: string;
  versionNo: number;
  status: ReportStatus;
  authorUserId: string;
  submittedAt: string | null;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  returnReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  /** Why no automated drafting contributed, present on manual drafts only. */
  omissionDisclosure: string | null;
  /** Full raw JSON snapshot containing structured report fields & custom enterprise schemas. */
  contentSnapshot?: string | null;
  /**
   * The authored Report 3 §3.7.2 sections. A null field is an absent section and is shown as "not
   * supplied"; it is not an empty value the author chose.
   */
  sections?: ReportSections | null;
  /** Read-only, source-backed inspection context included with the report version response. */
  reportContext?: InspectionReportContext | null;
}

export interface InspectionReportContext {
  organizationName: string | null;
  assetCode: string | null;
  assetName: string | null;
  assetLocation: string | null;
  assetCategory: string | null;
  assignedDrone: {
    serialNumber: string | null;
    manufacturer: string | null;
    model: string | null;
  } | null;
  inspectionItems?: string[] | null;
  flightPermitFileName?: string | null;
  flightPermitUploadedAt?: string | null;
  fieldSessions: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    preFlightChecklistNote: string | null;
    postponementReason: string | null;
    abortReason: string | null;
    outcomeNotes: string | null;
    droneSerialNumber: string | null;
    droneManufacturer: string | null;
    droneModel: string | null;
  }>;
  reviewerQualificationDisclosure: string | null;
  findingsConfirmedAt: string | null;
}

export type ReportOverallCondition = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

export interface ReportSections {
  executiveSummary?: string | null;
  purposeScopeCriteria?: string | null;
  inspectorCoverageAssessment?: string | null;
  methodEquipmentConditions?: string | null;
  conclusionsRecommendations?: string | null;
  overallCondition?: ReportOverallCondition | null;
  omissionDisclosure?: string | null;
}

export type ReportSectionsInput = ReportSections;

export interface EvidencePage {
  items: EvidenceItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  activeCount: number;
  retiredCount: number;
  latestCreatedAt: string | null;
  latestRetiredAt: string | null;
}

export interface EvidenceItem {
  id: string;
  inspectionId: string;
  fieldSessionId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  captureTime: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  isDeleted: boolean;
  locationDescription: string | null;
  deduplicated: boolean;
}

/**
 * Where a finding stands in the Inspector's review.
 *
 * <p>One vocabulary for every finding, whoever produced it: a detector suggestion and something
 * the Inspector saw are both PENDING until the Inspector confirms them.
 */
export type FindingStatus = 'PENDING' | 'CONFIRMED';

export interface InspectionWorkflowState {
  status: InspectionStatus;
  findingsConfirmedAt: string | null;
  findingsSnapshotHash: string | null;
}

/**
 * A finding, whoever produced it.
 *
 * <p>The model provenance travels with it when there is one, so a caller can see which suggestions
 * came from the detector without the workflow depending on that distinction. Removal is a
 * tombstone: `isDeleted` says the finding was removed, and the status still says whether it had
 * been confirmed.
 */
export interface FindingPage {
  items: Finding[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  activeCount: number;
  removedCount: number;
  pendingCount: number;
  confirmedCount: number;
}

export interface Finding {
  id: string;
  inspectionId: string;
  evidenceId: string | null;
  status: FindingStatus;
  findingCode: string;
  defectLabel: string;
  severity: FindingSeverity;
  technicalNotes: string;
  recommendedAction: string | null;
  boundingBox: string | null;
  modelName: string | null;
  confidence: number | null;
  forwardedToMaintenanceAt: string | null;
  isDeleted: boolean;
}

export interface PublishedReport {
  reportVersionId: string;
  versionNo: number;
  publishedAt: string;
  forwardedFindingIds: string[];
  inspectionStatus: string;
}

/**
 * The Inspector accepts a finding and states what it is.
 *
 * <p>Every field is optional: a field that is not sent keeps the value the finding already had,
 * so accepting a suggestion does not have to restate what the detector already said.
 */
export interface ReviewFindingInput {
  evidenceId?: string;
  defectLabel?: string;
  severity?: FindingSeverity;
  technicalNotes?: string;
  recommendedAction?: string;
}

export interface ManualFindingInput {
  evidenceId: string;
  defectLabel: string;
  severity: FindingSeverity;
  technicalNotes: string;
  recommendedAction?: string | undefined;
}

export interface ManualDraftInput {}

export type InspectionStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'READY_FOR_FLIGHT'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'REPORT_DRAFT'
  | 'REPORT_PUBLISHED'
  | 'REPAIR_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface InspectionListFilters {
  page?: number;
  pageSize?: number;
}

/**
 * A row of the inspection collection. The report summary travels with the row so the inspections
 * and reports screens read one source and cannot disagree about a report's state.
 */
export interface InspectionListItem {
  id: string;
  organizationId: string;
  assetId: string;
  inspectorId: string;
  objective?: string | null;
  status: InspectionStatus;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportId: string | null;
  reportStatus: ReportStatus | null;
  reportVersionNo: number | null;
  /**
   * The one decision the organization manageristrator is being asked for on this row.
   *
   * <p>The server decides this rather than the client inferring it, because the phases are
   * distinguished by what is recorded (a submitted preparation, a submitted report, a published
   * report with un-dispositioned findings), not by the inspection status.
   */
  pendingAction: PendingAction;
}

/** The phase an organization manageristrator is being asked to decide. */
export type PendingAction =
  | 'REPORT_REVIEW'
  | 'CORRECTIVE_DISPOSITION'
  | 'NONE';

export interface InspectionPage {
  items: InspectionListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateInspectionInput {
  assetId: string;
  inspectorId?: string | null;
  droneId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
}

export interface InspectionDetail {
  id: string;
  organizationId: string;
  assetId: string;
  assetName: string | null;
  locationText?: string | null | undefined;
  assetLatitude?: number | null | undefined;
  assetLongitude?: number | null | undefined;
  inspectorId: string;
  inspectorName: string | null;
  droneId: string | null;
  droneSerialNumber: string | null;
  droneModel?: string | null;
  droneServiceability?: string | null;
  flightPermitFileKey: string | null;
  flightPermitFileName: string | null;
  flightPermitUploadedAt: string | null;
  inspectionItems: string[];
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  status: InspectionStatus;
  createdAt: string;
  updatedAt: string;
}

export type FieldSessionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'POSTPONED'
  | 'ABORTED';

/** One field session of an inspection, as MF2-09 to MF2-12 record it. */
export interface FieldSession {
  id: string;
  inspectionId: string;
  status: FieldSessionStatus;
  preFlightChecklistNote: string | null;
  startedAt: string | null;
  endedAt: string | null;
  postponementReason: string | null;
  abortReason: string | null;
  outcomeNotes: string | null;
}

export const inspectionApi = {
  create: (input: CreateInspectionInput) =>
    api.post<InspectionDetail>('/inspections', input).then((response) => response.data),

  getById: (inspectionId: string) =>
    api.get<InspectionDetail>(`/inspections/${inspectionId}`).then((response) => response.data),

  list: (filters: InspectionListFilters) =>
    api.get<InspectionPage>('/inspections', { params: filters }).then((response) => response.data),

  listWithReports: (filters: InspectionListFilters) =>
    api
      .get<InspectionPage>('/inspections/with-reports', { params: filters })
      .then((response) => response.data),

  /** The assigned Inspector's own field sessions for this inspection. */
  listFieldSessions: (inspectionId: string) =>
    api
      .get<FieldSession[]>(`/inspections/${inspectionId}/field-sessions`)
      .then((response) => response.data),

  uploadFlightPermit: (inspectionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<InspectionDetail>(`/inspections/${inspectionId}/flight-permit`, form)
      .then((response) => response.data);
  },

  // MF3-01/02 evidence intake. The server computes the checksum and treats a repeat as idempotent.
  listEvidence: (inspectionId: string) =>
    api
      .get<EvidenceItem[]>(`/inspections/${inspectionId}/evidence`)
      .then((response) => response.data),

  queryEvidence: (
    inspectionId: string,
    filters: {
      status: 'ACTIVE' | 'RETIRED' | 'ALL';
      mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ALL';
      search: string;
      page: number;
      pageSize: number;
    },
  ) =>
    api
      .get<EvidencePage>(`/inspections/${inspectionId}/evidence/query`, { params: filters })
      .then((response) => response.data),

  uploadEvidence: (inspectionId: string, file: File, fieldSessionId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (fieldSessionId) form.append('fieldSessionId', fieldSessionId);
    return api
      .post<EvidenceItem>(`/inspections/${inspectionId}/evidence`, form)
      .then((response) => response.data);
  },

  updateEvidenceLocation: (inspectionId: string, evidenceId: string, locationDescription: string) =>
    api
      .put<EvidenceItem>(`/inspections/${inspectionId}/evidence/${evidenceId}/location`, {
        locationDescription,
      })
      .then((response) => response.data),

  evidenceContentUrl: (inspectionId: string, evidenceId: string) =>
    `${api.defaults.baseURL}/inspections/${inspectionId}/evidence/${evidenceId}/content`,

  workflowState: (inspectionId: string) =>
    api
      .get<InspectionWorkflowState>(`/inspections/${inspectionId}/workflow-state`)
      .then((response) => response.data),

  confirmFindings: (inspectionId: string, noFindingsAcknowledged: boolean) =>
    api
      .post<void>(`/inspections/${inspectionId}/findings/confirm`, {
        noFindingsAcknowledged,
      })
      .then((response) => response.data),

  reopenFindings: (inspectionId: string) =>
    api.post<void>(`/inspections/${inspectionId}/findings/reopen`).then((response) => response.data),

  // MF3-05/06 advisory detection and human findings.
  listFindings: (inspectionId: string) =>
    api
      .get<Finding[]>(`/inspections/${inspectionId}/findings`)
      .then((response) => response.data),

  queryFindings: (
    inspectionId: string,
    filters: {
      status?: 'ACTIVE' | 'PENDING' | 'CONFIRMED' | 'REMOVED' | 'ALL';
      severity?: FindingSeverity;
      source?: 'ALL' | 'AI' | 'MANUAL';
      defectQuery?: string;
      evidenceQuery?: string;
      page?: number;
      pageSize?: number;
    },
  ) =>
    api
      .get<FindingPage>(`/inspections/${inspectionId}/findings/query`, { params: filters })
      .then((response) => response.data),

  /** The findings the Inspector removed, for the caller that asks to see them. */
  listRemovedFindings: (inspectionId: string) =>
    api
      .get<Finding[]>(`/inspections/${inspectionId}/findings/removed`)
      .then((response) => response.data),

  /**
   * MF3-05. Runs detection for one capture. Without `replace` a capture that already has candidates
   * returns them instead of running the detector again; with it, the image's unreviewed candidates
   * are replaced by the fresh result while reviewed ones are kept.
   */
  retireEvidence: (inspectionId: string, evidenceId: string) =>
    api
      .post<EvidenceItem>(`/inspections/${inspectionId}/evidence/${evidenceId}/retire`)
      .then((response) => response.data),

  bulkRetireEvidence: (inspectionId: string, evidenceIds: string[]) =>
    api
      .post<EvidenceItem[]>(
        `/inspections/${inspectionId}/evidence/bulk-retire`,
        { evidenceIds },
      )
      .then((response) => response.data),

  analyzeEvidence: (inspectionId: string, evidenceId: string, replace = false) =>
    api
      .post<Finding[]>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/analyze`,
        null,
        { params: { replace } },
      )
      .then((response) => response.data),

  /** The Inspector accepts a finding and states what it is. */
  confirmFinding: (inspectionId: string, findingId: string, input: ReviewFindingInput) =>
    api
      .post<Finding>(
        `/inspections/${inspectionId}/findings/${findingId}/confirmation`,
        input,
      )
      .then((response) => response.data),

  /** Puts a removed finding back into the working set. */
  restoreFinding: (inspectionId: string, findingId: string) =>
    api
      .post<Finding>(`/inspections/${inspectionId}/findings/${findingId}/restore`)
      .then((response) => response.data),
  createManualFinding: (inspectionId: string, input: ManualFindingInput) =>
    api
      .post<Finding>(`/inspections/${inspectionId}/findings`, input)
      .then((response) => response.data),

  updateFinding: (inspectionId: string, findingId: string, input: ManualFindingInput) =>
    api
      .put<Finding>(`/inspections/${inspectionId}/findings/${findingId}`, input)
      .then((response) => response.data),

  deleteFinding: (inspectionId: string, findingId: string) =>
    api.delete<void>(`/inspections/${inspectionId}/findings/${findingId}`)
      .then((response) => response.data),

  // MF3-07 to MF3-11 report workflow.
  generateDraft: (inspectionId: string) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/draft`,
        undefined,
        { timeout: 110_000 },
      )
      .then((response) => response.data),

  /**
   * Report 3 keeps a structured manual draft possible when automated drafting is unavailable, so
   * the author is never blocked by a missing or failing drafting service.
   */
  authorManualDraft: (
    inspectionId: string,
    input: ManualDraftInput,
  ) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/draft/manual`,
        input,
      )
      .then((response) => response.data),

  verifyVersion: (inspectionId: string, versionId: string) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/verify`,
      )
      .then((response) => response.data),

  submitVersion: (inspectionId: string, versionId: string) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/submit`,
      )
      .then((response) => response.data),

  withdrawVersion: (inspectionId: string, versionId: string, reason?: string) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/withdraw`,
        reason ? { reason } : {},
      )
      .then((response) => response.data),

  reviewVersion: (
    inspectionId: string,
    versionId: string,
    approve: boolean,
    reason?: string,
  ) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/review`,
        null,
        { params: { approve, reason } },
      )
      .then((response) => response.data),

  publishVersion: (inspectionId: string, versionId: string) =>
    api
      .post<PublishedReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/publish`,
      )
      .then((response) => response.data),

  completeCorrectiveHandoff: (inspectionId: string, findingIds: string[]) =>
    api
      .post<PublishedReport>(
        `/inspections/${inspectionId}/report/corrective-handoff`,
        { findingIds },
      )
      .then((response) => response.data),

  listVersions: (inspectionId: string) =>
    api
      .get<InspectionReport[]>(
        `/inspections/${inspectionId}/report/versions`,
      )
      .then((response) => response.data),

  getVersion: (inspectionId: string, versionId: string) =>
    api
      .get<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}`,
      )
      .then((response) => response.data),

  /**
   * MF3-08: saves the Report 3 §3.7.2 sections the author is accountable for. The whole authored
   * set is sent so a partial write cannot leave a version half-updated.
   */
  saveReportSections: (
    inspectionId: string,
    versionId: string,
    sections: ReportSectionsInput,
  ) =>
    api
      .put<InspectionReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/sections`,
        sections,
      )
      .then((response) => response.data),

  /** MF3-08: renders a draft for layout review. Not stored, not an official record. */
  previewReport: (inspectionId: string, versionId: string) =>
    api
      .get<Blob>(
        `/inspections/${inspectionId}/report/versions/${versionId}/preview`,
        { responseType: 'blob' },
      )
      .then((response) => response.data),

  /** MF3-11: downloads the published deliverable stored at publication. */
  downloadReport: (inspectionId: string, versionId: string) =>
    api
      .get<Blob>(
        `/inspections/${inspectionId}/report/versions/${versionId}/document`,
        { responseType: 'blob' },
      )
      .then((response) => response.data),
};