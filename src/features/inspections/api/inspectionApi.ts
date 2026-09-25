import { api } from '@/shared/api/client';

export interface InspectionAssignment {
  assignmentId: string;
  serviceOrderId: string;
  assetId: string;
  deadline: string | null;
  status: string;
  inspectionId: string | null;
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

export interface EvidenceItem {
  evidenceId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  source: string;
  captureTime: string | null;
  latitude: number | null;
  longitude: number | null;
  externalReference: string | null;
  uploadStatus: string;
  createdAt: string;
}

export type CandidateStatus = 'PENDING' | 'CONFIRMED' | 'MODIFIED' | 'REJECTED';

export interface FindingCandidate {
  id: string;
  evidenceId: string;
  modelName: string;
  modelVersion: string;
  predictedLabel: string;
  confidence: number;
  boundingBox: string;
  status: CandidateStatus;
  createdAt: string;
}

export interface ReviewCandidateInput {
  decision: 'CONFIRM' | 'MODIFY' | 'REJECT';
  defectLabel?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locationDescription?: string;
  technicalNotes?: string;
  recommendedAction?: string;
  rejectionReason?: string;
}

export interface ManualFindingInput {
  evidenceId: string;
  defectLabel: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locationDescription: string;
  technicalNotes: string;
  recommendedAction?: string;
}

export const inspectionApi = {
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
    api.put(
      `/inspections/${inspectionId}/checklist-responses/${itemId}`,
      { responseValue },
    ),

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

  listCandidates: (inspectionId: string) =>
    api
      .get<FindingCandidate[]>(
        `/inspections/${inspectionId}/finding-candidates`,
      )
      .then((response) => response.data),

  analyzeEvidence: (inspectionId: string, evidenceId: string) =>
    api
      .post<FindingCandidate[]>(
        `/inspections/${inspectionId}/evidence/${evidenceId}/analyze`,
      )
      .then((response) => response.data),

  reviewCandidate: (
    inspectionId: string,
    candidateId: string,
    input: ReviewCandidateInput,
  ) =>
    api
      .post<FindingCandidate>(
        `/inspections/${inspectionId}/finding-candidates/${candidateId}/review`,
        input,
      )
      .then((response) => response.data),

  createManualFinding: (inspectionId: string, input: ManualFindingInput) =>
    api
      .post(`/inspections/${inspectionId}/findings`, input)
      .then((response) => response.data),
};
