import { api } from '@/shared/api/client';

export type RatingRaterRole = 'CUSTOMER' | 'MANAGER';

export interface RatingCriterionConfig {
  id: string;
  raterRole: RatingRaterRole;
  code: string;
  labelEn: string;
  labelVi: string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRatingCriterionInput {
  raterRole: RatingRaterRole;
  code: string;
  labelEn: string;
  labelVi: string;
  descriptionEn?: string | null;
  descriptionVi?: string | null;
  displayOrder?: number;
  active?: boolean;
}

export interface UpdateRatingCriterionInput {
  labelEn: string;
  labelVi: string;
  descriptionEn?: string | null;
  descriptionVi?: string | null;
  displayOrder?: number;
  active?: boolean;
}

export const ratingCriteriaKeys = {
  all: ['rating-criteria'] as const,
  public: (includeInactive = false) =>
    [...ratingCriteriaKeys.all, 'public', includeInactive] as const,
  admin: (role?: RatingRaterRole | 'ALL') =>
    [...ratingCriteriaKeys.all, 'admin', role ?? 'ALL'] as const,
};

export const ratingCriteriaApi = {
  listPublic: (includeInactive = false) =>
    api
      .get<RatingCriterionConfig[]>('/ratings/criteria', {
        params: includeInactive ? { includeInactive: true } : undefined,
      })
      .then((res) => res.data),

  listAdmin: (raterRole?: RatingRaterRole) =>
    api
      .get<RatingCriterionConfig[]>('/admin/rating-criteria', {
        params: raterRole ? { raterRole } : undefined,
      })
      .then((res) => res.data),

  create: (input: CreateRatingCriterionInput) =>
    api
      .post<RatingCriterionConfig>('/admin/rating-criteria', input)
      .then((res) => res.data),

  update: (id: string, input: UpdateRatingCriterionInput) =>
    api
      .put<RatingCriterionConfig>(`/admin/rating-criteria/${id}`, input)
      .then((res) => res.data),

  toggleActive: (id: string) =>
    api
      .patch<RatingCriterionConfig>(`/admin/rating-criteria/${id}/toggle-active`)
      .then((res) => res.data),

  remove: (id: string) =>
    api.delete(`/admin/rating-criteria/${id}`).then(() => undefined),
};
