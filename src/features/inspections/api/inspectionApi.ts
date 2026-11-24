import { api } from '@/shared/api/client';
import type { PartnerCandidate } from '@/features/contracts/api/contractApi';


/**
 * MF3 report lifecycle. The human gates are explicit: the author verifies what the model drafted,
 * and a Platform Manager / Admin reviewer who is not the author decides.
 */
export type ReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RETURNED'
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
  /** Auto-generated executive summary persisted when the report version is created. */
  summary?: string | null;
  /** Why no automated drafting contributed, present on manual drafts only. */
  omissionDisclosure: string | null;
  /** Whether this version was returned due to a Customer clarification request. */
  clarificationRequested?: boolean;
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
    telemetrySource?: string | null;
  }>;
  reviewerQualificationDisclosure: string | null;
  findingsConfirmedAt: string | null;
}

export type ReportOverallCondition = 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

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

export type EvidenceProcessingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export type EvidenceUploadSessionStatus =
  | 'OPEN'
  | 'COMPLETING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface EvidenceItem {
  id: string;
  inspectionId: string;
  fieldSessionId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  originalSizeBytes?: number | null;
  processingStatus?: EvidenceProcessingStatus;
  processingError?: string | null;
  hasThumbnail?: boolean;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationSeconds?: number | null;
  processedAt?: string | null;
  captureTime: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  isDeleted: boolean;
  locationDescription: string | null;
  deduplicated: boolean;
  sourceVideoEvidenceId?: string | null;
  sourceTimestampSeconds?: number | null;
}

export interface VideoScanMarkerDetection {
  modelName: string;
  modelVersion?: string | null;
  predictedLabel: string;
  confidence: number;
  boundingBox: string;
}

export interface VideoScanMarker {
  timestampSeconds: number;
  imageWidth: number;
  imageHeight: number;
  previewBase64: string;
  primaryLabel: string;
  maxConfidence: number;
  detections: VideoScanMarkerDetection[];
}

export interface VideoScanResponse {
  videoEvidenceId: string;
  videoDurationSeconds: number;
  scannedFrames: number;
  markers: VideoScanMarker[];
}

export interface PromoteVideoKeyframeItem {
  timestampSeconds: number;
  fileName?: string;
  locationDescription?: string;
  imageBase64?: string;
  detections?: Array<{
    modelName?: string;
    predictedLabel: string;
    confidence?: number;
    boundingBox?: string;
  }>;
}

export interface EvidenceUploadSession {
  sessionId: string;
  inspectionId: string;
  fieldSessionId: string | null;
  fileName: string;
  contentType: string;
  declaredSizeBytes: number;
  chunkSizeBytes: number;
  totalParts: number;
  uploadedPartNumbers: number[];
  status: EvidenceUploadSessionStatus;
  evidenceId: string | null;
  processingStatus?: EvidenceProcessingStatus | null;
  errorMessage: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
  completedAt: string | null;
}

export interface BeginEvidenceUploadInput {
  fileName: string;
  contentType: string;
  totalSizeBytes: number;
  fieldSessionId?: string;
  captureTime?: string;
  latitude?: number;
  longitude?: number;
  locationDescription?: string;
}

export interface MediaTicket {
  ticket: string;
  streamUrl: string;
  expiresAt: string;
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
  flightPermitVerificationStatus?: FlightPermitVerificationStatus | null;
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
  boundingBox: string | null;
  modelName: string | null;
  confidence: number | null;
  isDeleted: boolean;
}

export interface ReportReviewResult {
  reportVersionId: string;
  versionNo: number;
  publishedAt: string | null;
  inspectionStatus: string;
  status?: ReportStatus;
  returnReason?: string | null;
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
  boundingBox?: string | null | undefined;
}

export interface ManualFindingInput {
  evidenceId: string;
  defectLabel: string;
  severity: FindingSeverity;
  technicalNotes: string;
  boundingBox?: string | null | undefined;
}

export interface SepayCheckoutDetails {
  orderCode: number;
  amount: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
}

export interface VnPayCheckoutDetails {
  orderCode: number;
  amount: number;
  txnRef: string;
  checkoutUrl: string;
}

