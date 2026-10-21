import { api } from '@/shared/api/client';


/**
 * MF3 report lifecycle. The human gates are explicit: the author verifies what the model drafted,
 * and a qualified ORG_ADMIN reviewer who is not the author decides.
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

export type EvidenceQualityDecisionType =
  | 'ACCEPTED'
  | 'REUPLOAD_REQUIRED'
  | 'ADDITIONAL_SESSION_REQUIRED'
  | 'LIMITED';

export interface InspectionReportVersion {
  id: string;
  inspectionReportId: string;
  versionNo: number;
  status: ReportStatus;
  authorUserId: string;
  authorVerifiedAt: string | null;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  returnReasonType: 'TEXT_REVISION' | 'FINDINGS_REVISION' | null;
  withdrawnByUserId: string | null;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  llmModel: string | null;
  promptVersion: string | null;
  generatedAt: string | null;
  evidenceSnapshotHash: string | null;
  findingsSnapshotHash: string | null;
  publishedAt: string | null;
  createdAt: string;
  /** The document body as the author wrote it. Null for versions stored before it was exposed. */
  narrative: string | null;
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
  preparation: {
    version: number;
    status: string;
    shotList: string | null;
    evidenceTypes: string | null;
    accessConstraints: string | null;
    safetyObservations: string | null;
    readinessDecision: string | null;
    readinessDecisionAt: string | null;
    readinessReason: string | null;
    permitDocumentReferences: string | null;
    submittedAt: string | null;
  } | null;
  evidenceQuality: {
    decision: string;
    shotListComparison: string | null;
    limitationReason: string | null;
    decidedByUserId: string | null;
    decidedAt: string | null;
  } | null;
  fieldSessions: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    preFlightChecklistNote: string | null;
    postponementReason: string | null;
    abortReason: string | null;
    outcomeNotes: string | null;
    limitations: string | null;
    droneSerialNumber: string | null;
    droneManufacturer: string | null;
    droneModel: string | null;
  }>;
  reviewerQualificationDisclosure: string | null;
  findingsConfirmedBy: string | null;
  findingsConfirmedAt: string | null;
  findingsSnapshotHash: string | null;
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

export interface EvidenceAnalysisStatus {
  evidenceId: string;
  completedAt: string;
  detectionCount: number;
}

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
  checksumSha256: string;
  captureTime: string | null;
  source: string;
  latitude: number | null;
  longitude: number | null;
  externalReference: string | null;
  uploadStatus: string;
  createdAt: string;
  retiredByUserId: string | null;
  retiredAt: string | null;
  retirementReason: string | null;
  locationDescription?: string | null;
  deduplicated?: boolean;
}

export interface EvidenceQualityDecision {
  id: string;
  inspectionId: string;
  fieldSessionId: string | null;
  decision: EvidenceQualityDecisionType;
  shotListComparison: string | null;
  limitationReason: string | null;
  decidedByUserId: string;
  decidedAt: string;
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
  findingsConfirmedByUserId: string | null;
  findingsConfirmedAt: string | null;
  findingsSnapshotHash: string | null;
}

/**
 * A finding, whoever produced it.
 *
 * <p>The model provenance travels with it when there is one, so a caller can see which suggestions
 * came from the detector without the workflow depending on that distinction. Removal is a
 * tombstone: `deletedAt` says the finding was removed, and the status still says whether it had
 * been confirmed.
 */
export interface Finding {
  id: string;
  inspectionId: string;
  evidenceId: string | null;
  status: FindingStatus;
  findingCode: string;
  defectLabel: string;
  severity: FindingSeverity;
  locationDescription: string | null;
  technicalNotes: string | null;
  recommendedAction: string | null;
  component: string | null;
  description: string | null;
  observedCondition: string | null;
  priority: string | null;
  measurement: string | null;
  boundingBox: string | null;
  modelName: string | null;
  modelVersion: string | null;
  modelProvider: string | null;
  confidence: number | null;
  inspectorConfirmedAt: string | null;
  repairRequired: boolean;
  correctiveActionRequired: boolean;
  correctiveActionPriority: string | null;
  correctiveActionDueAt: string | null;
  correctiveActionReviewedByUserId: string | null;
  correctiveActionReviewedAt: string | null;
  correctiveActionRationale: string | null;
  deletedAt: string | null;
  deletedByUserId: string | null;
  deletionReason: string | null;
}

export interface CorrectiveHandoffResult {
  reportVersionId: string;
  versionNo: number;
  publishedAt: string;
  repairRequiredFindingIds: string[];
  inspectionStatus: string;
}

