import { api } from '@/shared/api/client';

export interface InspectorRatingItem {
  id: string;
  inspectionId: string;
  inspectorId: string;
  raterUserId: string;
  raterName: string | null;
  raterAvatarUrl: string | null;
  raterRole: 'CUSTOMER' | 'MANAGER';
  assetName: string | null;
  overallScore: number;
  criterionScores: Record<string, number>;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  editableUntil: string;
  editable: boolean;
}

export interface InspectorRatingSummary {
  inspectorId: string;
  averageRating: number | null;
  ratingCount: number;
  customerAverageRating: number | null;
  customerRatingCount: number;
  managerAverageRating: number | null;
  managerRatingCount: number;
  starDistribution: Record<string, number>;
  customerCriteriaAverages: Record<string, number>;
  managerCriteriaAverages: Record<string, number>;
}

export interface InspectionRatingBundle {
  inspectionId: string;
  inspectorId: string | null;
  inspectorName: string | null;
  canRate: boolean;
  ineligibleReason: string | null;
  actorRole: 'CUSTOMER' | 'MANAGER' | 'ADMIN' | 'INSPECTOR';
  expectedCriteriaKeys: string[];
  editableUntil: string | null;
  myRating: InspectorRatingItem | null;
  customerRating: InspectorRatingItem | null;
  managerRating: InspectorRatingItem | null;
  inspectorAverageRating: number | null;
  inspectorRatingCount: number;
}

export interface InspectorRatingProfile {
  summary: InspectorRatingSummary;
  ratings: InspectorRatingItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  historyVisible: boolean;
}

export interface UpsertInspectorRatingPayload {
  overallScore: number;
  criterionScores: Record<string, number>;
  comment?: string | null;
}

export const ratingApi = {
  getInspectionRatings: (inspectionId: string) =>
    api
      .get<InspectionRatingBundle>(`/inspections/${inspectionId}/inspector-rating`)
      .then((res) => res.data),

  upsertInspectionRating: (inspectionId: string, payload: UpsertInspectorRatingPayload) =>
    api
      .put<InspectionRatingBundle>(`/inspections/${inspectionId}/inspector-rating`, payload)
      .then((res) => res.data),

  getInspectorRatings: (inspectorId: string, page = 0, size = 10) =>
    api
      .get<InspectorRatingProfile>(`/inspectors/${inspectorId}/ratings`, {
        params: { page, size },
      })
      .then((res) => res.data),

  getMyRatings: (page = 0, size = 10) =>
    api
      .get<InspectorRatingProfile>('/inspectors/me/ratings', {
        params: { page, size },
      })
      .then((res) => res.data),
};