export interface ReportPaymentStatusDetails {
  reportAccepted: boolean;
  paid: boolean;
  paymentStatus: string;
  orderCode: number | null;
  amount: number | null;
  checkoutUrl: string | null;
  serviceBaseAmount?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  inspectorGrossPayout?: number | null;
  tncnRate?: number | null;
  tncnAmount?: number | null;
  inspectorNetPayout?: number | null;
  payoutStatus?: 'PENDING' | 'ELIGIBLE' | 'PAID' | string | null;
  payoutReference?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentDueAt?: string | null;
  paymentConfirmedAt?: string | null;
  inspectorBankName?: string | null;
  inspectorBankAccountNumber?: string | null;
  inspectorBankAccountHolder?: string | null;
  inspectorBankBranch?: string | null;
}

export interface ManualDraftInput {}

export interface ReportAiSummary {
  summary: string;
  keyHighlights: string[];
  recommendedActions: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Optional source-backed references attached to the AI summary when retrieval is available. */
  knowledgeReferences?: Array<{
    kind: string;
    codeOrLabel: string;
    summary: string;
    similarity?: number | null;
  }>;
}

/** A historical inspection finding surfaced by the knowledge advisor (pgvector / hybrid match). */
export interface HistoricalCaseMatch {
  id: string;
  defectLabel: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  assetCategory: string;
  assetLabel: string;
  sameAsset: boolean;
  sameOrganization: boolean;
  similarity: number;
  technicalNotes: string;
  outcome: string;
  publishedAt: string | null;
}

/** An engineering guideline / standard matched to the same query. */
export interface GuidelineMatch {
  id: string;
  standardCode: string;
  title: string;
  severity: string;
  similarity: number;
  guidance: string;
  referenceUrl?: string | null;
}

export interface KnowledgeRecommendationResponse {
  retrievalMode: 'PGVECTOR_RAG' | 'HYBRID_MATCH' | string;
  cases: HistoricalCaseMatch[];
  guidelines: GuidelineMatch[];
}

/** The AI-written technical note for one finding, with the compact sources it drew on. */
export interface DraftFindingNoteResult {
  note: string;
  mode: 'AI_VISION_RAG' | 'DETERMINISTIC_RAG' | string;
  retrievalMode: 'PGVECTOR_RAG' | 'HYBRID_MATCH' | string;
  citedCases: HistoricalCaseMatch[];
  citedGuidelines: GuidelineMatch[];
}

export interface PlatformAiModelStat {
  modelName: string;
  totalDetections: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
  acceptanceRatePercent: number;
  avgConfidencePercent: number;
}

export interface PlatformAiDefectStat {
  defectLabel: string;
  totalDetections: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
  avgConfidencePercent: number;
}

export interface PlatformAiConfidenceBucket {
  bucketLabel: string;
  minPercent: number;
  maxPercent: number;
  totalCount: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface PlatformAiAnalytics {
  autoConfirmEnabled: boolean;
  autoConfirmThreshold: number;
  totalAiDetections: number;
  confirmedAiFindings: number;
  autoConfirmedFindings: number;
  pendingAiFindings: number;
  rejectedAiFindings: number;
  removedConfirmedAiFindings: number;
  rejectedPendingFindings: number;
  manualFindingsCount: number;
  acceptanceRatePercent: number;
  rejectionRatePercent: number;
  averageConfidencePercent: number;
  averageConfirmedConfidencePercent: number;
  updatedAt: string;
  modelBreakdown: PlatformAiModelStat[];
  defectBreakdown: PlatformAiDefectStat[];
  confidenceBuckets: PlatformAiConfidenceBucket[];
  newlyAutoConfirmedCount: number;
}

export interface UpdatePlatformAiSettingsInput {
  autoConfirmEnabled: boolean;
  autoConfirmThreshold: number;
}

export type InspectionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export type AssignmentStatus = 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED';

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
  ownerCustomerId: string;
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
  inspectionType?: 'INITIAL' | 'RE_INSPECTION';
  sourceInspectionId?: string | null;
  assetName?: string | null;
  assetCode?: string | null;
  assetLocation?: string | null;
  reportAccepted?: boolean | null;
  paymentStatus?: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | 'NOT_APPLICABLE' | string | null;
  paymentAmount?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  inspectorNetPayout?: number | null;
  payoutStatus?: 'PENDING' | 'ELIGIBLE' | 'PAID' | string | null;
  paymentMethod?: string | null;
  reassignmentRequired?: boolean;
  overdueNotifiedAt?: string | null;
  assignmentStatus?: AssignmentStatus | null;
  assignmentAcceptedAt?: string | null;
  flightPermitVerificationStatus?: FlightPermitVerificationStatus | null;
  ownerCustomerName?: string | null;
  inspectorName?: string | null;
  managerName?: string | null;
  droneModel?: string | null;
  droneSerialNumber?: string | null;
  /**
   * The one decision the organization manageristrator is being asked for on this row.
   *
   * <p>The server decides this rather than the client inferring it, because the phases are
   * distinguished by what is recorded (a submitted preparation, a submitted report, a published
   * report with un-dispositioned findings), not by the inspection status.
   */
  pendingAction: PendingAction;
}

