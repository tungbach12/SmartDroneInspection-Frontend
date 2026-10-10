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

export type FindingDecision = 'CONFIRMED' | 'MODIFIED' | 'REJECTED';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  llmModel: string | null;
  promptVersion: string | null;
  generatedAt: string | null;
  evidenceSnapshotHash: string | null;
  publishedAt: string | null;
  createdAt: string;
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

export interface CandidateStatus {
  id: string;
  evidenceId: string;
  modelName: string;
  modelVersion: string;
  predictedLabel: string;
  confidence: number;
  boundingBox: string;
  status: 'PENDING' | 'CONFIRMED' | 'MODIFIED' | 'REJECTED';
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface VerifiedFinding {
  id: string;
  inspectionId: string;
  evidenceId: string | null;
  aiCandidateId: string | null;
  source: 'AI_CONFIRMED' | 'AI_MODIFIED' | 'MANUAL';
  findingCode: string;
  defectLabel: string;
  severity: FindingSeverity;
  locationDescription: string;
  technicalNotes: string;
  recommendedAction: string | null;
  component: string | null;
  description: string | null;
  observedCondition: string | null;
  priority: string | null;
  measurement: string | null;
  decision: FindingDecision | null;
  repairRequired: boolean;
  status: string;
}

export interface PublishedReport {
  reportVersionId: string;
  versionNo: number;
  publishedAt: string;
  repairRequiredFindingIds: string[];
  inspectionStatus: string;
}

export interface ReviewCandidateInput {
  decision: 'CONFIRM' | 'MODIFY' | 'REJECT';
  defectLabel?: string;
  severity?: FindingSeverity;
  locationDescription?: string;
  technicalNotes?: string;
  recommendedAction?: string;
  component?: string;
  observedCondition?: string;
  priority?: string;
  measurement?: string;
  reason?: string;
  repairRequired?: boolean;
}

export interface ManualFindingInput {
  evidenceId?: string;
  defectLabel: string;
  severity: FindingSeverity;
  locationDescription: string;
  technicalNotes: string;
  recommendedAction?: string;
  component?: string;
  observedCondition?: string;
  priority?: string;
  measurement?: string;
  repairRequired?: boolean;
}

export interface ManualDraftInput {
  narrative: string;
  omissionDisclosure?: string;
}

export interface InspectionAssignment {
  assignmentId: string;
  serviceOrderId: string;
  assetId: string;
  deadline: string | null;
  status: string;
  inspectionId: string | null;
}

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
}

export interface InspectionPage {
  items: InspectionListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StartedInspection {
  inspectionId: string;
  assignmentId: string;
  serviceOrderId: string;
  assetId: string;
  checklistTemplateId: string;
  status: string;
  startedAt: string;
}

export interface InspectionChecklistItem {
  itemId: string;
  itemCode: string;
  sectionName: string | null;
  prompt: string;
  responseType: 'PASS_FAIL' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'CHOICE';
  required: boolean;
  displayOrder: number;
  guidance: string | null;
  validationConfig: string | null;
  responseValue: { value?: unknown } | null;
  notes: string | null;
  completedAt: string | null;
}

export type InspectionPreparationStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'READY';

export interface InspectionPreparation {
  id: string;
  inspectionId: string;
  inspectorUserId: string;
  preparationVersion: number;
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
}

export const inspectionApi = {
  list: (filters: InspectionListFilters) =>
    api.get<InspectionPage>('/inspections', { params: filters }).then((response) => response.data),

  listWithReports: (filters: InspectionListFilters) =>
    api
      .get<InspectionPage>('/inspections/with-reports', { params: filters })
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

  // MF2 scope, unchanged: the Inspector opens an accepted assignment and records checklist answers.
  listAssignments: () =>
    api
      .get<InspectionAssignment[]>('/inspections/assignments', {
        params: { status: 'ACCEPTED' },
      })
      .then((response) => response.data),

  start: (assignmentId: string) =>
    api
      .post<StartedInspection>('/inspections/start', { assignmentId })
      .then((response) => response.data),

  checklist: (inspectionId: string) =>
    api
      .get<InspectionChecklistItem[]>(`/inspections/${inspectionId}/checklist`)
      .then((response) => response.data),

  saveChecklistResponse: (
    inspectionId: string,
    itemId: string,
    responseValue: { value: unknown },
  ) =>
    api
      .put(`/inspections/${inspectionId}/checklist-responses/${itemId}`, {
        responseValue,
      })
      .then((response) => response.data),

  // MF3-01/02 evidence intake. The server computes the checksum and treats a repeat as idempotent.
  listEvidence: (inspectionId: string) =>
    api
      .get<EvidenceItem[]>(`/inspections/${inspectionId}/evidence`)
      .then((response) => response.data),

  uploadEvidence: (inspectionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('source', 'WEB_UPLOAD');
    return api
      .post<EvidenceItem>(`/inspections/${inspectionId}/evidence`, form)
      .then((response) => response.data);
  },

  evidenceContentUrl: (inspectionId: string, evidenceId: string) =>
    `/inspections/${inspectionId}/evidence/${evidenceId}/content`,

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

  // MF3-05/06 advisory detection and human findings.
  listCandidates: (inspectionId: string) =>
    api
      .get<CandidateStatus[]>(`/inspections/${inspectionId}/finding-candidates`)
      .then((response) => response.data),

  analyzeEvidence: (inspectionId: string, evidenceId: string) =>
    api
      .post<CandidateStatus[]>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/analyze`,
      )
      .then((response) => response.data),

  // A rejection records a decision without creating a finding, so the response has no body.
  reviewCandidate: (
    inspectionId: string,
    candidateId: string,
    input: ReviewCandidateInput,
  ) =>
    api
      .post<VerifiedFinding | null>(
        `/inspections/${inspectionId}/finding-candidates/${candidateId}/review`,
        input,
      )
      .then((response) => response.data),

  createManualFinding: (inspectionId: string, input: ManualFindingInput) =>
    api
      .post<VerifiedFinding>(`/inspections/${inspectionId}/findings`, input)
      .then((response) => response.data),

  listFindings: (inspectionId: string) =>
    api
      .get<VerifiedFinding[]>(`/inspections/${inspectionId}/findings`)
      .then((response) => response.data),

  // MF3-09: the reviewer's final decision on a finding.
  decideFinding: (
    inspectionId: string,
    findingId: string,
    decision: FindingDecision,
    rationale?: string,
  ) =>
    api
      .post<VerifiedFinding>(
        `/inspections/${inspectionId}/findings/${findingId}/decision`,
        { decision, rationale },
      )
      .then((response) => response.data),

  // MF3-07 to MF3-11 report workflow.
  generateDraft: (inspectionId: string) =>
    api
      .post<InspectionReportVersion>(
        `/inspections/${inspectionId}/report/draft`,
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

  reviewVersion: (
    inspectionId: string,
    versionId: string,
    approve: boolean,
    reason?: string,
  ) =>
    api
      .post<InspectionReportVersion>(
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
};