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
  inspectionItems: string[];
  structureHeightMeters: number | null;
  footprintAreaSquareMeters: number | null;
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
  inspectionItems?: string[];
  structureHeightMeters?: number | null;
  footprintAreaSquareMeters?: number | null;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string | null;
  locationText?: string;
  latitude?: number | null;
  longitude?: number | null;
  structureHeightMeters?: number | null;
  footprintAreaSquareMeters?: number | null;
  clearCoordinates?: boolean;
  clearStructureHeight?: boolean;
  clearFootprintArea?: boolean;
  clearDescription?: boolean;
}

export interface AssetPage {
  items: Asset[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetListFilters) => [...assetKeys.lists(), filters] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
};

export const assetApi = {
  list: (filters: AssetListFilters) =>
    api.get<AssetPage>('/assets', { params: filters }).then((r) => r.data),

  getById: (id: string) => api.get<Asset>(`/assets/${id}`).then((r) => r.data),

  create: (input: CreateAssetInput) => api.post<Asset>('/assets', input).then((r) => r.data),

  updateInspectionItems: (id: string, inspectionItems: string[]) =>
    api.put<Asset>(`/assets/${id}/inspection-items`, { inspectionItems }).then((r) => r.data),

  update: (id: string, input: UpdateAssetInput) =>
    api.patch<Asset>(`/assets/${id}`, input).then((r) => r.data),

  retire: (id: string) => api.post<Asset>(`/assets/${id}/retire`).then((r) => r.data),
};
