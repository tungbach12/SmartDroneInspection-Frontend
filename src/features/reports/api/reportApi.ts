import { api } from '@/shared/api/client';

export type ReportStatus =
  | 'DRAFT'
  | 'AWAITING_PEER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'TECHNICALLY_APPROVED'
  | 'RELEASED'
  | 'REVISION_REQUESTED'
  | 'ACCEPTED';

export interface ReportSnapshot {
  inspectionId: string;
  serviceOrderId: string;
  assetId: string;
  checklistTemplateId: string;
  checklistName: string;
  generatedAt: string;
  checklist: Array<{
    itemId: string;
    itemCode: string;
    prompt: string;
    required: boolean;
    responseValue: string | null;
    notes: string | null;
    completedAt: string | null;
  }>;
  evidence: Array<{
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    checksumSha256: string;
    source: string;
    captureTime: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  findings: Array<{
    id: string;
    findingCode: string;
    evidenceId: string | null;
    source: 'AI_CONFIRMED' | 'AI_MODIFIED' | 'MANUAL';
    defectLabel: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    locationDescription: string;
    technicalNotes: string;
    recommendedAction: string | null;
    boundingBox: string | null;
  }>;
}

export interface ReportVersion {
  reportId: string;
  versionId: string;
  versionNumber: number;
  inspectionId: string;
  authorUserId: string;
  sourceVersionId: string | null;
  reportStatus: ReportStatus;
  versionStatus: ReportStatus;
  contentSnapshot: ReportSnapshot;
  review: {
    reviewerUserId: string;
    decision: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED';
    comments: string | null;
    reviewedAt: string | null;
  } | null;
  createdAt: string;
  releasedAt: string | null;
  acceptedAt: string | null;
  clientDecisionByUserId: string | null;
  clientDecisionReason: string | null;
}

export const reportApi = {
  list: () => api.get<ReportVersion[]>('/reports').then((response) => response.data),

  get: (reportId: string) =>
    api.get<ReportVersion>(`/reports/${reportId}`).then((response) => response.data),

  createDraft: (inspectionId: string) =>
    api
      .post<ReportVersion>(`/inspections/${inspectionId}/report`)
      .then((response) => response.data),

  createRevision: (reportId: string) =>
    api
      .post<ReportVersion>(`/reports/${reportId}/versions`)
      .then((response) => response.data),

  assignReviewer: (reportId: string, versionId: string, reviewerId: string) =>
    api
      .put<ReportVersion>(
        `/reports/${reportId}/versions/${versionId}/reviewer`,
        { reviewerId },
      )
      .then((response) => response.data),

  submitForReview: (reportId: string, versionId: string) =>
    api
      .post<ReportVersion>(
        `/reports/${reportId}/versions/${versionId}/submit-review`,
      )
      .then((response) => response.data),

  review: (
    reportId: string,
    versionId: string,
    decision: 'APPROVED' | 'CHANGES_REQUESTED',
    comments?: string,
  ) =>
    api
      .post<ReportVersion>(`/reports/${reportId}/versions/${versionId}/review`, {
        decision,
        comments,
      })
      .then((response) => response.data),

  release: (reportId: string, versionId: string) =>
    api
      .post<ReportVersion>(`/reports/${reportId}/versions/${versionId}/release`)
      .then((response) => response.data),

  decide: (
    reportId: string,
    versionId: string,
    decision: 'ACCEPT' | 'REQUEST_REVISION',
    reason?: string,
  ) =>
    api
      .post<ReportVersion>(
        `/reports/${reportId}/versions/${versionId}/client-decision`,
        { decision, reason },
      )
      .then((response) => response.data),

  evidenceContent: (
    reportId: string,
    versionId: string,
    evidenceId: string,
  ) =>
    api
      .get<Blob>(
        `/reports/${reportId}/versions/${versionId}/evidence/${evidenceId}/content`,
        { responseType: 'blob' },
      )
      .then((response) => response.data),
};