export interface PublishedReport {
  reportVersionId: string;
  versionNo: number;
  publishedAt: string;
  repairRequiredFindingIds: string[];
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
  locationDescription?: string | undefined;
  technicalNotes?: string;
  recommendedAction?: string;
  component?: string;
  description?: string;
  observedCondition?: string;
  priority?: string;
  measurement?: string;
  repairRequired?: boolean;
}

export interface ManualFindingInput {
  evidenceId: string;
  defectLabel: string;
  severity: FindingSeverity;
  locationDescription?: string | undefined;
  technicalNotes: string;
  recommendedAction?: string | undefined;
  component?: string | undefined;
  observedCondition?: string | undefined;
  priority?: string | undefined;
  measurement?: string | undefined;
  repairRequired?: boolean | undefined;
}

export interface ManualDraftInput {}

export type InspectionStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'PREPARING'
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
  objective: string;
  status: InspectionStatus;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportId: string | null;
  reportStatus: ReportStatus | null;
  reportVersionNo: number | null;
  /**
   * The one decision the organization administrator is being asked for on this row.
   *
   * <p>The server decides this rather than the client inferring it, because the phases are
   * distinguished by what is recorded (a submitted preparation, a submitted report, a published
   * report with un-dispositioned findings), not by the inspection status.
   */
  pendingAction: PendingAction;
}

/** The phase an organization administrator is being asked to decide. */
export type PendingAction =
  | 'READINESS_REVIEW'
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

export type InspectionPreparationStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'READY' | 'SUPERSEDED';

/** One field session of an inspection, as MF2-09 to MF2-12 record it. */
export interface FieldSession {
  id: string;
  inspectionId: string;
  organizationId: string;
  inspectorUserId: string;
  droneId: string | null;
  readinessDecisionId: string | null;
  checklistTemplateId: string | null;
  readinessVersion: number | null;
  status: string;
  preFlightChecklistNote: string | null;
  startedAt: string | null;
  endedAt: string | null;
  postponementReason: string | null;
  abortReason: string | null;
  outcomeNotes: string | null;
}

