import { api } from '@/shared/api/client';

export interface Asset {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  region: string | null;
  status: string;
  categoryId: string | null;
  createdAt: string;
}

export interface AssetListFilters {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  sortBy?: string | undefined;
  sortDescending?: boolean;
}

export interface CreateAssetInput {
  name: string;
  code: string;
  description?: string | null;
  categoryId?: string | null;
  organizationId: string;
  address?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetListFilters) => [...assetKeys.lists(), filters] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
};

export const assetApi = {
  list: (filters: AssetListFilters) =>
    api
      .get<PagedResult<Asset>>('/assets', { params: filters })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<Asset>(`/assets/${id}`).then((r) => r.data),

  create: (input: CreateAssetInput) =>
    api.post<string>('/assets', input).then((r) => r.data),
};

interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
