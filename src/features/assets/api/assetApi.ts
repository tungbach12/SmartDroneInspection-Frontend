import { api } from '@/shared/api/client';

export interface Asset {
  id: string;
  code: string;
  name: string;
  description: string | null;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'RETIRED';
  categoryId: string;
  createdAt: string;
}

export interface AssetListFilters {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
}

export interface CreateAssetInput {
  name: string;
  code: string;
  description?: string | null;
  categoryId: string;
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;
  ownershipInformation?: string | null;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string | null;
  locationText?: string;
  latitude?: number | null;
  longitude?: number | null;
  ownershipInformation?: string | null;
}

export interface AssetPage {
  items: Asset[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AssetReviewResponse {
  assetId: string;
  status: string;
  proposalCount: number;
}

export interface AssetReviewInput {
  action: 'APPROVE' | 'REJECT';
  note?: string;
}

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetListFilters) => [...assetKeys.lists(), filters] as const,
  pendingReview: () => [...assetKeys.all, 'pending-review'] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
};

export const assetApi = {
  list: (filters: AssetListFilters) =>
    api.get<AssetPage>('/assets', { params: filters }).then((r) => r.data),

  listPendingReview: (filters: AssetListFilters) =>
    api.get<AssetPage>('/assets/pending-review', { params: filters }).then((r) => r.data),

  getById: (id: string) => api.get<Asset>(`/assets/${id}`).then((r) => r.data),

  create: (input: CreateAssetInput) => api.post<Asset>('/assets', input).then((r) => r.data),

  update: (id: string, input: UpdateAssetInput) =>
    api.put<Asset>(`/assets/${id}`, input).then((r) => r.data),

  review: (id: string, input: AssetReviewInput) =>
    api.post<AssetReviewResponse>(`/assets/${id}/review`, input).then((r) => r.data),
};