/** Flight permit verification lifecycle tracked on the inspection record. */
export type FlightPermitVerificationStatus =
  | 'NOT_UPLOADED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

/** Structured metadata required alongside the flight permit document upload. */
export interface UploadFlightPermitInput {
  file: File;
  permitNumber: string;
  issuingAuthority: string;
  validFrom: string;
  validTo: string;
  droneSerial?: string | null | undefined;
  maxAltitudeM?: number | null | undefined;
}

/** The phase an organization manageristrator is being asked to decide. */
export type PendingAction =
  | 'REPORT_REVIEW'
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
  ownerCustomerId: string;
  ownerCustomerName?: string | null;
  ownerCustomerEmail?: string | null;
  ownerCustomerPhone?: string | null;
  ownerCustomerAvatarUrl?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  managerAvatarUrl?: string | null;
  assetId: string;
  assetName: string | null;
  assetPhotoDocumentIds?: string[];
  locationText?: string | null | undefined;
  assetLatitude?: number | null | undefined;
  assetLongitude?: number | null | undefined;
  inspectorId: string;
  inspectorName: string | null;
  inspectorAvatarUrl?: string | null;
  droneId: string | null;
  droneSerialNumber: string | null;
  droneModel?: string | null;
  droneServiceability?: string | null;
  flightPermitFileKey: string | null;
  flightPermitFileName: string | null;
  flightPermitNumber?: string | null;
  flightPermitAuthority?: string | null;
  flightPermitValidFrom?: string | null;
  flightPermitValidTo?: string | null;
  flightPermitDroneSerial?: string | null;
  flightPermitMaxAltitudeM?: number | null;
  flightPermitFileSha256?: string | null;
  flightPermitFileSizeBytes?: number | null;
  flightPermitContentType?: string | null;
  flightPermitUploadedAt: string | null;
  flightPermitUploadedBy?: string | null;
  flightPermitVerificationStatus?: FlightPermitVerificationStatus | null;
  flightPermitVerifiedBy?: string | null;
  flightPermitVerifiedByName?: string | null;
  flightPermitVerifiedAt?: string | null;
  flightPermitRejectionReason?: string | null;
  flightPermitReviewNotes?: string | null;
  inspectionItems: string[];
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  status: InspectionStatus;
  createdAt: string;
  updatedAt: string;
  inspectionType?: 'INITIAL' | 'RE_INSPECTION';
  sourceInspectionId?: string | null;
  reassignmentRequired?: boolean;
  declineReason?: string | null;
  declinedAt?: string | null;
  declinedByInspectorId?: string | null;
  cancellationReason?: string | null;
  overdueNotifiedAt?: string | null;
  clarificationCount?: number;
  assignmentStatus?: AssignmentStatus | null;
  assignmentAcceptedAt?: string | null;
  workOrderId?: string | null;
  sourceReportVersionId?: string | null;
}

export interface ReinspectionVerificationItem {
  id: string;
  reinspectionId: string;
  sourceFindingId: string;
  sourceFindingCode?: string | null;
  sourceDefectLabel?: string | null;
  sourceSeverity?: string | null;
  sourceTechnicalNotes?: string | null;
  sourceEvidenceId?: string | null;
  sourceEvidenceFileKey?: string | null;
  sourceLocationDescription?: string | null;
  sourceLatitude?: number | null;
  sourceLongitude?: number | null;
  newEvidenceId?: string | null;
  newEvidenceFileKey?: string | null;
  resolutionStatus: 'RESOLVED' | 'UNRESOLVED' | 'INCONCLUSIVE';
  inspectorNotes?: string | null;
  verifiedAt?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDefectVerificationPayload {
  resolutionStatus: 'RESOLVED' | 'UNRESOLVED' | 'INCONCLUSIVE';
  newEvidenceId?: string | null;
  inspectorNotes?: string | null;
}

export interface CreateReinspectionPayload {
  inspectorId?: string | null;
  droneId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
}

export type FieldSessionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'POSTPONED'
  | 'ABORTED';

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
  telemetrySource?: string | null;
  hasFlightReport?: boolean;
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