export interface InspectionPreparation {
  id: string;
  inspectionId: string;
  inspectorUserId: string;
  preparationVersion: number;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  shotList: string;
  evidenceTypes: string | null;
  accessConstraints: string | null;
  safetyObservations: string | null;
  permitDocumentReferences: string | null;
  status: InspectionPreparationStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceBlocker {
  code: string;
  detail: string;
}

export interface ComplianceGate {
  blockers: ComplianceBlocker[];
  linkedPermitIds: string[];
  requiresHumanVerification: boolean;
}

/**
 * MF2-03 to MF2-07 preparation. The shot list and evidence types travel as JSON document strings
 * rather than typed structures: the shape is agreed with the mobile client and pinning it here would
 * make an ordinary client update a backend release.
 */
export interface PreparationInput {
  shotList?: string;
  evidenceTypes?: string;
  accessConstraints?: string;
  safetyObservations?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
}

/**
 * MF2-01/02: one Inspector–Drone pairing an administrator opened for this Inspector.
 *
 * The response carries the asset and Drone names and the validity window so a reviewer can judge the
 * pairing without opening three other records, and the recorded response so the inbox can show what
 * was already answered.
 */
export interface InspectorAssignment {
  id: string;
  organizationId: string;
  assetId: string;
  assetName: string;
  inspectorUserId: string;
  droneId: string;
  droneSerialNumber: string;
  droneServiceability: string;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  reason: string | null;
  assignmentResponse: 'ACCEPTED' | 'REJECTED' | null;
  respondedAt: string | null;
  assignedAt: string;
}

/** One credential the reviewer may rely on, as far as its stored record shows. */
export interface ReviewCredential {
  id: string;
  credentialType: string;
  issuer: string;
  credentialReference: string;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  verifiedByUserId?: string | null;
  verifiedAt: string | null;
  verificationReason?: string | null;
}

/** One Drone document the reviewer may rely on, as far as its stored record shows. */
export interface ReviewDroneDocument {
  id: string;
  documentType: string;
  issuer: string;
  documentReference: string;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  reviewedAt: string | null;
}

/**
 * Everything MF2-07 asks the reviewer to look at, for one inspection. Without this the reviewer
 * would have to type credential and document UUIDs, which is not a decision anyone records.
 */
export interface ReadinessSources {
  inspectionId: string;
  inspectorUserId: string | null;
  droneId: string | null;
  inspectorCredentials: ReviewCredential[];
  droneDocuments: ReviewDroneDocument[];
}

export interface ApproveReadinessInput {
  reviewerCredentialId: string;
  inspectorCredentialIds: string[];
  droneDocumentIds: string[];
  applicabilityComplete: boolean;
  applicabilityBasisReference: string;
  /** Optional, but may be sent as undefined; the server treats blank as absent. */
  noInspectorCredentialReason?: string | undefined;
  noDroneDocumentReason?: string | undefined;
  humanVerificationBasis?: string | undefined;
}

export interface ReturnReadinessInput {
  reviewerCredentialId: string;
  inspectorCredentialIdsObserved: string[];
  droneDocumentIdsObserved: string[];
  reason: string;
}

export interface ReadinessDecision {
  id: string;
  inspectionId: string;
  preparationId: string | null;
  preparationVersion: number | null;
  decision: 'APPROVED' | 'RETURNED';
  reviewedByUserId: string;
  reason: string | null;
  sourceHash: string;
  decidedAt: string;
}

export const inspectionApi = {
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

  /**
   * MF2-03 to MF2-07 preparation.
   *
   * <p>Newest version first, so the panel can offer the current submission rather than an older one
   * the reviewer already returned.
   */
  listPreparations: (inspectionId: string) =>
    api
      .get<InspectionPreparation[]>(`/inspections/${inspectionId}/preparation`)
      .then((response) => response.data),

  prepareShotList: (inspectionId: string, input: PreparationInput) =>
    api
      .put<InspectionPreparation>(`/inspections/${inspectionId}/preparation`, input)
      .then((response) => response.data),

  submitPreparation: (inspectionId: string, preparationId: string, acknowledgment: string) =>
    api
      .post<InspectionPreparation>(
        `/inspections/${inspectionId}/preparation/${preparationId}/submission`,
        { acknowledgment },
      )
      .then((response) => response.data),

  /** MF2-04: an administrator links a permit the organization actually holds. */
  linkPermitReferences: (inspectionId: string, permitIds: string[]) =>
    api
      .post<InspectionPreparation>(`/inspections/${inspectionId}/preparation/compliance/permits`, {
        permitIds,
      })
      .then((response) => response.data),

  /**
   * MF2-05. Returns the blocker list rather than failing, because MF2-07 needs every blocker at once
   * and an empty list still means a named reviewer has to decide.
   */
  complianceGate: (inspectionId: string) =>
    api
      .get<ComplianceGate>(`/inspections/${inspectionId}/preparation/compliance`)
      .then((response) => response.data),

  /**
   * MF2-07: the caller's own credentials, which an approval must reference.
   *
   * <p>The route takes no id or organization parameter, so a client cannot ask about anyone else.
   */
  myCredentials: () =>
    api
      .get<ReviewCredential[]>('/workforce/credentials/me')
      .then((response) => response.data),

  /** MF2-07: the assigned Inspector's credentials and the assigned Drone's documents. */
  readinessSources: (inspectionId: string) =>
    api
      .get<ReadinessSources>(`/inspections/${inspectionId}/readiness/sources`)
      .then((response) => response.data),

  approveReadiness: (
    inspectionId: string,
    preparationId: string,
    input: ApproveReadinessInput,
  ) =>
    api
      .post<ReadinessDecision>(
        `/inspections/${inspectionId}/readiness/${preparationId}/approval`,
        input,
      )
      .then((response) => response.data),

  returnReadiness: (
    inspectionId: string,
    preparationId: string,
    input: ReturnReadinessInput,
  ) =>
    api
      .post<ReadinessDecision>(
        `/inspections/${inspectionId}/readiness/${preparationId}/return`,
        input,
      )
      .then((response) => response.data),

  /**
   * MF2-01: the pairings an administrator opened for this Inspector that are still unanswered.
   *
   * <p>This replaces the earlier `listAssignments`, which called `/inspections/assignments` — an
   * endpoint this backend does not have. Accepting is not readiness: it records that the Inspector
   * took the job, and MF2-07 decides separately whether the mission may fly.
   */
  listMyAssignments: () =>
    api
      .get<InspectorAssignment[]>('/inspection-assignments/mine')
      .then((response) => response.data),

  getAssignment: (assignmentId: string) =>
    api
      .get<InspectorAssignment>(`/inspection-assignments/${assignmentId}`)
      .then((response) => response.data),

  /** MF2-02: recording the answer. A decline needs a reason the Inspector writes. */
  respondToAssignment: (
    assignmentId: string,
    response: 'ACCEPTED' | 'REJECTED',
    rejectionReason?: string,
  ) =>
    api
      .post<InspectorAssignment>(`/inspection-assignments/${assignmentId}/response`, {
        response,
        rejectionReason,
      })
      .then((response) => response.data),

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
    form.append('source', 'WEB_UPLOAD');
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

  // MF3-03/04: the assigned Inspector's own adequacy decision.
  decideEvidenceQuality: (
    inspectionId: string,
    input: {
      decision: EvidenceQualityDecisionType;
      shotListComparison?: string;
      limitationReason?: string;
    },
  ) =>
    api
      .post<EvidenceQualityDecision>(
        `/inspections/${inspectionId}/evidence-quality-decisions`,
        input,
      )
      .then((response) => response.data),

  evidenceQualityHistory: (inspectionId: string) =>
    api
      .get<EvidenceQualityDecision[]>(
        `/inspections/${inspectionId}/evidence-quality-decisions`,
      )
      .then((response) => response.data),

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

  /** The findings the Inspector removed, for the caller that asks to see them. */
  listRemovedFindings: (inspectionId: string) =>
    api
      .get<Finding[]>(`/inspections/${inspectionId}/findings/removed`)
      .then((response) => response.data),

  listEvidenceAnalysisStatuses: (inspectionId: string) =>
    api
      .get<EvidenceAnalysisStatus[]>(`/inspections/${inspectionId}/evidence/analysis-status`)
      .then((response) => response.data),

  /**
   * MF3-05. Runs detection for one capture. Without `replace` a capture that already has candidates
   * returns them instead of running the detector again; with it, the image's unreviewed candidates
   * are replaced by the fresh result while reviewed ones are kept.
   */
  retireEvidence: (inspectionId: string, evidenceId: string, reason: string) =>
    api
      .post<EvidenceItem>(`/inspections/${inspectionId}/evidence/${evidenceId}/retire`, { reason })
      .then((response) => response.data),

  bulkRetireEvidence: (
    inspectionId: string,
    evidenceIds: string[],
    reason: string,
  ) =>
    api
      .post<EvidenceItem[]>(
        `/inspections/${inspectionId}/evidence/bulk-retire`,
        { evidenceIds, reason },
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

  deleteFinding: (inspectionId: string, findingId: string, reason: string) =>
    api.delete<void>(`/inspections/${inspectionId}/findings/${findingId}`, { data: { reason } })
      .then((response) => response.data),

  // MF3-07 to MF3-11 report workflow.
  generateDraft: (inspectionId: string) =>
    api
      .post<InspectionReportVersion>(
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
      .post<InspectionReportVersion>(
        `/inspections/${inspectionId}/report/draft/manual`,
        input,
      )
      .then((response) => response.data),

  verifyVersion: (inspectionId: string, versionId: string) =>
    api
      .post<InspectionReportVersion>(
        `/inspections/${inspectionId}/report/versions/${versionId}/verify`,
      )
      .then((response) => response.data),

  submitVersion: (inspectionId: string, versionId: string) =>
    api
      .post<InspectionReportVersion>(
        `/inspections/${inspectionId}/report/versions/${versionId}/submit`,
      )
      .then((response) => response.data),

  withdrawVersion: (inspectionId: string, versionId: string, reason: string) =>
    api
      .post<InspectionReportVersion>(`/inspections/${inspectionId}/report/versions/${versionId}/withdraw`, { reason })
      .then((response) => response.data),

  reviewVersion: (
    inspectionId: string,
    versionId: string,
    approve: boolean,
    reason?: string,
    reasonType?: 'TEXT_REVISION' | 'FINDINGS_REVISION',
  ) =>
    api
      .post<InspectionReportVersion>(
        `/inspections/${inspectionId}/report/versions/${versionId}/review`,
        null,
        { params: { approve, reason, reasonType } },
      )
      .then((response) => response.data),

  publishVersion: (inspectionId: string, versionId: string) =>
    api
      .post<PublishedReport>(
        `/inspections/${inspectionId}/report/versions/${versionId}/publish`,
      )
      .then((response) => response.data),

  recordCorrectiveAction: (
    inspectionId: string,
    findingId: string,
    input: {
      correctiveActionRequired: boolean;
      priority?: string;
      dueAt?: string;
      rationale: string;
    },
  ) =>
    api
      .put<Finding>(
        `/inspections/${inspectionId}/findings/${findingId}/corrective-action`,
        input,
      )
      .then((response) => response.data),

  completeCorrectiveHandoff: (inspectionId: string, findingIds?: string[]) =>
    api
      .post<CorrectiveHandoffResult>(
        `/inspections/${inspectionId}/report/corrective-handoff`,
        findingIds ? { findingIds } : {},
      )
      .then((response) => response.data),

  declareNoCorrectiveWork: (inspectionId: string, rationale: string) =>
    api
      .post<CorrectiveHandoffResult>(
        `/inspections/${inspectionId}/report/no-corrective-work`,
        { rationale },
      )
      .then((response) => response.data),

  listVersions: (inspectionId: string) =>
    api
      .get<InspectionReportVersion[]>(
        `/inspections/${inspectionId}/report/versions`,
      )
      .then((response) => response.data),

  getVersion: (inspectionId: string, versionId: string) =>
    api
      .get<InspectionReportVersion>(
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
      .put<InspectionReportVersion>(
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