  uploadFlightPermit: (inspectionId: string, input: UploadFlightPermitInput) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('permitNumber', input.permitNumber);
    form.append('issuingAuthority', input.issuingAuthority);
    form.append('validFrom', input.validFrom);
    form.append('validTo', input.validTo);
    if (input.droneSerial?.trim()) {
      form.append('droneSerial', input.droneSerial.trim());
    }
    if (input.maxAltitudeM !== undefined && input.maxAltitudeM !== null) {
      form.append('maxAltitudeM', String(input.maxAltitudeM));
    }
    return api
      .post<InspectionDetail>(`/inspections/${inspectionId}/flight-permit`, form)
      .then((response) => response.data);
  },

  flightPermitContentUrl: (inspectionId: string) =>
    `${api.defaults.baseURL}/inspections/${inspectionId}/flight-permit/content`,

  getFlightPermitBlob: (inspectionId: string) =>
    api
      .get<Blob>(`/inspections/${inspectionId}/flight-permit/content`, {
        responseType: 'blob',
      })
      .then((response) => response.data),

  reschedule: (inspectionId: string, payload: { plannedStartAt: string; plannedEndAt: string }) =>
    api
      .put<InspectionDetail>(`/inspections/${inspectionId}/schedule`, payload)
      .then((response) => response.data),

  reassign: (inspectionId: string, payload: { inspectorId: string; droneId?: string | null }) =>
    api
      .put<InspectionDetail>(`/inspections/${inspectionId}/assignment`, payload)
      .then((response) => response.data),

  cancel: (inspectionId: string, payload?: { reason?: string }) =>
    api
      .post<InspectionDetail>(`/inspections/${inspectionId}/cancellation`, payload ?? {})
      .then((response) => response.data),

  accept: (inspectionId: string) =>
    api
      .post<InspectionDetail>(`/inspections/${inspectionId}/accept`)
      .then((response) => response.data),

  decline: (inspectionId: string, reason: string) =>
    api
      .post<InspectionDetail>(`/inspections/${inspectionId}/decline`, { reason })
      .then((response) => response.data),

  getReassignCandidates: (inspectionId: string) =>
    api
      .post<PartnerCandidate[]>(`/inspections/${inspectionId}/reassign-candidates`)
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

  uploadEvidence: (
    inspectionId: string,
    file: File,
    fieldSessionId?: string,
    sourceLink?: { sourceVideoEvidenceId?: string; sourceTimestampSeconds?: number },
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (fieldSessionId) form.append('fieldSessionId', fieldSessionId);
    if (sourceLink?.sourceVideoEvidenceId) {
      form.append('sourceVideoEvidenceId', sourceLink.sourceVideoEvidenceId);
    }
    if (typeof sourceLink?.sourceTimestampSeconds === 'number') {
      form.append('sourceTimestampSeconds', String(sourceLink.sourceTimestampSeconds));
    }
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

  evidenceContentUrl: (
    inspectionId: string,
    evidenceId: string,
    variant?: 'primary' | 'thumb',
  ) => {
    const base = `${api.defaults.baseURL}/inspections/${inspectionId}/evidence/${evidenceId}/content`;
    return variant && variant !== 'primary' ? `${base}?variant=${variant}` : base;
  },

  beginEvidenceUpload: (inspectionId: string, input: BeginEvidenceUploadInput) =>
    api
      .post<EvidenceUploadSession>(`/inspections/${inspectionId}/evidence/uploads`, input)
      .then((response) => response.data),

  getEvidenceUploadStatus: (inspectionId: string, sessionId: string) =>
    api
      .get<EvidenceUploadSession>(`/inspections/${inspectionId}/evidence/uploads/${sessionId}`)
      .then((response) => response.data),

  uploadEvidencePart: (
    inspectionId: string,
    sessionId: string,
    partNumber: number,
    chunk: Blob,
    options?: { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void },
  ) => {
    const form = new FormData();
    form.append('file', chunk, `part-${partNumber}`);
    return api
      .put<EvidenceUploadSession>(
        `/inspections/${inspectionId}/evidence/uploads/${sessionId}/parts/${partNumber}`,
        form,
        {
          timeout: 300_000,
          ...(options?.signal ? { signal: options.signal } : {}),
          ...(options?.onProgress
            ? {
                onUploadProgress: (event) => {
                  options.onProgress?.(event.loaded, event.total ?? chunk.size);
                },
              }
            : {}),
        },
      )
      .then((response) => response.data);
  },

  completeEvidenceUpload: (inspectionId: string, sessionId: string) =>
    api
      .post<EvidenceUploadSession>(
        `/inspections/${inspectionId}/evidence/uploads/${sessionId}/complete`,
      )
      .then((response) => response.data),

  cancelEvidenceUpload: (inspectionId: string, sessionId: string) =>
    api
      .delete<EvidenceUploadSession>(`/inspections/${inspectionId}/evidence/uploads/${sessionId}`)
      .then((response) => response.data),

  retryEvidenceProcessing: (inspectionId: string, evidenceId: string) =>
    api
      .post<EvidenceItem>(`/inspections/${inspectionId}/evidence/${evidenceId}/retry-processing`)
      .then((response) => response.data),

  issueMediaTicket: (
    inspectionId: string,
    evidenceId: string,
    variant: 'primary' | 'thumb' = 'primary',
  ) =>
    api
      .post<MediaTicket>(`/inspections/${inspectionId}/evidence/${evidenceId}/media-ticket`, null, {
        params: { variant },
      })
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

  scanVideoEvidence: (
    inspectionId: string,
    evidenceId: string,
    options?: { intervalSeconds?: number; maxFrames?: number },
  ) =>
    api
      .post<VideoScanResponse>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/video-scan`,
        null,
        {
          params: options,
          timeout: 180000,
        },
      )
      .then((response) => response.data),

  promoteVideoKeyframes: (
    inspectionId: string,
    evidenceId: string,
    keyframes: PromoteVideoKeyframeItem[],
  ) =>
    api
      .post<{
        videoEvidenceId: string;
        scannedFrames: number;
        extractedEvidenceCount: number;
        createdFindingsCount: number;
        keyframes: Array<{
          timestampSeconds: number;
          evidence: EvidenceItem;
          findings: Finding[];
        }>;
      }>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/video-keyframes`,
        { keyframes },
        { timeout: 120000 },
      )
      .then((response) => response.data),

  analyzeVideoEvidence: (
    inspectionId: string,
    evidenceId: string,
    frames: Array<{
      timestampSeconds: number;
      fileName?: string;
      imageBase64: string;
      locationDescription?: string;
    }>,
  ) =>
    api
      .post<{
        videoEvidenceId: string;
        scannedFrames: number;
        extractedEvidenceCount: number;
        createdFindingsCount: number;
        keyframes: Array<{
          timestampSeconds: number;
          evidence: EvidenceItem;
          findings: Finding[];
        }>;
      }>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/analyze-video`,
        { frames },
        { timeout: 120000 },
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

  getAiSettingsAndAnalytics: () =>
    api
      .get<PlatformAiAnalytics>('/inspections/ai-settings')
      .then((response) => response.data),

  updateAiSettings: (input: UpdatePlatformAiSettingsInput) =>
    api
      .put<PlatformAiAnalytics>('/inspections/ai-settings', input)
      .then((response) => response.data),

  // MF3-07 to MF3-11 report workflow.
  generateDraft: (inspectionId: string, summary?: string | null) =>
    api
      .post<InspectionReport>(
        `/inspections/${inspectionId}/report/draft`,
        summary ? { summary } : undefined,
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
    reason?: string,
  ) =>
    api
      .post<ReportReviewResult>(
        `/inspections/${inspectionId}/report/versions/${versionId}/review`,
        null,
        { params: { reason } },
      )
      .then((response) => response.data),

  publishVersion: (inspectionId: string, versionId: string) =>
    api
      .post<ReportReviewResult>(
        `/inspections/${inspectionId}/report/versions/${versionId}/publish`,
      )
      .then((response) => response.data),

  listVersions: (inspectionId: string) =>
    api
      .get<InspectionReport[]>(
        `/inspections/${inspectionId}/report/versions`,
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

  getAiSummary: (inspectionId: string, versionId: string) =>
    api
      .get<ReportAiSummary>(
        `/inspections/${inspectionId}/report/versions/${versionId}/ai-summary`,
      )
      .then((response) => response.data),

  /** Historical cases and guidelines matched to one finding (DroneKnowledgeAI). */
  getFindingRecommendations: (inspectionId: string, findingId: string, limit = 3) =>
    api
      .get<KnowledgeRecommendationResponse>(
        `/inspections/${inspectionId}/findings/${findingId}/recommendations`,
        { params: { limit } },
      )
      .then((response) => response.data),

  /**
   * Asks the Backend AI to inspect one finding's photo plus DroneKnowledgeAI cases/standards and
   * write a technical note. The caller fills the Inspector's Note edit box with `note`.
   */
  draftFindingNote: (
    inspectionId: string,
    findingId: string,
    payload?: { locale?: string; existingNote?: string },
  ) =>
    api
      .post<DraftFindingNoteResult>(
        `/inspections/${inspectionId}/findings/${findingId}/draft-note`,
        payload ?? {},
      )
      .then((response) => response.data),

  /** Historical cases and guidelines matched to the whole inspection report. */
  getInspectionKnowledgeRecommendations: (inspectionId: string, limit = 4) =>
    api
      .get<KnowledgeRecommendationResponse>(
        `/inspections/${inspectionId}/knowledge-recommendations`,
        { params: { limit } },
      )
      .then((response) => response.data),

  /** Customer accepts the published report version to start payment window. */
  acceptReport: (inspectionId: string, versionId: string) =>
    api
      .post<void>(
        `/inspections/${inspectionId}/report/versions/${versionId}/accept`,
      )
      .then((response) => response.data),

  /** Customer requests clarification/revision on a published report before commercial acceptance. */
  requestReportClarification: (
    inspectionId: string,
    versionId: string,
    reason: string,
  ) =>
    api
      .post<ReportReviewResult>(
        `/inspections/${inspectionId}/report/versions/${versionId}/clarification`,
        null,
        { params: { reason } },
      )
      .then((response) => response.data),

  /** Generates a Sepay VietQR online payment link for an accepted inspection. */
  createSepayPaymentLink: (inspectionId: string) =>
    api
      .post<SepayCheckoutDetails>(
        `/inspections/${inspectionId}/sepay/create-payment-link`,
      )
      .then((response) => response.data),

  /** Generates a signed VNPay online checkout URL for an accepted inspection. */
  createVnPayPaymentUrl: (inspectionId: string) =>
    api
      .post<VnPayCheckoutDetails>(
        `/inspections/${inspectionId}/vnpay/create-payment-url`,
      )
      .then((response) => response.data),

  downloadPaymentDocument: (inspectionId: string) =>
    api
      .get<Blob>(`/inspections/${inspectionId}/report/payment-document`, { responseType: 'blob' })
      .then((response) => response.data),

  getReportPaymentStatus: (inspectionId: string) =>
    api
      .get<ReportPaymentStatusDetails>(
        `/inspections/${inspectionId}/report/payment-status`,
      )
      .then((response) => response.data),

  /** Clears a resolvable unpaid gateway order on the accepted inspection so another method can be used. */
  cancelUnpaidPaymentOrder: (inspectionId: string) =>
    api
      .post<void>(`/inspections/${inspectionId}/report/cancel-unpaid-order`)
      .then((response) => response.data),

  /** Customer or Manager creates a quick RE_INSPECTION directly from a completed inspection. */
  createDirectReinspection: (
    inspectionId: string,
    payload: CreateReinspectionPayload = {},
  ) =>
    api
      .post<InspectionDetail>(`/inspections/${inspectionId}/reinspections`, payload)
      .then((response) => response.data),

  getReinspectionVerifications: (inspectionId: string) =>
    api
      .get<ReinspectionVerificationItem[]>(
        `/inspections/${inspectionId}/reinspection-verifications`,
      )
      .then((response) => response.data),

  updateReinspectionVerification: (
    inspectionId: string,
    verificationId: string,
    payload: UpdateDefectVerificationPayload,
  ) =>
    api
      .put<ReinspectionVerificationItem>(
        `/inspections/${inspectionId}/reinspection-verifications/${verificationId}`,
        payload,
      )
      .then((response) => response.data),
};